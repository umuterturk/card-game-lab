import {rank,suit} from './engines.js';

// A single paid peek into ALL remaining, not-yet-drawn deck cards.
// Card identities are shown sorted, never in their future draw order.
export const sortDeckCards=(a,b)=>rank(a)-rank(b)||suit(a)-suit(b)||a-b;

export function revealDeckPrice(count,totalDeckSize=40){
  if(!Number.isSafeInteger(count)||count<=0||
     !Number.isSafeInteger(totalDeckSize)||totalDeckSize<=0||
     count>totalDeckSize)throw new RangeError('Invalid deck size');
  // One purchase, priced by information advantage. The per-card component
  // accounts for the size of the peek, but a scarcity premium dominates:
  // knowing the final few cards is MORE valuable than knowing all 40 early.
  const scarcity=1-count/totalDeckSize;
  const raw=400+8*count+650*scarcity+1100*scarcity**4;
  return Math.ceil(raw/5)*5;
}

export function revealOffer(run){
  if(!run||run.phase!=='playing'||(run.revealPurchaseCount||0)>0)return null;
  const deal=run.encounter?.engineState?.deal;
  if(!Array.isArray(deal?.deck)||!Number.isSafeInteger(deal.pos))return null;
  const cards=deal.deck.slice(deal.pos).sort(sortDeckCards);
  if(!cards.length)return null;
  return {count:cards.length,price:revealDeckPrice(cards.length,deal.deck.length),cards};
}
