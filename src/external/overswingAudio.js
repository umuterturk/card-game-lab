// Original, procedural 8-bit dark-metal score and arcade SFX.
// No third-party music, recordings or samples. Browser Web Audio only.
// Audio starts solely after a player's gesture and is cleaned up on unmount.
import {multiplierFeedbackForAction,potCrackForAction} from './overswingFeedback.js';
import {musicLayerMix} from './overswingTension.js';
import {grooveForTension,nextGroove,grooveEvents,MUSIC_GROOVES,
  tempoForGroove,approachTempo,synthwaveBassPitch} from './overswingGrooves.js';
import {MUSIC_RIFF,MUSIC_TRACKS,trackNoteAt} from './overswingTracks.js';
import {THRILLER_TRACKS,THRILLER_START,GAMEPLAY_TRACKS,
  thrillerNoteAt,thrillerTempoForGroove} from './overswingThriller.js';
export {MUSIC_RIFF,MUSIC_TRACKS} from './overswingTracks.js';

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
// OFF / ON / LOUD. LOUD has 4x the music-bus gain of ON (+12 dB
// before the shared dynamics limiter). The limiter keeps peaks controlled,
// while leaving normal music and the independent SFX level unchanged.
export const MUSIC_VOLUMES=Object.freeze([0,.80,3.20]);
export function nextMusicLevel(level){
  if(!Number.isInteger(level)||level<0||level>2)throw new RangeError('Invalid music level');
  return (level+1)%3;
}
// User-facing 0–100 sliders. A quadratic music curve keeps quiet levels useful,
// while 100 retains the previous LOUD setting and dynamics protection.
export function clampAudioVolume(value){
  if(!Number.isFinite(value))throw new RangeError('Invalid audio volume');
  return Math.min(100,Math.max(0,Math.round(value)));
}
export function musicGainForVolume(value){
  return +(MUSIC_VOLUMES[2]*(clampAudioVolume(value)/100)**2).toFixed(6);
}
export function sfxGainForVolume(value){
  return +(.85*(clampAudioVolume(value)/100)**1.6).toFixed(6);
}
export function scoreNoteAt(step,trackId=0){
  const symbol=trackNoteAt(step,trackId);
  return symbol?PITCH[symbol]:null;
}

