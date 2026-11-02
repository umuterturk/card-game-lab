import {rank,overswingMultiplier} from './engines.js';

// One normalized danger score based ONLY on public state. No peeking.
const clamp=n=>Math.max(0,Math.min(1,n));
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
  // Pot risk matters most when its potential value is high. End-of-deck and
  // boss pressure raise the stakes without modifying the melody.
  return Math.round(clamp(
    .10+.30*needle*(.55+.45*exposed)+.24*exposed+
    .15*depletion+.10*progress+(boss?.11:0)
  )*100)/100;
}
export function musicLayerMix(tension){
  const t=clamp(Number.isFinite(tension)?tension:0);
  return {bass:+(.25+.65*t).toFixed(4),
    percussion:+(.20+.80*t).toFixed(4),
    menace:+(t*t).toFixed(4),melody:1};
}
