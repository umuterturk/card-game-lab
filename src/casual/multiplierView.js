// Presentation values are derived from the canonical Overswing deal.
// No independent casual multiplier calculations or persisted UI multipliers.
export function multiplierParts(deal){
  return [
    {kind:'swing',value:deal.W+1,label:'Swing multiplier'},
    {kind:'flip',value:deal.flipFactor,label:'Flip multiplier'},
    {kind:'jackpot',value:deal.jackpotFactor,label:'Jackpot multiplier'}
  ];
}

// Source flags are emitted by stepOverswing, after all strict-crossing,
// zero-break and Snap rules have run. Never invent rewards from UI movement.
export function multiplierRewards(deal,lastAction){
  if(!lastAction||lastAction.snap||lastAction.zeroBreak)return [];
  const parts=multiplierParts(deal);
  return parts.filter(({kind})=>
    kind==='swing'?lastAction.swingTierGained:
    kind==='flip'?lastAction.flipTierGained:
    lastAction.jackpotTierGained);
}