export function createOverswingAudio(host=typeof window!=='undefined'?window:null){
  let context=null,master=null,musicBus=null,sfxBus=null,timer=null,trackBuses=null,cinemaBus=null;
  let nextStep=0,nextAt=0,musicOn=false,sfxOn=true,noise=null;
  let musicVolume=0,sfxVolume=100,backgrounded=false;
  let targetTension=.12,smoothedTension=.12,activeGroove=0;
  let currentTempo=60,musicLevel=0;
  let selectedTrack=0,requestedTrack=0,crossfade=null,goalResolved=false;
  let cinematic=false,menuMusic=false;
  const TRACK_FADE_SECONDS=1.8;
  const canPlay=()=>!!(host&&(host.AudioContext||host.webkitAudioContext));
  const ctx=()=>{
    // iOS may close a context during a long sleep or an audio interruption.
    // Recreate its nodes on the next gesture, keeping the user's mix/track.
    if(context?.state==='closed'){
      clearScheduler();
      context=null;master=null;musicBus=null;sfxBus=null;
      trackBuses=null;cinemaBus=null;noise=null;crossfade=null;
      selectedTrack=requestedTrack;
    }
    if(context||!canPlay())return context;
    const AudioContext=host.AudioContext||host.webkitAudioContext;
    context=new AudioContext();
    master=context.createGain();master.gain.value=.32;
    musicBus=context.createGain();
    musicBus.gain.value=musicOn?musicGainForVolume(musicVolume):0;
    sfxBus=context.createGain();sfxBus.gain.value=sfxGainForVolume(sfxVolume);
    // Each track has its own channel under the music bus. The outgoing and
    // incoming themes are rendered simultaneously only during a crossfade.
    // The limiter continues protecting the combined music + SFX output.
    trackBuses=MUSIC_TRACKS.map((track,i)=>{
      const channel=context.createGain();
      channel.gain.value=i===selectedTrack?1:0;
      channel.connect(musicBus);
      return channel;
    });
    // Preserve the original bus positions, including the cinematic bus, for
    // interrupted iOS sessions and existing gameplay settings.
    cinemaBus=context.createGain();
    cinemaBus.gain.value=cinematic||menuMusic?1:0;
    cinemaBus.connect(musicBus);
    THRILLER_TRACKS.forEach((track,i)=>{
      const channel=context.createGain();
      channel.gain.value=selectedTrack===THRILLER_START+i?1:0;
      channel.connect(musicBus);
      trackBuses.push(channel);
    });
    if(cinematic||menuMusic)trackBuses[selectedTrack].gain.value=0;
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
    const active=context;
    // Safari can change to "interrupted" without a visibility event.
    // Re-arm the clock when the browser restores the context itself.
    active.onstatechange=()=>{
      if(context!==active)return;
      if(active.state==='running')startScheduler();
      else if(active.state==='interrupted'||active.state==='closed'){
        // iOS WebKit sometimes never resolves resume() or reports "running"
        // while the audio graph is silent. Retire the broken graph entirely.
        releaseContext();
      }else clearScheduler();
    };
    return context;
  };
  function clearScheduler(){
    if(timer!==null){host?.clearInterval(timer);timer=null;}
  }
  function releaseContext(){
    const old=context;
    clearScheduler();
    context=null;master=null;musicBus=null;sfxBus=null;
    trackBuses=null;cinemaBus=null;noise=null;crossfade=null;
    selectedTrack=requestedTrack;
    if(!old)return;
    old.onstatechange=null;
    if(old.state!=='closed'){
      // Never await a close/resume promise while the phone is backgrounded.
      // Some iOS versions leave those promises pending indefinitely.
      try{Promise.resolve(old.close()).catch(()=>{});}catch{}
    }
  }
  function startScheduler(){
    if(!context||!musicOn||backgrounded||context.state!=='running'||
      timer!==null)return;
    // Discard any old lookahead after sleep: never burst all missed notes.
    nextAt=context.currentTime+.05;
    schedule();
    timer=host.setInterval(schedule,80);
  }
  function wakeContext(){
    const audio=ctx();
    if(!audio)return false;
    if(audio.state==='running')startScheduler();
    else if(audio.state==='suspended'||audio.state==='interrupted'){
      try{
        Promise.resolve(audio.resume()).then(()=>{
          // A pending resume may settle after unmount, suspension or recreation.
          if(context===audio&&audio.state==='running')startScheduler();
        }).catch(()=>{});
      }catch{/* Another gesture can retry an iOS-blocked resume. */}
    }
    return true;
  }
  // A game soundtrack is secondary to external media (YouTube, podcasts).
  // Unlike 'playback', 'ambient' is allowed to mix with other apps on iOS.
  // Do not touch the session at all while both volume sliders are zero.
  function configureMixableAudioSession(){
    const session=host?.navigator?.audioSession;
    if(!session||typeof session.type!=='string')return;
    try{
      if(session.type!=='ambient')session.type='ambient';
    }catch{/* Unsupported or restricted iOS/WebKit implementation. */}
  }
  function unlock(){
    if(musicVolume===0&&sfxVolume===0)return false;
    backgrounded=false;
    configureMixableAudioSession();
    return wakeContext();
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
  // Original analog-style synthwave bass: a filtered saw with an octave
  // overtone and a short, rounded filter envelope. The bass follows a steady
  // arpeggiated pattern; no soundtrack samples or external audio assets.
  function synthBass(frequency,time,duration,volume,brightness=0,bus=musicBus){
    if(!context||!bus)return;
    const low=context.createOscillator();
    const overtone=context.createOscillator();
    const filter=context.createBiquadFilter();
    const gain=context.createGain();
    low.type='sawtooth';
    overtone.type='square';
    low.frequency.setValueAtTime(Math.max(35,frequency),time);
    overtone.frequency.setValueAtTime(Math.max(70,frequency*2.004),time);
    filter.type='lowpass';
    const cutoff=390+brightness*490;
    filter.frequency.setValueAtTime(cutoff,time);
    filter.frequency.exponentialRampToValueAtTime(195,time+Math.max(.06,duration*.85));
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.002,volume),time+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    low.connect(filter);overtone.connect(filter);filter.connect(gain);gain.connect(bus);
    low.start(time);overtone.start(time);
    low.stop(time+duration+.014);overtone.stop(time+duration+.014);
    low.onended=()=>{low.disconnect();overtone.disconnect();
      filter.disconnect();gain.disconnect();};
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

  // Fast but restrained horror percussion. Three arrangements have different
  // bass movement, accents and dissonance; tension changes tempo and density,
  // not loudness. This uses the existing Web Audio clock and fade buses.
  function renderThrillerStep(trackId,step,time,groove,layers,beat,sixteenth){
    const track=THRILLER_TRACKS[trackId-THRILLER_START];
    const bus=trackBuses[trackId],local=step%16,bar=Math.floor(step/16);
    const root=PITCH[track.roots[bar%4]];
    const note=thrillerNoteAt(step,trackId);
    if(local===0){
      // An ominous two-note drone lives below the moving percussion.
      synthBass(root*.5,time,beat*3.15,.059*layers.bass,.05,bus);
      tone(root*1.059,time+.045,beat*2.8,.012,'triangle',bus,root*1.024);
      if(track.style==='signal')
        tone(root*1.414,time+.1,beat*2.1,.012,'sine',bus,root*1.47);
    }
    if(note){
      const pitch=PITCH[note]*track.octave;
      const duration=track.style==='knock'?beat*.53:beat*.31;
      tone(pitch,time,duration,.040*track.leadGain,
        track.lead,bus,pitch*(track.style==='signal'?1.032:.988));
      if(track.style==='signal'&&local%4===3)
        tone(pitch*1.059,time+.045,sixteenth*.92,.014,'sine',bus,pitch*.992);
    }
    if(groove.bass){
      const bassNote=root*track.bass[Math.floor(local/4)];
      synthBass(bassNote,time,activeGroove>=2?beat*.27:beat*.43,
        .075*layers.bass,.12+activeGroove*.12,bus);
    }
    if(groove.chord&&(local===0||local===8)){
      tone(root*track.chord[0],time,beat*(activeGroove?1.3:2.3),
        .015*layers.menace,'sine',bus);
      tone(root*track.chord[1],time+.06,beat*1.5,
        .011,'triangle',bus,root*1.37);
    }
    if(groove.kick||(activeGroove>=1&&track.kicks.includes(local))){
      tone(102,time,.14,.122*layers.percussion,'sine',bus,40);
      blast(time,.026,.027*layers.percussion,bus,350);
    }
    if(groove.snare){
      blast(time,.10,groove.fill?.072:.059,bus,1120);
      tone(132,time,.075,.017,'triangle',bus,76);
    }
    if(groove.hat||(activeGroove>=1&&track.hats.includes(local)))
      blast(time,.03,.017*layers.percussion,bus,3600);
    if(groove.ghost)blast(time,.045,.020,bus,870);
    if(groove.openHat&&activeGroove>=2)blast(time,.085,.023,bus,3100);
    if(track.style==='knock'&&(local===3||local===11))
      tone(root*2.02,time,.09,.025,'triangle',bus,root*1.4);
    if(track.style==='chase'&&activeGroove>=2&&(local===7||local===15))
      tone(root*2.5,time,sixteenth*.78,.027,'sawtooth',bus,root*1.35);
    if(track.style==='signal'&&(local===6||local===14)){
      tone(root*3.03,time,.10,.020,'sine',bus,root*2.66);
      if(activeGroove>=2)blast(time,.06,.017,bus,1350);
    }
  }
  function renderTrackStep(trackId,step,time,groove,layers,beat,sixteenth){
    if(trackId>=THRILLER_START){
      renderThrillerStep(trackId,step,time,groove,layers,beat,sixteenth);
      return;
    }
    const track=MUSIC_TRACKS[trackId];
    const bus=trackBuses[trackId],local=step%16,bar=Math.floor(step/16);
    const note=scoreNoteAt(step,trackId);
    const root=PITCH[track.roots[bar%4]];
    // Six different melodic phrases, waveforms, chord voicings, and bass
    // patterns over the same synchronized score grid. No borrowed audio.
    if(note){
      tone(note*track.octave,time,(beat/2)*.86,
        .085*track.leadGain,track.lead,bus,
        note*track.octave*.995);
    }
    if(groove.bass){
      const duration=activeGroove<2?beat*.53:beat*.30;
      const bassNote=trackId===0?synthwaveBassPitch(root,local):
        root*track.bass[Math.floor(local/4)];
      synthBass(bassNote,time,duration,.083*layers.bass,
        activeGroove/3+(trackId%3)*.12,bus);
    }
    if(groove.chug)
      tone(root*2,time,sixteenth*.84,.039*layers.menace,
        'sawtooth',bus,root*1.91);
    if(groove.chord){
      const hold=activeGroove===0?beat*2.5:beat*1.5;
      tone(root*track.chord[0],time,hold,.020,'triangle',bus);
      tone(root*track.chord[1],time,hold,.014,'triangle',bus);
    }
    if(groove.echo&&note)
      tone(note*track.octave,time+sixteenth*.52,sixteenth*.43,
        .025*layers.menace,'square',bus);
    // Core synthwave drum machine; each new theme adds its own percussion
    // accents so switching tracks changes more than the lead melody.
    if(groove.kick||track.kicks.includes(local)&&activeGroove>=1){
      tone(120,time,.16,.14*layers.percussion,'sine',bus,44);
      blast(time,.028,.034*layers.percussion,bus,2300);
    }
    if(groove.snare){
      blast(time,.115,groove.fill?.105:.095,bus,1900);
      tone(178,time,.084,.026,'triangle',bus,91);
    }
    if(groove.ghost)blast(time,.062,.043,bus,1650);
    if(groove.hat||track.hats.includes(local)){
      blast(time,.035,.026*layers.percussion,bus,5800);
    }
    if(groove.openHat)blast(time,.11,.032,bus,7200);
    if(local===14&&bar%4===3)
      tone(root*4,time,sixteenth*.95,.031,'triangle',bus,root*3.56);
  }
  // A separate, original procedural horror score. Slow 44 BPM, subsonic-feeling
  // pulses, dissonant suspended drones and occasional distant metal creaks.
  // No samples and no extra timers: it uses the same iOS-safe audio scheduler.
  function renderCinematicStep(step,time,beat){
    const local=step%16;
    if(local===0){
      synthBass(41.2,time,beat*3.1,.12,.0,cinemaBus);
      tone(55,time,beat*3.1,.034,'sine',cinemaBus,54.6);
      tone(58.27,time+.11,beat*2.7,.016,'triangle',cinemaBus,55);
    }
    if(local===8){
      synthBass(36.7,time,beat*2.7,.092,.0,cinemaBus);
      tone(43.6,time,beat*2.5,.024,'triangle',cinemaBus,41.2);
    }
    if(local===12){
      tone(123.5,time,beat*1.5,.020,'sine',cinemaBus,104);
      blast(time,beat*.85,.008,cinemaBus,520);
    }
  }
  // Eight-bar, ~26-second original home theme at 74 BPM, compared with the
  // 44 BPM cinematic drone. Procedural dark ambience, not a short sample loop.
  function renderMenuStep(step,time,beat){
    const local=step%16,bar=Math.floor(step/16)%8;
    const roots=[41.2,36.71,43.65,38.89,49,41.2,36.71,55];
    const root=roots[bar];
    if(local===0){
      synthBass(root,time,beat*3.2,.092,.05,cinemaBus);
      tone(root*1.5,time,beat*3.25,.023,'triangle',cinemaBus,root*1.497);
      tone(root*2.12,time+.11,beat*2.7,.014,'sine',cinemaBus,root*2.08);
      tone(95,time,.16,.062,'sine',cinemaBus,44);
      blast(time,.18,.018,cinemaBus,240);
    }
    if(local===6){
      tone(root*.88,time,beat*1.7,.012,'triangle',cinemaBus,root*.86);
      blast(time,.085,.009,cinemaBus,550);
    }
    if(local===8){
      tone(91,time,.15,.046,'sine',cinemaBus,43);
      synthBass(root*.75,time,beat*1.4,.065,0,cinemaBus);
    }
    if(local===11&&bar%2===1)
      tone(root*3,time,beat*.8,.010,'sine',cinemaBus,root*2.83);
    if(local===14&&bar%4===3)
      blast(time,.25,.012,cinemaBus,900);
  }
  function rampBus(param,to,now,seconds=1.8){
    param.cancelScheduledValues(now);
    // Use setTargetAtTime to stay compatible with Safari/iOS and test shims.
    param.setTargetAtTime(to,now,seconds/4);
  }
  function setAtmosphere(mode){
    if(mode!==null&&mode!=='menu'&&mode!=='cinematic')
      throw new RangeError('Invalid atmosphere mode');
    const nextCinema=mode==='cinematic',nextMenu=mode==='menu';
    if(cinematic===nextCinema&&menuMusic===nextMenu)return mode;
    cinematic=nextCinema;menuMusic=nextMenu;
    if((cinematic||menuMusic)&&crossfade){
      crossfade=null;selectedTrack=requestedTrack;
    }
    if(!context||!trackBuses||!cinemaBus)return mode;
    const now=context.currentTime;
    rampBus(cinemaBus.gain,cinematic||menuMusic?1:0,now);
    // The existing selected track remains untouched. Its bus fades in when
    // starting combat and fades out on the home screen; same audio context.
    trackBuses.forEach((bus,i)=>rampBus(bus.gain,
      cinematic||menuMusic?0:(i===requestedTrack?1:0),now));
    if(!cinematic&&!menuMusic){
      selectedTrack=requestedTrack;
      crossfade=null;
      activeGroove=grooveForTension(targetTension);
      currentTempo=requestedTrack>=THRILLER_START?
        thrillerTempoForGroove(activeGroove):tempoForGroove(activeGroove);
    }
    return mode;
  }
  function setCinematic(enabled){
    return setAtmosphere(enabled?'cinematic':null)==='cinematic';
  }
  // The three-factor gate tension is already stable. Respond to it quickly
  // with a short note-level envelope and musical changes ON THE BEAT, never
  // the old two-bar delay. Keep gradual tempo ramps to avoid a speed jump.
  function scheduleStep(step,time){
    if(cinematic||menuMusic){
      currentTempo=cinematic?44:74;
      if(cinematic)renderCinematicStep(step,time,60/currentTempo);
      else renderMenuStep(step,time,60/currentTempo);
      return;
    }
    const local=step%16;
    const descending=targetTension<smoothedTension;
    const rate=goalResolved?.65:descending?.28:.19;
    smoothedTension+=rate*(targetTension-smoothedTension);
    if(local%4===0){
      activeGroove=nextGroove(activeGroove,smoothedTension);
      if(activeGroove===0)goalResolved=false;
    }
    const layers=musicLayerMix(smoothedTension);
    const tempoTrack=crossfade?crossfade.to:requestedTrack;
    currentTempo=approachTempo(currentTempo,
      tempoTrack>=THRILLER_START?thrillerTempoForGroove(activeGroove):
        tempoForGroove(activeGroove),goalResolved?5:3);
    const beat=60/currentTempo,sixteenth=beat/4;
    // Both themes share the same 16-step clock. No timeline restart on a gate
    // change; only these two buses overlap during the 1.8-second crossfade.
    const active=crossfade?[crossfade.from,crossfade.to]:[selectedTrack];
    for(const trackId of active)
      renderTrackStep(trackId,step,time,grooveEvents(activeGroove,step,
        Math.floor(step/16)),layers,beat,sixteenth);
  }
  function beginTrackCrossfade(nextId){
    if(!context||!trackBuses||!musicOn||nextId===selectedTrack)return;
    const now=context.currentTime,start=now+.025,end=start+TRACK_FADE_SECONDS;
    const old=trackBuses[selectedTrack].gain;
    const incoming=trackBuses[nextId].gain;
    old.cancelScheduledValues(now);
    incoming.cancelScheduledValues(now);
    old.setValueAtTime(1,start);
    incoming.setValueAtTime(0,start);
    // AudioParam ramps are sample-accurate and preserve the global beat.
    // Some test shims lack linearRampToValueAtTime, hence the fallback.
    if(typeof old.linearRampToValueAtTime==='function'){
      old.linearRampToValueAtTime(0,end);
      incoming.linearRampToValueAtTime(1,end);
    }else{
      old.setTargetAtTime(0,start,.35);
      incoming.setTargetAtTime(1,start,.35);
    }
    crossfade={from:selectedTrack,to:nextId,endAt:end};
  }
  function finishTrackCrossfade(nextTime){
    if(!crossfade||nextTime<crossfade.endAt)return;
    selectedTrack=crossfade.to;
    crossfade=null;
    if(requestedTrack!==selectedTrack)beginTrackCrossfade(requestedTrack);
  }
  function setTrack(index){
    if(!Number.isInteger(index)||index<0||index>=GAMEPLAY_TRACKS.length)
      throw new RangeError('Unknown music track');
    requestedTrack=index;
    if(!musicOn){
      selectedTrack=index;crossfade=null;
      if(context&&trackBuses){
        for(let i=0;i<trackBuses.length;i++){
          const p=trackBuses[i].gain;
          p.cancelScheduledValues(context.currentTime);
          p.setValueAtTime(!cinematic&&!menuMusic&&i===index?1:0,context.currentTime);
        }
      }
      return index;
    }
    if(!cinematic&&!menuMusic&&!crossfade&&index!==selectedTrack)beginTrackCrossfade(index);
    return index;
  }
  function schedule(){
    if(!context||!musicOn||context.state!=='running')return;
    const now=context.currentTime;
    if(nextAt<now-.6)nextAt=now+.04;
    let max=0;
    while(nextAt<now+.22&&max++<7){
      finishTrackCrossfade(nextAt);
      scheduleStep(nextStep++,nextAt);
      nextAt+=60/currentTempo/4;
    }
  }
  function stopMusic(){
    musicOn=false;musicLevel=0;musicVolume=0;
    clearScheduler();
    // OFF cancels any pending fade; next ON starts cleanly on the requested
    // theme without leaving muted channels running in the background.
    crossfade=null;selectedTrack=requestedTrack;
    if(context&&trackBuses){
      for(let i=0;i<trackBuses.length;i++){
        const p=trackBuses[i].gain;
        p.cancelScheduledValues(context.currentTime);
        p.setValueAtTime(i===selectedTrack?1:0,context.currentTime);
      }
    }
    if(musicBus&&context){
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0,context.currentTime,.025);
    }
  }
  function setMusicVolume(value){
    const normalized=clampAudioVolume(value);
    if(normalized===0){
      stopMusic();
      // A silent game must relinquish its audio session entirely.
      if(sfxVolume===0)releaseContext();
      return 0;
    }
    // Set before unlock: unmuting music must work even when SFX is also OFF.
    musicVolume=normalized;
    if(!unlock())return 0;
    const wasMusicOn=musicOn;
    musicOn=true;
    musicLevel=normalized<=50?1:2;
    musicBus.gain.cancelScheduledValues(context.currentTime);
    // No restarting the melody: move just the gain while the same scheduler
    // continues. 50% equals the former ON gain; 100% equals former LOUD.
    musicBus.gain.setTargetAtTime(musicGainForVolume(normalized),
      context.currentTime,.06);
    if(!wasMusicOn){
      nextStep=0;
      activeGroove=grooveForTension(targetTension);
      smoothedTension=targetTension;
      currentTempo=requestedTrack>=THRILLER_START?
        thrillerTempoForGroove(activeGroove):tempoForGroove(activeGroove);
      selectedTrack=requestedTrack;crossfade=null;
      if(trackBuses){
        for(let i=0;i<trackBuses.length;i++){
          const p=trackBuses[i].gain;
          p.cancelScheduledValues(context.currentTime);
          p.setValueAtTime(!cinematic&&!menuMusic&&i===selectedTrack?1:0,context.currentTime);
        }
      }
    }
    startScheduler();
    return musicVolume;
  }
  // Preserve API compatibility for older callers and existing game tests.
  function setMusicLevel(level){
    if(!Number.isInteger(level)||level<0||level>2)
      throw new RangeError('Music volume must be OFF, ON or LOUD');
    setMusicVolume([0,50,100][level]);
    return musicLevel;
  }
  function setMusic(enabled){return setMusicLevel(enabled?1:0)>0;}
  function setSfxVolume(value){
    const wasMuted=sfxVolume===0;
    sfxVolume=clampAudioVolume(value);
    sfxOn=sfxVolume>0;
    if(sfxVolume===0&&!musicOn){
      // Do not keep an inactive AudioContext alive after both channels mute.
      releaseContext();
    }else if(sfxVolume>0&&wasMuted&&!context){
      // Re-enabling effects from the settings slider is a user gesture.
      // Restore the context here; ordinary muted taps never reach this path.
      unlock();
    }else if(context&&sfxBus){
      sfxBus.gain.cancelScheduledValues(context.currentTime);
      sfxBus.gain.setTargetAtTime(sfxGainForVolume(sfxVolume),
        context.currentTime,.035);
    }
    return sfxVolume;
  }
  function setSfx(enabled){return setSfxVolume(enabled?100:0)>0;}
  function setTension(value,options={}){
    targetTension=Math.max(0,Math.min(1,Number.isFinite(value)?value:.12));
    if(options?.goalMet){
      // The goal has been reached: immediately resolve the target tension,
      // then descend one groove per beat with a faster, smooth tempo ramp.
      targetTension=.06;
      smoothedTension=.06;
      goalResolved=true;
    }
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
    // A resume() on iPhone can resolve without restoring sound. Abandon the
    // old context on backgrounding, and recreate it only on a real gesture.
    backgrounded=true;
    releaseContext();
  }
  function resume(){
    // Visibility/focus alone cannot reliably unlock Web Audio on iOS.
    // The global pointer/touch handler calls unlock() on the first tap.
    backgrounded=false;
  }
  function restart(){
    // Even the manual recovery button must be inert when audio is muted.
    if(musicVolume===0&&sfxVolume===0)return false;
    // Explicit emergency recovery when WebKit keeps output silent despite
    // reporting "running" (there is no reliable Web Audio silence detector).
    releaseContext();
    backgrounded=false;
    return unlock();
  }
  function dispose(){
    backgrounded=true;
    stopMusic();
    releaseContext();
  }
  return {unlock,play,setMusic,setMusicLevel,setMusicVolume,
    setSfx,setSfxVolume,setTension,setTrack,setCinematic,setAtmosphere,suspend,resume,restart,dispose,
    get menuMusic(){return menuMusic;},
    get cinematic(){return cinematic;},
    get tension(){return targetTension;},
    get trackId(){return requestedTrack;},
    get trackName(){return GAMEPLAY_TRACKS[requestedTrack].name;},
    get crossfading(){return !!crossfade;},
    get musicLevel(){return musicLevel;},
    get musicVolume(){return musicVolume;},
    get sfxVolume(){return sfxVolume;},
    get currentTempo(){return currentTempo;},
    get grooveLevel(){return activeGroove;},
    get grooveName(){return MUSIC_GROOVES[activeGroove].name;},
    get musicOn(){return musicOn;},get sfxOn(){return sfxOn;}};
}
