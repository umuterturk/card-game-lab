import {rank,overswingMultiplier} from './engines.js';

// Visible-board urgency. SNAP danger should be noticeable even when the Pot is
// not enormous relative to the gate target. Does not read the hidden deck.
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function overswingTension({deal,target=3000,limit=10,boss=false}={}){
  if(!deal)return .12;
  const safeLimit=Number.isFinite(limit)&&limit>0?limit:10;
  const goal=Number.isFinite(target)&&target>0?target:3000;
  const potValue=Array.isArray(deal.pot)?deal.pot.reduce((sum,id)=>sum+rank(id),0):0;
  const multiplier=overswingMultiplier({
    W:Math.max(0,deal.W||0),flipFactor:Math.max(1,deal.flipFactor||1),
    jackpotFactor:Math.max(1,deal.jackpotFactor||1)
  });
  const exposed=clamp(potValue*multiplier/goal);
  const needle=clamp(Math.abs(deal.S||0)/safeLimit);
  const progress=clamp((deal.T||0)/goal);
  const deckSize=Math.max(1,deal.deck?.length||40);
  const depletion=clamp((deal.pos||0)/deckSize);
  // Always respect imminent SNAP. Exposed Gold, depleted draw chances and
  // boss pressure make it worse, but a near-limit needle is never "calm".
  return Math.round(clamp(
    .10+.40*needle+.24*exposed+
    .10*depletion+.06*progress+(boss?.08:0)
  )*100)/100;
}
export function musicLayerMix(tension){
  const t=clamp(tension);
  // Tiny volume variation (<12%); the recognizable changes are grooves,
  // double-time drums, rhythmic bass and minor supporting harmonies.
  return {bass:+(.84+.10*t).toFixed(4),
    percussion:+(.84+.10*t).toFixed(4),
    menace:+(.78+.12*t).toFixed(4),
    melody:1};
}
