import {useEffect,useRef,useState} from 'react';
import {createOverswingAudio,clampAudioVolume} from './overswingAudio.js';
import {MUSIC_TRACKS} from './overswingTracks.js';
import {THRILLER_START,GAMEPLAY_TRACKS,
  thrillerTrackForClassic} from './overswingThriller.js';
import {readSoundPreferences,persistSoundPreferences,
  readMusicThemePreferences,persistMusicThemePreferences}
  from './overswingSoundPreferences.js';

// One audio engine shared by the main page, preparation, quick game and journey.
// A saved volume never autoplays: music begins only after a user gesture.
export default function useOverswingSound(){
  const [initial]=useState(()=>typeof window==='undefined'?
    readSoundPreferences(null):readSoundPreferences(window.localStorage));
  const [initialTheme]=useState(()=>typeof window==='undefined'?
    readMusicThemePreferences(null):readMusicThemePreferences(window.localStorage));
  const [theme,setThemeState]=useState(initialTheme.theme);
  const [musicVolume,setMusicVolumeState]=useState(initial.musicVolume);
  const [sfxVolume,setSfxVolumeState]=useState(initial.sfxVolume);
  const [trackChoice,setTrackChoiceState]=useState(initialTheme.theme==='thriller'?
    initialTheme.trackChoice:initial.trackChoice);
  const [gateTrack,setGateTrack]=useState(initialTheme.theme==='thriller'?THRILLER_START:0);
  const [musicOn,setMusicOn]=useState(false);
  const audioRef=useRef(null),tensionRef=useRef(.06);
  const musicRef=useRef(initial.musicVolume),sfxRef=useRef(initial.sfxVolume);
  const choiceRef=useRef(initialTheme.theme==='thriller'?
    initialTheme.trackChoice:initial.trackChoice);
  const gateRef=useRef(initialTheme.theme==='thriller'?THRILLER_START:0);
  const themeRef=useRef(initialTheme.theme),classicGateRef=useRef(0);
  const cinematicRef=useRef(false);
  const atmosphereRef=useRef(null);

  const effectiveTrack=trackChoice??gateTrack;
  const persist=()=>{
    const storage=typeof window==='undefined'?null:window.localStorage;
    persistSoundPreferences(storage,{
      musicVolume:musicRef.current,sfxVolume:sfxRef.current,
      trackChoice:themeRef.current==='thriller'?null:choiceRef.current
    });
    persistMusicThemePreferences(storage,{
      theme:themeRef.current,
      trackChoice:themeRef.current==='thriller'?choiceRef.current:null
    });
  };
  const ensure=()=>{
    if(!audioRef.current){
      audioRef.current=createOverswingAudio();
      audioRef.current.setTrack(choiceRef.current??gateRef.current);
      audioRef.current.setSfxVolume(sfxRef.current);
      audioRef.current.setTension(tensionRef.current);
      audioRef.current.setAtmosphere(atmosphereRef.current);
    }
    return audioRef.current;
  };
  const unlock=()=>{
    const audio=ensure();
    if(!audio.unlock())return false;
    if(musicRef.current>0&&audio.musicVolume!==musicRef.current){
      audio.setMusicVolume(musicRef.current);
    }
    setMusicOn(audio.musicOn);
    return true;
  };
  const restartAudio=()=>{
    const audio=ensure();
    audio.restart();
    // The reset preserves the selected track, but the engine might not have
    // been started yet if the user has only opened the settings panel.
    if(musicRef.current>0&&audio.musicVolume!==musicRef.current)
      audio.setMusicVolume(musicRef.current);
    setMusicOn(audio.musicOn);
  };
  const setMusicVolume=value=>{
    const normalized=clampAudioVolume(Number(value));
    musicRef.current=normalized;
    setMusicVolumeState(normalized);
    if(normalized===0){
      audioRef.current?.setMusicVolume(0);
      setMusicOn(false);
    }else{
      // Slider interaction is itself a user gesture; begin or adjust playback.
      const audio=ensure();
      setMusicOn(audio.setMusicVolume(normalized)>0);
    }
    persist();
  };
  const setSfxVolume=value=>{
    const normalized=clampAudioVolume(Number(value));
    sfxRef.current=normalized;
    setSfxVolumeState(normalized);
    audioRef.current?.setSfxVolume(normalized);
    persist();
  };
  const setTrackChoice=value=>{
    const next=value===null?null:Number(value);
    if(next!==null&&(!Number.isInteger(next)||next<0||next>=GAMEPLAY_TRACKS.length||
      (next>=THRILLER_START)!==(themeRef.current==='thriller')))
      throw new RangeError('Unknown track selection');
    choiceRef.current=next;
    setTrackChoiceState(next);
    const index=next??gateRef.current;
    audioRef.current?.setTrack(index);
    // Choosing a track while a saved music volume is >0 can start playback
    // on this direct user interaction, with the same 1.8-second crossfade.
    if(musicRef.current>0)unlock();
    persist();
  };
  const setTrack=index=>{
    classicGateRef.current=index;
    if(themeRef.current==='thriller')index=thrillerTrackForClassic(index);
    gateRef.current=index;
    setGateTrack(index);
    if(choiceRef.current===null)audioRef.current?.setTrack(index);
  };
  const setTheme=value=>{
    if(value!=='thriller'&&value!=='synthwave')throw new RangeError('Unknown music theme');
    if(value===themeRef.current)return;
    themeRef.current=value;
    setThemeState(value);
    choiceRef.current=null;
    setTrackChoiceState(null);
    const index=value==='thriller'?
      thrillerTrackForClassic(classicGateRef.current):classicGateRef.current;
    gateRef.current=index;
    setGateTrack(index);
    audioRef.current?.setTrack(index);
    if(musicRef.current>0)unlock();
    persist();
  };
  const setAtmosphere=mode=>{
    atmosphereRef.current=mode;
    cinematicRef.current=mode==='cinematic';
    audioRef.current?.setAtmosphere(mode);
  };
  const setCinematic=enabled=>setAtmosphere(enabled?'cinematic':null);
  const play=action=>audioRef.current?.play(action);
  const setTension=(value,options={})=>{
    const normalized=Number.isFinite(value)?
      Math.max(0,Math.min(1,value)):.06;
    tensionRef.current=options.goalMet?.06:normalized;
    audioRef.current?.setTension(tensionRef.current,options);
  };
  useEffect(()=>{
    const pause=()=>audioRef.current?.suspend();
    const recover=()=>{
      if(!document.hidden)audioRef.current?.resume();
    };
    const visibility=()=>document.hidden?pause():recover();
    // iOS may restore a page through pageshow/focus without a reliable
    // visibilitychange, and may require a fresh gesture after interruption.
    const recoverOnGesture=()=>{
      if(!document.hidden)audioRef.current?.unlock();
    };
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',pause);
    window.addEventListener('blur',pause);
    window.addEventListener('pageshow',recover);
    window.addEventListener('focus',recover);
    document.addEventListener('pointerdown',recoverOnGesture,true);
    document.addEventListener('touchstart',recoverOnGesture,{capture:true,passive:true});
    document.addEventListener('keydown',recoverOnGesture,true);
    return ()=>{
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pagehide',pause);
      window.removeEventListener('blur',pause);
      window.removeEventListener('pageshow',recover);
      window.removeEventListener('focus',recover);
      document.removeEventListener('pointerdown',recoverOnGesture,true);
      document.removeEventListener('touchstart',recoverOnGesture,true);
      document.removeEventListener('keydown',recoverOnGesture,true);
      audioRef.current?.dispose();
      audioRef.current=null;
    };
  },[]);
  return {theme,setTheme,musicVolume,sfxVolume,musicOn,sfxOn:sfxVolume>0,
    trackChoice,gateTrack,effectiveTrack,setMusicVolume,setSfxVolume,
    setTrackChoice,setTrack,setCinematic,setAtmosphere,unlock,restartAudio,play,setTension};
}
