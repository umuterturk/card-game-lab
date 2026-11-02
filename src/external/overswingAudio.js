// Original, procedural 8-bit dark-metal score and arcade SFX.
// No third-party music, recordings or samples. Browser Web Audio only.
// Audio starts solely after a player's gesture and is cleaned up on unmount.
import {multiplierFeedbackForAction,potCrackForAction} from './overswingFeedback.js';
import {musicLayerMix} from './overswingTension.js';
import {grooveForTension,nextGroove,grooveEvents,MUSIC_GROOVES,
  tempoForGroove,approachTempo} from './overswingGrooves.js';

export const AUDIO_CUES=Object.freeze(['flip','steer','zero','snap','bank']);
export const BONUS_AUDIO_CUES=Object.freeze(['jackpot','swing','flipTier','potCrack']);
export function bonusAudioCuesForAction(action){
  if(potCrackForAction(action))return ['potCrack'];
  const feedback=multiplierFeedbackForAction(action);
  if(!feedback)return [];
  return [feedback.kind==='flip'?'flipTier':feedback.kind];
}
// Ground impacts follow a real Pot loss, never an ordinary SNAP or shield save.
// Bigger lost payouts produce a slightly longer cascade, safely capped for mobile.
export function lostCoinClinkCount(action){
  if(!potCrackForAction(action))return 0;
  const amount=Math.max(0,Number(action.lostPayout)||0);
  return Math.min(12,4+Math.round(2*Math.log10(1+amount)));
}
export function audioCueForAction(action){
  if(!action)return null;
  if(action.type==='bank')return Number(action.points)>0?'bank':null;
  if(action.type!=='flip'&&action.type!=='steer')return null;
  if(action.snap)return 'snap';
  if(action.zeroBreak)return 'zero';
  return action.type;
}
const PITCH=Object.freeze({E:82.41,F:87.31,G:98,A:110,B:123.47,C:130.81,D:146.83});
// The maximum tension tempo; actual scheduling uses the selected groove BPM.
export const MUSIC_TEMPO=132;
// Normal is a little louder than the old 0.70 setting. LOUD is +~2.2 dB.
// Applied to musicBus only, leaving SFX at their previous level.
export const MUSIC_VOLUMES=Object.freeze([0,.80,1.03]);
export function nextMusicLevel(level){
  if(!Number.isInteger(level)||level<0||level>2)throw new RangeError('Invalid music level');
  return (level+1)%3;
}
export const MUSIC_RIFF=Object.freeze([
  Object.freeze(['E',null,'E','G','E',null,'F','E','B',null,'G','F','E',null,'D','B']),
  Object.freeze(['E',null,'E','A','G','E','F',null,'D','E','G','F','E','B',null,'E']),
  Object.freeze(['C',null,'C','G','E',null,'D','E','C',null,'B','G','A',null,'G','E']),
  Object.freeze(['B',null,'B','D','E','G','F','E','B',null,'A','G','F','D','E',null])
]);
export function scoreNoteAt(step){
  if(!Number.isInteger(step)||step<0)throw new RangeError('Invalid score step');
  const bar=Math.floor(step/16)%MUSIC_RIFF.length;
  const note=MUSIC_RIFF[bar][step%16];
  return note?PITCH[note]:null;
}

