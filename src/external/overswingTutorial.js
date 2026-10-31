// Fixed 40-card teaching deck. Card IDs: hearts 0-9, diamonds 10-19,
// spades 20-29, clubs 30-39; signed ranks follow engines.js.
// A short, fixed sequence: FLIP, STEER, SWING, JACKPOT, BANK, ZERO BREAK, SNAP.
const OPENING_HAND=[27,0,3,23,5,28,7,2]; // -8, +1, +4, -4, +6, -9, +8, +3
const GUIDED_FLIPS=[12,11,15,17,4]; // +3, +2, +6, +8, +5
export const OVERSWING_TUTORIAL_DECK=[
  ...OPENING_HAND,...GUIDED_FLIPS,
  ...Array.from({length:40},(_,i)=>i).filter(id=>!OPENING_HAND.includes(id)&&!GUIDED_FLIPS.includes(id))
];

export const OVERSWING_TUTORIAL_INTRO=[
  {term:'FLIP',text:'Draw a random card from the deck. It enters the Pot.'},
  {term:'STEER',text:'Play a card of your choice from your hand.'},
  {term:'POT',text:'Unbanked card points. You lose them on SNAP.'},
  {term:'SCORE',text:'Points safely collected by BANK.'}
];

// Ten guided actions, using the same fixed deck as the original tutorial.
export const OVERSWING_TUTORIAL_STEPS=[
  {type:'flip',title:'FLIP',instruction:'Tap FLIP to reveal +3.',why:'The random card enters the Pot. FLIP ×2.'},
  {type:'flip',title:'FLIP STREAK',instruction:'FLIP again to reveal +2.',why:'Two FLIPs in a row: FLIP ×3.'},
  {type:'steer',card:27,title:'SWING',instruction:'Play 8♠ (−8) from your hand: +5 → −3.',why:'You crossed zero: SWING ×2. The card enters the Pot.'},
  {type:'steer',card:0,title:'STEER COST',instruction:'Play A♥ (+1): −3 → −2.',why:'No crossing: SWING drops to ×1. Card discarded.'},
  {type:'flip',title:'JACKPOT',instruction:'FLIP +6: −2 → +4.',why:'FLIP crossing: SWING ×2 and JACKPOT ×2. The next crossing makes JACKPOT ×3.'},
  {type:'bank',title:'BANK & SCORE',instruction:'Tap BANK to secure your points.',why:'Pot × SWING × FLIP × JACKPOT is added to your score.'},
  {type:'steer',card:3,title:'NEW POT',instruction:'Play 4♥ (+4).',why:'The first STEER of a new Pot enters the Pot.'},
  {type:'steer',card:23,title:'ZERO BREAK',instruction:'Play 4♠ (−4): +4 → 0.',why:'Exact zero resets all multipliers to ×1 but preserves the Pot.'},
  {type:'flip',title:'THE LIMIT',instruction:'FLIP to reveal +8.',why:'Stay between −10 and +10.'},
  {type:'flip',title:'SNAP',instruction:'FLIP again: +8 → +13.',why:'Outside the limit! The Pot is lost. Tutorial complete.'}
];

export function overswingTutorialExpectedAction(deal,stepIndex){
  const step=OVERSWING_TUTORIAL_STEPS[stepIndex];
  if(!step)return null;
  if(step.type==='steer'){
    const index=deal.hand.indexOf(step.card);
    return index<0?null:{type:'steer',index};
  }
  if(step.type==='bank'&&step.dropCard!=null){
    const dropIndex=deal.hand.indexOf(step.dropCard);
    return dropIndex<0?null:{type:'bank',dropIndex};
  }
  return {type:step.type};
}
