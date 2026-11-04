// Hand-only Royal Cards. IDs 40..51 never enter the random FLIP deck.
export const ROYAL_THRESHOLDS=Object.freeze([40000,100000,180000]);
export const ROYAL_NAMES=Object.freeze(['J','Q','K']);
export const ROYAL_PRICES=Object.freeze({J:40000,Q:100000,K:180000});
// The campaign location alone determines difficulty; owning cards never raises targets.

export const KING_INITIAL_BANK_BONUS=100;
export const KING_DECAY_PER_MOVE=10;
export const ROYAL_RULES=Object.freeze({
  J:{value:11,title:'THE SCOUT',description:'STEER ±11 safely to reveal the next FLIP card.'},
  Q:{value:12,title:'THE MIRROR',description:'Choose +12 or −12 when you STEER the Queen.'},
  K:{value:13,title:'THE MELTING CROWN',description:'BANK for up to +100%, losing 10 percentage points each move; or STEER ±13.'}
});
export const isRoyal=id=>Number.isInteger(id)&&id>=40&&id<52;
export const royalRank=id=>isRoyal(id)?ROYAL_NAMES[Math.floor((id-40)/4)]:null;
export const royalSuit=id=>isRoyal(id)?(id-40)%4:null;
export const royalValue=id=>isRoyal(id)?11+Math.floor((id-40)/4):null;
export const royalId=(rank,suit)=>40+ROYAL_NAMES.indexOf(rank)*4+suit;
export const unlockedRoyals=gold=>ROYAL_NAMES.slice(0,ROYAL_THRESHOLDS.filter(n=>gold>=n).length);
export const royalTier=gold=>unlockedRoyals(gold).length;
export const targetScale=()=>1;
export const nextRoyal=gold=>ROYAL_NAMES.find((_,i)=>gold<ROYAL_THRESHOLDS[i])||null;
// Deterministic rotation ensures K appears in a good fraction of fully-unlocked runs.
export function pickRoyalCards(tier,seed,index){
  const available=ROYAL_NAMES.slice(0,Math.max(0,Math.min(3,tier)));
  if(available.length===0)return [];
  // Ensure the newly unlocked King is seen in the first encounter.
  // Over a complete journey, all three Royals have a guaranteed appearance.
  if(tier>=3){
    const pair=index===0?['K',seed%2?'J':'Q']:
      index===1?['J','Q']:['K',seed%2?'Q':'J'];
    let state=(seed+index*2654435761)>>>0;
    return pair.map(name=>{
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      return royalId(name,state%4);
    });
  }
  const shuffled=available.slice();
  let state=(seed+index*2654435761)>>>0;
  for(let i=shuffled.length-1;i>0;i--){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const j=state%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  return shuffled.slice(0,2).map((name,i)=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return royalId(name,state%4);
  });
}

// Every purchased Royal is owned forever and automatically joins future journeys. They enter at randomized future hand
// refills, never in the initial hand or the ordinary FLIP deck.
// Choose suits and ordering once per game. Both remain identical at each gate.
// The rank loadout is unchanged; this does not introduce any new Royal types.
export function royalCardsForLoadout(equipped,seed,index=0){
  if(!Array.isArray(equipped)||equipped.length>3||
     new Set(equipped).size!==equipped.length||
     equipped.some(id=>!ROYAL_NAMES.includes(id)))
    throw new TypeError('Invalid Royal loadout');
  let state=seed>>>0;
  const random=()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
  const cards=equipped.map(rank=>royalId(rank,Math.floor(random()*4)));
  for(let i=cards.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [cards[i],cards[j]]=[cards[j],cards[i]];
  }
  return cards;
}
