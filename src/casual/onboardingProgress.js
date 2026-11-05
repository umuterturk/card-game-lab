// The development reset is scoped to Swing Casual onboarding.
// Do not clear unrelated game settings, audio preferences, or other games.
export const ONBOARDING_SESSION_KEY='swing-casual-onboarding-session-v2';
export const ONBOARDING_PROGRESS_KEY='swing-casual-onboarding-unlocked-v1';
const LEGACY_SESSION_KEY='swing-casual-onboarding-session-v1';

export function clearOnboardingProgress(storage){
  if(!storage)return false;
  try{
    storage.removeItem(ONBOARDING_SESSION_KEY);
    storage.removeItem(ONBOARDING_PROGRESS_KEY);
    storage.removeItem(LEGACY_SESSION_KEY);
    return true;
  }catch{
    return false;
  }
}
