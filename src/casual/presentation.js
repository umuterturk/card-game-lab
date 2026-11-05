import {signed} from '../external/engines.js';
import {multiplierParts,multiplierRewards} from './multiplierView.js';

// Presentation-only selectors: values always come from an already committed engine deal.
// Raw Pot is deliberately NOT the prospective Bank payout or resonance bonus.
export function rawPotValue(deal){
  return (deal.pot||[]).reduce((total,id)=>total+Math.abs(signed(id)),0);
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
