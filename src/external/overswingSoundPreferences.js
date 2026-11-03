// Persist audio preferences without ever autoplaying on page load.
// Legacy v1 on/off settings are migrated to independent volume percentages.
import {MUSIC_TRACKS} from './overswingTracks.js';
export const OVERSWING_SOUND_KEY='overswing_sound_v2';
export const LEGACY_SOUND_KEY='overswing_sound_v1';
export const DEFAULT_SOUND_PREFS=Object.freeze({
  musicVolume:25,sfxVolume:50,trackChoice:null
});
const percent=(value,fallback)=>{
  if(!Number.isFinite(value))return fallback;
  return Math.max(0,Math.min(100,Math.round(value)));
};
export function normalizeSoundPreferences(value){
  return {
    musicVolume:percent(value?.musicVolume,
      value?.music===true?50:value?.music===false?0:DEFAULT_SOUND_PREFS.musicVolume),
    sfxVolume:percent(value?.sfxVolume,
      value?.sfx===false?0:value?.sfx===true?100:DEFAULT_SOUND_PREFS.sfxVolume),
    trackChoice:Number.isInteger(value?.trackChoice)&&
      value.trackChoice>=0&&value.trackChoice<MUSIC_TRACKS.length?
      value.trackChoice:null
  };
}
export function readSoundPreferences(storage){
  try{
    const modern=storage?.getItem(OVERSWING_SOUND_KEY);
    if(modern)return normalizeSoundPreferences(JSON.parse(modern));
    const legacy=storage?.getItem(LEGACY_SOUND_KEY);
    if(legacy)return normalizeSoundPreferences(JSON.parse(legacy));
    return {...DEFAULT_SOUND_PREFS};
  }catch{return {...DEFAULT_SOUND_PREFS};}
}
export function persistSoundPreferences(storage,prefs){
  try{
    storage?.setItem(OVERSWING_SOUND_KEY,
      JSON.stringify(normalizeSoundPreferences(prefs)));
    return true;
  }catch{return false;}
}

// Theme preferences use a separate key to preserve compatibility with v1/v2
// sound settings and their original sixteen-track manual selection.
export const OVERSWING_THEME_KEY='overswing_music_theme_v1';
export const DEFAULT_THEME_PREFS=Object.freeze({theme:'synthwave',trackChoice:null});
export function readMusicThemePreferences(storage){
  try{
    const raw=storage?.getItem(OVERSWING_THEME_KEY);
    const prefs=raw?JSON.parse(raw):null;
    return {
      theme:prefs?.theme==='thriller'?'thriller':'synthwave',
      trackChoice:Number.isInteger(prefs?.trackChoice)&&
        prefs.trackChoice>=MUSIC_TRACKS.length&&
        prefs.trackChoice<MUSIC_TRACKS.length+3?prefs.trackChoice:null
    };
  }catch{return {...DEFAULT_THEME_PREFS};}
}
export function persistMusicThemePreferences(storage,prefs){
  try{
    storage?.setItem(OVERSWING_THEME_KEY,JSON.stringify({
      theme:prefs?.theme==='thriller'?'thriller':'synthwave',
      trackChoice:Number.isInteger(prefs?.trackChoice)&&
        prefs.trackChoice>=MUSIC_TRACKS.length&&
        prefs.trackChoice<MUSIC_TRACKS.length+3?prefs.trackChoice:null
    }));
    return true;
  }catch{return false;}
}
