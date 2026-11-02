// Original, procedural 8-bit dark-metal score and arcade SFX.
// No third-party music, recordings or samples. Browser Web Audio only.
// Audio starts solely after a player's gesture and is cleaned up on unmount.
import {multiplierFeedbackForAction,potCrackForAction} from './overswingFeedback.js';

export const AUDIO_CUES=Object.freeze(['flip','steer','zero','snap','bank']);
export const BONUS_AUDIO_CUES=Object.freeze(['jackpot','swing','flipTier','potCrack']);
export function bonusAudioCuesForAction(action){
  if(potCrackForAction(action))return ['potCrack'];
  const feedback=multiplierFeedbackForAction(action);
  if(!feedback)return [];
  return [feedback.kind==='flip'?'flipTier':feedback.kind];
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
export const MUSIC_TEMPO=132;
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
  // Original descending battle riff with a pulse, a low distorted-sounding
  // square bass, an organ-like harmony, and synthesized drums.
  function scheduleStep(step,time){
    const note=scoreNoteAt(step),local=step%16,bar=Math.floor(step/16);
    const eighth=60/MUSIC_TEMPO/2;
    if(note){
      tone(note,time,eighth*.86,.085,'sawtooth',musicBus,note*.995);
      tone(note*.5,time,eighth*.72,.065,'square',musicBus);
      if(local===0||local===8)
        tone(note*2,time,eighth*3,.022,'triangle',musicBus);
    }
    if(local%4===0){
      tone(110,time,.145,.21,'sine',musicBus,45);
      blast(time,.07,.048,musicBus,170);
    }
    if(local===4||local===12){
      blast(time,.12,.085,musicBus,1850);
      tone(180,time,.07,.025,'triangle',musicBus,90);
    }
    if(local%2===0)blast(time,.034,.024,musicBus,6500);
    if(local===14&&bar%4===3){
      tone(PITCH.E*4,time,eighth*.6,.031,'triangle',musicBus,PITCH.D*4);
    }
  }
  function schedule(){
    if(!context||!musicOn||context.state!=='running')return;
    const now=context.currentTime;
    if(nextAt<now-.6)nextAt=now+.04;
    let max=0;
    while(nextAt<now+.22&&max++<7){
      scheduleStep(nextStep++,nextAt);
      nextAt+=60/MUSIC_TEMPO/4;
    }
  }
  function stopMusic(){
    musicOn=false;
    if(timer!==null){host?.clearInterval(timer);timer=null;}
    if(musicBus&&context){
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0,context.currentTime,.025);
    }
  }
  function setMusic(enabled){
    if(!enabled){stopMusic();return false;}
    if(!unlock())return false;
    musicOn=true;
    musicBus.gain.cancelScheduledValues(context.currentTime);
    musicBus.gain.setTargetAtTime(.70,context.currentTime,.04);
    if(timer===null){
      nextStep=0;nextAt=context.currentTime+.05;
      schedule();
      timer=host.setInterval(schedule,80);
    }
    return true;
  }
  function setSfx(enabled){sfxOn=!!enabled;}
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
  return {unlock,play,setMusic,setSfx,suspend,resume,dispose,
    get musicOn(){return musicOn;},get sfxOn(){return sfxOn;}};
}
