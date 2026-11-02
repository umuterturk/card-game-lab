import {seeded,shuffle} from './engines.js';

export const WILD_IDS=Object.freeze(['shuffle','polarity','shield']);
export const WILD_RULES=Object.freeze({
  shuffle:{name:'WILD SHUFFLE',symbol:'⟳',
    description:'Replace ordinary hand cards from the unseen deck. Royals stay put.'},
  polarity:{name:'POLARITY SWITCH',symbol:'±',
    description:'Reverse one ordinary hand card and immediately STEER it.'},
  shield:{name:'EMBER SHIELD',symbol:'◇',
    description:'Protect your Pot from the next FLIP SNAP. Resets multipliers; boss SNAP tax still applies.'}
});
export const EMPTY_WILD_INVENTORY=Object.freeze({shuffle:0,polarity:0,shield:0});
export function wildInventory(value){
  return Object.fromEntries(WILD_IDS.map(id=>[id,
    Number.isSafeInteger(value?.[id])&&value[id]>=0?value[id]:0]));
}
export function wildBalance(inventory,events=[]){
  const counts=wildInventory(inventory);
  for(const e of events)if(WILD_IDS.includes(e.wildId))counts[e.wildId]+=e.amount;
  return counts;
}
// Wild Shuffle exchanges only ordinary hand cards with the unseen cards.
// Fixed seeded Fisher–Yates keeps a retry/reload reproducible. No card created
// or removed; the unseen deck length and consumed prefix stay unchanged.
export function shuffleWildHand(engine,seed){
  const d=engine.deal;
  const ordinaryIndexes=d.hand.flatMap((id,index)=>id<40?[index]:[]);
  if(engine.status!=='playing'||!ordinaryIndexes.length||d.pos>=d.deck.length)return engine;
  const pool=[...d.deck.slice(d.pos),...ordinaryIndexes.map(index=>d.hand[index])];
  const shuffled=shuffle(pool,seeded(seed));
  const picks=shuffled.slice(0,ordinaryIndexes.length);
  const remaining=shuffled.slice(ordinaryIndexes.length);
  const hand=d.hand.slice();
  ordinaryIndexes.forEach((index,i)=>{hand[index]=picks[i];});
  const deal={...d,hand,deck:[...d.deck.slice(0,d.pos),...remaining],scoutNext:null};
  const msg='WILD SHUFFLE: '+ordinaryIndexes.length+' ordinary hand cards refreshed.';
  return {...engine,deal,last:msg,lastRefill:[],
    lastAction:{type:'wild',wildId:'shuffle',replaced:ordinaryIndexes.length},
    history:[msg,...(engine.history||[])].slice(0,12)};
}
