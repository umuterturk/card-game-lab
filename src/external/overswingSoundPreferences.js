// Persist audio preferences without ever autoplaying on page load.
// Legacy v1 on/off settings are migrated to independent volume percentages.
import {MUSIC_TRACKS} from './overswingTracks.js';
export const OVERSWING_SOUND_KEY='overswing_sound_v2';
export const LEGACY_SOUND_KEY='overswing_sound_v1';
export const DEFAULT_SOUND_PREFS=Object.freeze({
  musicVolume:0,sfxVolume:100,trackChoice:null
});
const percent=(value,fallback)=>{
  if(!Number.isFinite(value))return fallback;
  return Math.max(0,Math.min(100,Math.round(value)));
};
export function normalizeSoundPreferences(value){
  return {
    musicVolume:percent(value?.musicVolume,
      value?.music===true?50:DEFAULT_SOUND_PREFS.musicVolume),
    sfxVolume:percent(value?.sfxVolume,
      value?.sfx===false?0:DEFAULT_SOUND_PREFS.sfxVolume),
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
