// Persistent UI preference only. Audio never autoplays merely because these
// flags are stored; playback still requires a direct user gesture.
export const OVERSWING_SOUND_KEY='overswing_sound_v1';
export const DEFAULT_SOUND_PREFS=Object.freeze({music:false,sfx:true});
export function readSoundPreferences(storage){
  try{
    const parsed=JSON.parse(storage?.getItem(OVERSWING_SOUND_KEY)||'null');
    return {music:parsed?.music===true,sfx:parsed?.sfx!==false};
  }catch{return {...DEFAULT_SOUND_PREFS};}
}
export function persistSoundPreferences(storage,prefs){
  try{
    storage?.setItem(OVERSWING_SOUND_KEY,JSON.stringify({
      music:prefs.music===true,sfx:prefs.sfx!==false
    }));
    return true;
  }catch{return false;}
}
