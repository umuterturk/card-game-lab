import {useEffect,useRef,useState} from 'react';
import {createOverswingAudio} from './overswingAudio.js';
import {readSoundPreferences,persistSoundPreferences} from './overswingSoundPreferences.js';

// One Web Audio context shared across map, preparation, quick play and journey.
// Music never starts on a page load; only an explicit click enables playback.
export default function useOverswingSound(){
  const [musicOn,setMusicOn]=useState(false);
  const [sfxOn,setSfxOn]=useState(()=>{
    if(typeof window==='undefined')return true;
    return readSoundPreferences(window.localStorage).sfx;
  });
  const audioRef=useRef(null);
  const ensure=()=>{
    if(!audioRef.current)audioRef.current=createOverswingAudio();
    return audioRef.current;
  };
  const toggleMusic=()=>{
    const audio=ensure();
    audio.setSfx(sfxOn);
    const enabled=audio.setMusic(!musicOn);
    setMusicOn(enabled);
    persistSoundPreferences(typeof window==='undefined'?null:window.localStorage,{
      music:enabled,sfx:sfxOn
    });
  };
  const toggleSfx=()=>{
    const enabled=!sfxOn,audio=ensure();
    if(enabled)audio.unlock();
    audio.setSfx(enabled);
    setSfxOn(enabled);
    persistSoundPreferences(typeof window==='undefined'?null:window.localStorage,{
      music:musicOn,sfx:enabled
    });
  };
  const unlock=()=>{
    const audio=ensure();
    audio.setSfx(sfxOn);
    audio.unlock();
  };
  const play=action=>audioRef.current?.play(action);
  useEffect(()=>{
    const visibility=()=>{
      if(document.hidden)audioRef.current?.suspend();
      else audioRef.current?.resume();
    };
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      document.removeEventListener('visibilitychange',visibility);
      audioRef.current?.dispose();
      audioRef.current=null;
    };
  },[]);
  return {musicOn,sfxOn,toggleMusic,toggleSfx,unlock,play};
}
