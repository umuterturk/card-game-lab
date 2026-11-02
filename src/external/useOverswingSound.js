import {useEffect,useRef,useState} from 'react';
import {createOverswingAudio,nextMusicLevel} from './overswingAudio.js';
import {readSoundPreferences,persistSoundPreferences} from './overswingSoundPreferences.js';

// One Web Audio context shared across map, preparation, quick play and journey.
// Music never starts on a page load; only an explicit click enables playback.
export default function useOverswingSound(){
  // Music is always OFF on page load. Autoplay is never inferred from storage.
  const [musicLevel,setMusicLevel]=useState(0);
  const musicOn=musicLevel>0;
  const [sfxOn,setSfxOn]=useState(()=>{
    if(typeof window==='undefined')return true;
    return readSoundPreferences(window.localStorage).sfx;
  });
  const audioRef=useRef(null);
  const tensionRef=useRef(.12);
  const ensure=()=>{
    if(!audioRef.current){
      audioRef.current=createOverswingAudio();
      audioRef.current.setTension(tensionRef.current);
    }
    return audioRef.current;
  };
  const toggleMusic=()=>{
    const audio=ensure();
    audio.setSfx(sfxOn);
    // OFF -> NORMAL -> LOUD -> OFF. Volume updates never restart playback.
    const next=audio.setMusicLevel(nextMusicLevel(musicLevel));
    setMusicLevel(next);
    persistSoundPreferences(typeof window==='undefined'?null:window.localStorage,{
      music:next>0,sfx:sfxOn
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
  // Store the current danger without creating a new AudioContext or autoplay.
  const setTension=value=>{
    const normalized=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.12;
    tensionRef.current=normalized;
    audioRef.current?.setTension(normalized);
  };
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
  return {musicOn,musicLevel,sfxOn,toggleMusic,toggleSfx,unlock,play,setTension};
}
