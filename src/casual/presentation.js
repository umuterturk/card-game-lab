import {signed} from '../external/engines.js';
import {multiplierParts,multiplierRewards} from './multiplierView.js';

// Presentation-only selectors: values always come from an already committed engine deal.
// Raw Pot is deliberately NOT the prospective Bank payout or resonance bonus.
export function rawPotValue(deal){
  return (deal.pot||[]).reduce((total,id)=>total+Math.abs(signed(id)),0);
}


// Keep the tank a readable, compact visual meter. More points always mean more fluid;
// values beyond the goal are capped visually (the true numbers remain visible).
export function fluidFillPercent(amount,target,{max=78}={}){
  if(!Number.isFinite(amount)||!Number.isFinite(target)||target<=0||max<=0)return 0;
  if(amount<=0)return 0;
  return Math.min(max,Math.max(5,Math.round((amount/target)*max)));
}

export function actionPresentation(before,after,action){
  const previous=before.game.deal;
  const current=after.game.deal;
  const result=after.game.lastAction||{};
  return {
    type:action.type,
    from:result.from??previous.S,
    to:result.to??current.S,
    signedCard:result.card==null?null:signed(result.card),
    addedToPot:result.addedToPot??0,
    rawPotBefore:rawPotValue(previous),
    rawPotAfter:rawPotValue(current),
    resonanceAfter:current.resonancePoints||0,
    resonanceGained:result.resonanceGained||0,
    bankGain:current.T-previous.T,
    securedBefore:previous.T,
    securedAfter:current.T,
    snap:!!result.snap,
    zeroBreak:!!result.zeroBreak,
    snapsAfter:after.snaps,
    factorsBefore:multiplierParts(previous),
    factorsAfter:multiplierParts(current),
    rewards:multiplierRewards(current,result),
    event:after.event.type
  };
}
