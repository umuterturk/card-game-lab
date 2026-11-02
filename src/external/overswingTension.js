// Music tension is a deliberately slow, monotonic measure of the current
// gate's progress. Only THREE game inputs influence it:
// 1. percent of Gold still needed, 2. deck + hand cards left, 3. gate level.
// Pendulum, Pot, SNAP, multipliers, bosses, and individual card values DO NOT
// influence the music. Events may still play their own short sound effects.
export const OVERSWING_CARD_POOL=40;
export const OVERSWING_MAX_GATE_LEVEL=36; // 12 campaign levels × 3 gates
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));

export function overswingTension({
  deal,target=3000,gateLevel=1,maxGateLevel=OVERSWING_MAX_GATE_LEVEL
}={}){
  if(!deal)return .06;
  const goal=Number.isFinite(target)&&target>0?target:3000;
  const scored=Math.max(0,Number.isFinite(deal.T)?deal.T:0);
  // Successful gate: resolve the tension immediately. Neither the remaining
  // deck nor campaign difficulty should keep the music in combat mode.
  if(scored>=goal)return .06;
  const goldRemainingPct=clamp((goal-scored)/goal);
  const goldProgress=1-goldRemainingPct;
  const deckLeft=Math.max(0,(deal.deck?.length||0)-(deal.pos||0));
  const handLeft=Array.isArray(deal.hand)?deal.hand.length:0;
  const cardDepletion=1-clamp((deckLeft+handLeft)/OVERSWING_CARD_POOL);
  const levelProgress=clamp((gateLevel-1)/Math.max(1,maxGateLevel-1));

  // Gold progress and card depletion each evolve through the whole gate.
  // Gate level adds modest baseline intensity across the 36-gate campaign.
  return Math.round(clamp(
    .06+.42*goldProgress+.39*cardDepletion+.13*levelProgress
  )*1000)/1000;
}

export function musicLayerMix(tension){
  const t=clamp(tension);
  // Keep volume nearly flat. Musical intensity comes from bass sequencing,
  // syncopation, drum patterns, filter movement and arrangement changes.
  return {
    bass:+(.84+.08*t).toFixed(4),
    percussion:+(.84+.08*t).toFixed(4),
    menace:+(.79+.10*t).toFixed(4),
    melody:1
  };
}