export function createOverswingAudio(host=typeof window!=='undefined'?window:null){
  let context=null,master=null,musicBus=null,sfxBus=null,timer=null;
  let nextStep=0,nextAt=0,musicOn=false,sfxOn=true,noise=null;
  let targetTension=.12,smoothedTension=.12,activeGroove=0;
  let currentTempo=60,musicLevel=0;
  const canPlay=()=>!!(host&&(host.AudioContext||host.webkitAudioContext));
  const ctx=()=>{
    if(context||!canPlay())return context;
    const AudioContext=host.AudioContext||host.webkitAudioContext;
    context=new AudioContext();
    master=context.createGain();master.gain.value=.32;
    musicBus=context.createGain();musicBus.gain.value=0;
    sfxBus=context.createGain();sfxBus.gain.value=.85;
    const limiter=context.createDynamicsCompressor();
    limiter.threshold.value=-16;limiter.knee.value=12;limiter.ratio.value=4;
    limiter.attack.value=.004;limiter.release.value=.12;
    musicBus.connect(master);sfxBus.connect(master);master.connect(limiter);
    limiter.connect(context.destination);
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.5),context.sampleRate);
    const data=buffer.getChannelData(0);
    // Deterministic white noise, shared by every snare/hi-hat/SNAP burst.
    let seed=0x18F1C4;
    for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}
    noise=buffer;
    return context;
  };
  function unlock(){
    const audio=ctx();
    if(audio?.state==='suspended')audio.resume().catch(()=>{});
    return !!audio;
  }
  function tone(frequency,time,duration,volume,type='square',bus=sfxBus,slide=null){
    if(!context||!bus)return;
    const osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(Math.max(20,frequency),time);
    if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(20,slide),time+duration);
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),time+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(bus);
    osc.start(time);osc.stop(time+duration+.014);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function blast(time,duration,volume,bus=sfxBus,cutoff=1500){
    if(!context||!noise||!bus)return;
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    source.buffer=noise;filter.type='lowpass';filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(Math.max(.001,volume),time);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    source.connect(filter);filter.connect(gain);gain.connect(bus);
    source.start(time);source.stop(time+duration+.001);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  // The original riff NEVER changes pitch sequence, tempo or timeline.
  // Only the supporting arrangement changes: half-time -> driving rock ->
  // pursuit -> double-time. Groove shifts happen on bar downbeats and move
  // at most one tier per bar, even if danger spikes instantly.
  function scheduleStep(step,time){
    smoothedTension+=.09*(targetTension-smoothedTension);
    const local=step%16,bar=Math.floor(step/16);
    if(local===0)activeGroove=nextGroove(activeGroove,targetTension);
    const groove=grooveEvents(activeGroove,step,bar);
    const layers=musicLayerMix(smoothedTension);
    const note=scoreNoteAt(step);
    currentTempo=approachTempo(currentTempo,tempoForGroove(activeGroove));
    const beat=60/currentTempo;
    const sixteenth=beat/4;
    const root=PITCH[['E','E','C','B'][bar%4]];

    // Always-on theme, same original 64-note grid and melody volume.
    if(note){
      tone(note,time,(beat/2)*.86,.085,'sawtooth',musicBus,note*.995);
    }
    // New rhythms, not extra volume: pulse changes bass note timing and
    // shortened chugs appear only in riskier passages.
    if(groove.bass){
      const duration=activeGroove<2?beat*.72:beat*.30;
      tone(root,time,duration,.060*layers.bass,'square',musicBus,root*.99);
      tone(root*.5,time,duration*.83,.023*layers.bass,'sine',musicBus);
    }
    if(groove.chug)
      tone(root*2,time,sixteenth*.84,.039*layers.menace,
        'sawtooth',musicBus,root*1.91);
    if(groove.chord){
      // E minor, C minor-ish and B diminished shades: dark, recognizable
      // accompaniment beneath the same riff. Minor third and fifth remain
      // anchored to the bar's root, so changing grooves doesn't change key.
      const hold=activeGroove===0?beat*2.5:beat*1.5;
      tone(root*1.189,time,hold,.017,'triangle',musicBus);
      tone(root*1.498,time,hold,.011,'triangle',musicBus);
    }
    if(groove.echo&&note){
      // Short same-note answer after the theme, not a new melody.
      tone(note,time+sixteenth*.52,sixteenth*.43,.025*layers.menace,
        'square',musicBus);
    }

    // Kick, snare and hat patterns are the musical source of tension.
    // Frequencies have an upper attack so phone speakers reproduce the beat.
    if(groove.kick){
      tone(120,time,.16,.14*layers.percussion,'sine',musicBus,44);
      blast(time,.028,.034*layers.percussion,musicBus,2300);
    }
    if(groove.snare){
      blast(time,.115,groove.fill?.105:.095,musicBus,1900);
      tone(178,time,.084,.026,'triangle',musicBus,91);
    }
    if(groove.ghost)
      blast(time,.062,.043,musicBus,1650);
    if(groove.hat)
      blast(time,.035,.026*layers.percussion,musicBus,5800);
    if(groove.openHat)
      blast(time,.11,.032,musicBus,7200);

    // Small original motif at the end of the four-bar loop, retained
    // for a seamless repeat in all four arrangements.
    if(local===14&&bar%4===3)
      tone(PITCH.E*4,time,sixteenth*.95,.031,'triangle',musicBus,PITCH.D*4);
  }
  function schedule(){
    if(!context||!musicOn||context.state!=='running')return;
    const now=context.currentTime;
    if(nextAt<now-.6)nextAt=now+.04;
    let max=0;
    while(nextAt<now+.22&&max++<7){
      scheduleStep(nextStep++,nextAt);
      nextAt+=60/currentTempo/4;
    }
  }
  function stopMusic(){
    musicOn=false;musicLevel=0;
    if(timer!==null){host?.clearInterval(timer);timer=null;}
    if(musicBus&&context){
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0,context.currentTime,.025);
    }
  }
  function setMusicLevel(level){
    if(!Number.isInteger(level)||level<0||level>2)
      throw new RangeError('Music volume must be OFF, ON or LOUD');
    if(level===0){stopMusic();return 0;}
    if(!unlock())return 0;
    musicOn=true;musicLevel=level;
    musicBus.gain.cancelScheduledValues(context.currentTime);
    // Smooth gain only; switching ON -> LOUD does not restart the riff.
    musicBus.gain.setTargetAtTime(MUSIC_VOLUMES[level],context.currentTime,.08);
    if(timer===null){
      nextStep=0;nextAt=context.currentTime+.05;
      activeGroove=grooveForTension(targetTension);
      smoothedTension=targetTension;
      currentTempo=tempoForGroove(activeGroove);
      schedule();
      timer=host.setInterval(schedule,80);
    }
    return musicLevel;
  }
  // Keep existing callers/tests working: setMusic(true) is normal volume.
  function setMusic(enabled){return setMusicLevel(enabled?1:0)>0;}
  function setSfx(enabled){sfxOn=!!enabled;}
  function setTension(value){
    targetTension=Math.max(0,Math.min(1,Number.isFinite(value)?value:.12));
    return targetTension;
  }
  function play(action){
    const cue=audioCueForAction(action);
    if(!sfxOn||!cue||!context||context.state==='closed')return;
    // Gesture normally unlocks audio before the game state update.
    const time=context.currentTime+.006;
    switch(cue){
      case 'flip':
        tone(280,time,.13,.17,'square',sfxBus,540);
        tone(660,time+.085,.08,.045,'triangle');
        break;
      case 'steer':
        tone(470,time,.16,.15,'triangle',sfxBus,185);
        tone(220,time+.03,.085,.048,'square');
        break;
      case 'zero':
        // ZERO BREAK is a setback: falling dissonance and a collapsing ember,
        // deliberately not the ascending JACKPOT or winning fanfare.
        tone(493,time,.18,.11,'sawtooth',sfxBus,247);
        tone(311,time+.07,.24,.10,'square',sfxBus,116);
        blast(time+.11,.23,.095,sfxBus,810);
        tone(73,time+.2,.25,.075,'triangle',sfxBus,40);
        break;
      case 'snap':
        blast(time,.32,.27,sfxBus,1250);
        tone(240,time,.39,.18,'sawtooth',sfxBus,42);
        tone(112,time+.045,.31,.16,'square',sfxBus,31);
        break;
      case 'bank':{
        const amount=action.points||0;
        const hits=amount>=10000?7:amount>=1000?5:amount>=100?4:2;
        for(let i=0;i<hits;i++){
          const at=time+i*.059,base=[587,740,880,988,1175][i%5];
          tone(base,at,.16,.10,'sine',sfxBus,base*1.15);
          tone(base/2,at,.10,.038,'triangle');
        }
        break;
      }
    }
    // These accents layer ON TOP of the normal FLIP / STEER / SNAP cue,
    // instead of replacing it. Protected SNAPs never get the devilish crack.
    for(const bonus of bonusAudioCuesForAction(action)){
      switch(bonus){
        case 'flipTier':
          tone(659,time+.095,.115,.041,'triangle',sfxBus,830);
          tone(987,time+.145,.09,.026,'sine');
          break;
        case 'swing':
          tone(460,time+.08,.17,.078,'triangle',sfxBus,650);
          tone(690,time+.13,.15,.055,'sine');
          break;
        case 'jackpot':{
          // A bright ascending arcade-metal fanfare, with stereo-safe sparks.
          const scale=[392,494,587,784,988,1175];
          scale.forEach((pitch,i)=>{
            const at=time+.055+i*.075;
            tone(pitch,at,.22,.073,'square',sfxBus,pitch*1.025);
            tone(pitch*2,at+.017,.15,.035,'triangle');
          });
          blast(time+.10,.12,.035,sfxBus,3900);
          tone(1568,time+.51,.38,.09,'triangle');
          tone(784,time+.51,.33,.045,'sawtooth');
          break;
        }
        case 'potCrack':
          // Dissonant descending tritone, low infernal growl and stone-glass
          // fracture. Additional to the existing SNAP impact sound.
          blast(time+.025,.18,.26,sfxBus,4700);
          tone(175,time+.03,.48,.14,'sawtooth',sfxBus,49);
          tone(124,time+.045,.55,.15,'square',sfxBus,32);
          tone(185,time+.12,.31,.09,'sawtooth',sfxBus,61);
          blast(time+.21,.36,.20,sfxBus,700);
          tone(58,time+.26,.45,.11,'triangle',sfxBus,30);
          // Coins tumble out of the shattered Pot: first a hard metal hit,
          // then several lighter, higher bounces scattering on stone.
          // This overlays SNAP + the existing demonic growl; no sound on shield.
          for(let i=0,n=lostCoinClinkCount(action);i<n;i++){
            const at=time+.16+i*(.045+(i%3)*.013);
            const pitch=1150+(i*307)%940;
            const weight=Math.max(.026,.095-i*.006);
            tone(pitch,at,.095-i*.003,weight,'triangle',sfxBus,pitch*.74);
            tone(pitch*.51,at+.012,.048,weight*.28,'square');
            blast(at,.028,.032-i*.0015,sfxBus,2700);
          }
          break;
      }
    }
  }
  function suspend(){
    if(timer!==null){host?.clearInterval(timer);timer=null;}
    if(context&&context.state==='running')context.suspend().catch(()=>{});
  }
  function resume(){
    if(!context)return;
    if(context.state==='suspended')context.resume().then(()=>{
      if(musicOn&&timer===null){
        nextAt=context.currentTime+.05;timer=host.setInterval(schedule,80);
      }
    }).catch(()=>{});
  }
  function dispose(){
    stopMusic();
    if(context&&context.state!=='closed')context.close().catch(()=>{});
    context=null;master=null;musicBus=null;sfxBus=null;noise=null;
  }
  return {unlock,play,setMusic,setMusicLevel,setSfx,setTension,suspend,resume,dispose,
    get tension(){return targetTension;},
    get musicLevel(){return musicLevel;},
    get currentTempo(){return currentTempo;},
    get grooveLevel(){return activeGroove;},
    get grooveName(){return MUSIC_GROOVES[activeGroove].name;},
    get musicOn(){return musicOn;},get sfxOn(){return sfxOn;}};
}
