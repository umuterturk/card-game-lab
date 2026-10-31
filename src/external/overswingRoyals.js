// Hand-only Royal Cards. IDs 40..51 never enter the random FLIP deck.
export const ROYAL_THRESHOLDS=Object.freeze([40000,100000,180000]);
export const ROYAL_NAMES=Object.freeze(['J','Q','K']);
export const ROYAL_RULES=Object.freeze({
  J:{value:11,title:'THE SCOUT',description:'STEER ±11 safely to reveal the next FLIP card.'},
  Q:{value:12,title:'THE MIRROR',description:'Choose +12 or −12 when you STEER the Queen.'},
  K:{value:13,title:'THE MELTING CROWN',description:'BANK for up to +50%, losing 10 percentage points each move; or STEER ±13.'}
});
export const isRoyal=id=>Number.isInteger(id)&&id>=40&&id<52;
export const royalRank=id=>isRoyal(id)?ROYAL_NAMES[Math.floor((id-40)/4)]:null;
export const royalSuit=id=>isRoyal(id)?(id-40)%4:null;
export const royalValue=id=>isRoyal(id)?11+Math.floor((id-40)/4):null;
export const royalId=(rank,suit)=>40+ROYAL_NAMES.indexOf(rank)*4+suit;
export const unlockedRoyals=gold=>ROYAL_NAMES.slice(0,ROYAL_THRESHOLDS.filter(n=>gold>=n).length);
export const royalTier=gold=>unlockedRoyals(gold).length;
export const targetScale=tier=>1+Math.min(3,Math.max(0,tier))*0.05;
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
