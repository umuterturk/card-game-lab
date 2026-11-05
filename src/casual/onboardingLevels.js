import {newOverswing,stepOverswing,overswingActions,applySwing,signed} from '../external/engines.js';

// Visible features unlock only after their engine behavior can be understood.
// Each short, deterministic level uses the same authoritative Overswing rules.
const BASIC_RULES=Object.freeze({
  snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true,
  steerNoncrossPenalty:0,flipNoncrossPenalty:0,
  enableResonance:false
});
const steer=(index=0)=>({type:'steer',index});
const bank=()=>({type:'bank'});
const flip=()=>({type:'flip'});
const make=(id,name,target,deck,handSize,extras={})=>Object.freeze({
  id,name,target,deck:Object.freeze(deck),initialHandSize:handSize,
  visibleHandSlots:extras.visibleHandSlots??handSize,
  maxSnaps:extras.maxSnaps??2,
  showMeter:true,showFlip:id>=4,showChances:id>=9,
  visibleFactors:Object.freeze(['swing','flip','jackpot'].filter((_,i)=>id>=5+i)),
  rules:Object.freeze({
    ...BASIC_RULES,
    enableSwingFactor:id>=5,
    enableFlipFactor:id>=6,
    enableJackpotFactor:id>=7
  }),
  script:Object.freeze(extras.script||[]),
  requiresFlip:extras.requiresFlip||false,
  requiresZeroBreak:extras.requiresZeroBreak||false,
  lesson:extras.lesson||''
});

export const ONBOARDING_LEVELS=Object.freeze([
  make(1,'First Treasure',5,[1,22,3],3,{
    // Three real, immediately tappable cards. Any two safely reach the target.
    lesson:'Play two cards, then Bank the Pot.'
  }),
  make(2,'Left and Right',6,[3,21],2,{
    lesson:'Both directions add drops.'
  }),
  make(3,'Your Choice',5,[1,22,3],3,{
    lesson:'Choose the cards you want.'
  }),
  make(4,'Hidden Card',2,[0,21,10,12,22],2,{
    requiresFlip:true,lesson:'FLIP a hidden card.'
  }),
  make(5,'Crossing Bonus',16,[2,24],2,{
    visibleHandSlots:1,script:[steer(),steer(),bank()],
    lesson:'Cross zero for a bigger Bank.'
  }),
  make(6,'Flip Streak',10,[1,21,12],2,{
    visibleHandSlots:1,script:[steer(),flip()],
    lesson:'A safe FLIP makes this bonus grow.'
  }),
  make(7,'Jackpot Flip',40,[3,21,25],2,{
    visibleHandSlots:1,script:[steer(),flip()],
    lesson:'Cross zero on a FLIP for Jackpot.'
  }),
  make(8,'Exactly Zero',10,[2,24,1],3,{
    visibleHandSlots:1,script:[steer(),steer(),steer(),bank()],
    requiresZeroBreak:true,
    lesson:'Zero resets bonuses, not the Pot.'
  }),
  make(9,'Edge Danger',12,[1,21,4,6,22,0,20,10,31,11],3,{
    script:[steer(),steer(),bank()],
    lesson:'Beyond the edge loses the Pot.'
  }),
  make(10,'Your First Puzzle',80,[2,23,5,21,11,20,4,24,0],3,{
    lesson:'Choose when to Bank.'
  })
]);
export const ONBOARDING_COUNT=ONBOARDING_LEVELS.length;
export function onboardingLevel(id){
  const result=ONBOARDING_LEVELS[id-1];
  if(!Number.isInteger(id)||!result)throw new RangeError('Unknown onboarding level '+id);
  return result;
}
export function newOnboardingRound(levelId=1){
  const level=onboardingLevel(levelId);
  return {
    levelId,
    game:newOverswing({
      mode:'short',seed:20261104+levelId,
      deckOverride:level.deck,initialHandSize:level.initialHandSize
    }),
    snaps:0,turn:0,flipCount:0,zeroBreakCount:0,
    event:{id:0,type:'start'}
  };
}
const sameAction=(a,b)=>a.type===b.type&&
  (a.type!=='steer'||a.index===b.index)&&
  (a.type!=='bank'||a.dropIndex===b.dropIndex);
export const onboardingVictory=round=>
  round.game.deal.T>=onboardingLevel(round.levelId).target;
export const onboardingFinished=round=>{
  const level=onboardingLevel(round.levelId);
  return onboardingVictory(round)||round.snaps>=level.maxSnaps||
    round.game.status!=='playing';
};
export function onboardingActions(round){
  if(onboardingFinished(round))return [];
  const level=onboardingLevel(round.levelId);
  const scriptAction=level.script[round.turn];
  const available=overswingActions(round.game,level.rules);
  return available.filter(a=>
    (!scriptAction||sameAction(a,scriptAction))&&
    (level.showFlip||a.type!=='flip')&&
    (!(a.type==='bank')||
      (!level.requiresFlip||round.flipCount>0)&&
      (!level.requiresZeroBreak||round.zeroBreakCount>0))
  );
}
export function stepOnboarding(round,action){
  const level=onboardingLevel(round.levelId);
  if(!onboardingActions(round).some(a=>sameAction(a,action)))return round;
  const game=stepOverswing(round.game,action,level.rules);
  if(game===round.game)return round;
  const snapped=!!game.lastAction?.snap;
  const next={
    ...round,game,turn:round.turn+1,
    snaps:round.snaps+(snapped?1:0),
    flipCount:round.flipCount+(action.type==='flip'?1:0),
    zeroBreakCount:round.zeroBreakCount+(game.lastAction?.zeroBreak?1:0)
  };
  const type=onboardingVictory(next)?'win':snapped?'snap':
    game.lastAction?.zeroBreak?'zero_break':action.type;
  return {...next,event:{id:next.turn,type}};
}
// A real engine preview, not custom movement or Snap calculations in JSX.
export function wouldSnap(round,action){
  if(action.type!=='steer')return false;
  const level=onboardingLevel(round.levelId),id=round.game.deal.hand[action.index];
  if(id==null)return false;
  return applySwing(round.game.deal.S,round.game.deal.W,signed(id),level.rules.snapLimit).snap;
}
export function levelValidation(){
  for(const level of ONBOARDING_LEVELS){
    if(level.initialHandSize<2||level.initialHandSize>8)throw Error('Invalid hand size: '+level.id);
    if(level.deck.length<level.initialHandSize||new Set(level.deck).size!==level.deck.length)
      throw Error('Invalid deck: '+level.id);
    if(level.deck.some(id=>!Number.isInteger(id)||id<0||id>39))
      throw Error('Invalid ordinary card: '+level.id);
    if(level.target<=0)throw Error('Invalid target: '+level.id);
  }
  return true;
}
