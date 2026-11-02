// Public card-counting data for the active deal. Never expose the unseen
// deck's order or infer which ordinary cards were removed for equipped Royals.
export const CARD_HISTORY_STATES=Object.freeze(['out','pot','hand','unknown']);
export function cardHistory(deal){
  if(!deal||!Array.isArray(deal.discard)||!Array.isArray(deal.pot)||
     !Array.isArray(deal.hand)||!Array.isArray(deal.deck))
    throw new TypeError('Invalid deal for history');
  const out=new Set(deal.discard),pot=new Set(deal.pot),hand=new Set(deal.hand);
  const states=Array.from({length:40},(_,id)=>
    out.has(id)?'out':pot.has(id)?'pot':hand.has(id)?'hand':'unknown');
  return {
    discarded:deal.discard.length,potCount:deal.pot.length,
    handCount:deal.hand.length,
    unseen:Math.max(0,deal.deck.length-deal.pos),
    states,
    royalsOut:deal.discard.filter(id=>id>=40)
  };
}
