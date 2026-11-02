// Pure visual feedback model: never mutates a game action or the engine.
// Severity: jackpot > crossing > FLIP streak. Pot cracks only on actual loss.
export function multiplierFeedbackForAction(action){
  if(!action||(action.type!=='flip'&&action.type!=='steer')||
     action.snap||action.zeroBreak)return null;
  if(action.type==='flip'&&action.jackpotTierGained===true)
    return {kind:'jackpot',factor:action.jackpotFactor,gain:action.gain||0};
  if(action.swingTierGained===true)
    return {kind:'swing',factor:action.multiplier||1,gain:action.gain};
  if(action.type==='flip'&&action.flipTierGained===true)
    return {kind:'flip',factor:action.flipFactor,gain:0};
  return null;
}
export function potCrackForAction(action){
  if(!action||(action.type!=='flip'&&action.type!=='steer')||
     !action.snap||action.shielded||!Number.isFinite(action.lost)||
     action.lost<=0)return null;
  return {potPointsLost:action.lost,pointsLost:Math.max(0,action.lostPayout||0)};
}
