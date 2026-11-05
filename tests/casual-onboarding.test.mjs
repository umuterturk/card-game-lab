import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_LEVELS,ONBOARDING_COUNT,levelValidation,onboardingLevel,
  newOnboardingRound,onboardingActions,stepOnboarding,onboardingVictory,
  onboardingFinished,wouldSnap
} from '../src/casual/onboardingLevels.js';
import {signed,newOverswing,stepOverswing,overswingPayout} from '../src/external/engines.js';

const steer=index=>({type:'steer',index});
const flip={type:'flip'},bank={type:'bank'};
function play(level,actions){
  let state=newOnboardingRound(level);
  for(const action of actions){
    const next=stepOnboarding(state,action);
    assert.notStrictEqual(next,state,`Level ${level} rejected ${JSON.stringify(action)} on turn ${state.turn}`);
    state=next;
  }
  return state;
}
const factorValues=round=>{
  const d=round.game.deal;
  return [d.W+1,d.flipFactor,d.jackpotFactor];
};

test('ten validated levels progressively unlock only taught controls',()=>{
  assert.equal(levelValidation(),true);
  assert.equal(ONBOARDING_COUNT,10);
  for(const level of ONBOARDING_LEVELS){
    assert.equal(onboardingLevel(level.id),level);
    assert.equal(level.showMeter,true);
    assert.equal(level.showFlip,level.id>=4);
    assert.equal(level.showChances,level.id>=9);
    assert.equal(level.visibleFactors.length,Math.max(0,Math.min(3,level.id-4)));
    assert.equal(level.rules.enableSwingFactor,level.id>=5);
    assert.equal(level.rules.enableFlipFactor,level.id>=6);
    assert.equal(level.rules.enableJackpotFactor,level.id>=7);
    assert.equal(level.rules.enableResonance,false);
  }
});

test('Level 1: full three-card hand, meter and two-choice Bank finish without Snap',()=>{
  const level=onboardingLevel(1);
  assert.equal(level.showMeter,true);
  assert.equal(level.showFlip,false);
  assert.deepEqual(level.visibleFactors,[]);
  assert.equal(level.initialHandSize,3);
  assert.equal(level.visibleHandSlots,3);
  const start=newOnboardingRound(1);
  assert.deepEqual(start.game.deal.hand.map(signed),[2,-3,4]);
  assert.deepEqual(onboardingActions(start),[steer(0),steer(1),steer(2)]);
  assert.strictEqual(stepOnboarding(start,flip),start);
  assert.strictEqual(stepOnboarding(start,bank),start);
  for(const first of [0,1,2])for(const second of [0,1]){
    let s=stepOnboarding(start,steer(first));
    assert.equal(s.game.deal.T,0,'Cards must only enter pending Pot');
    assert.equal(s.game.deal.pot.length,1);
    assert.deepEqual(onboardingActions(s),[steer(0),steer(1)]);
    s=stepOnboarding(s,steer(second));
    assert.equal(s.snaps,0,'No first-level card choice may cause Snap');
    assert.deepEqual(factorValues(s),[1,1,1]);
    assert.equal(s.game.deal.pot.length,2);
    assert.ok(overswingPayout(s.game,level.rules)>=level.target);
    assert.ok(onboardingActions(s).some(action=>action.type==='bank'));
    s=stepOnboarding(s,bank);
    assert.ok(s.game.deal.T>=level.target);
    assert.equal(s.game.deal.pot.length,0);
    assert.equal(onboardingVictory(s),true);
    assert.equal(onboardingFinished(s),true);
    assert.equal(s.turn,3);
  }
});

test('Level 2: positive moves right, negative moves left and both add positive Pot',()=>{
  let s=newOnboardingRound(2);
  s=stepOnboarding(s,steer(0));
  assert.equal(s.game.deal.S,4);
  s=stepOnboarding(s,steer(0));
  assert.equal(s.game.deal.S,2);
  assert.deepEqual(s.game.deal.pot.map(id=>Math.abs(signed(id))),[4,2]);
  s=stepOnboarding(s,bank);
  assert.equal(s.game.deal.T,6);
  assert.equal(onboardingVictory(s),true);
});

test('Level 3: every two-card choice can BANK and win; no invisible factor changes',()=>{
  const initial=newOnboardingRound(3);
  assert.equal(initial.game.deal.hand.length,3);
  for(const i of [0,1,2])for(const j of [0,1]){
    let s=stepOnboarding(initial,steer(i));
    s=stepOnboarding(s,steer(j));
    assert.equal(factorValues(s).join(','),'1,1,1');
    assert.equal(onboardingActions(s).some(a=>a.type==='bank'),true);
    s=stepOnboarding(s,bank);
    assert.equal(onboardingVictory(s),true,`choice ${i} then ${j}`);
  }
});

test('Level 4: banking requires a real Flip but no multipliers are secretly earned',()=>{
  let s=newOnboardingRound(4);
  assert.equal(onboardingActions(s).some(a=>a.type==='flip'),true);
  s=stepOnboarding(s,steer(0));
  s=stepOnboarding(s,steer(0));
  assert.equal(onboardingActions(s).some(a=>a.type==='bank'),false);
  s=stepOnboarding(s,flip);
  assert.equal(s.flipCount,1);
  assert.deepEqual(factorValues(s),[1,1,1]);
  assert.equal(s.game.deal.resonancePoints,0);
  s=stepOnboarding(s,bank);
  assert.equal(onboardingVictory(s),true);
});

test('Level 5: crossing awards only visible Swing ×2',()=>{
  let s=play(5,[steer(0),steer(0)]);
  assert.deepEqual(factorValues(s),[2,1,1]);
  assert.equal(s.game.lastAction.swung,true);
  assert.equal(overswingPayout(s.game,onboardingLevel(5).rules),16);
  s=stepOnboarding(s,bank);
  assert.equal(onboardingVictory(s),true);
});

test('Level 6: non-crossing Flip awards only its unlocked factor',()=>{
  let s=play(6,[steer(0),flip]);
  assert.deepEqual(factorValues(s),[1,2,1]);
  assert.equal(s.game.lastAction.flipTierGained,true);
  assert.equal(onboardingVictory(stepOnboarding(s,bank)),true);
});

test('Level 7: crossing Flip earns Swing and Jackpot, not Flip',()=>{
  let s=play(7,[steer(0),flip]);
  assert.deepEqual(factorValues(s),[2,1,2]);
  assert.equal(s.game.lastAction.jackpotTierGained,true);
  assert.equal(onboardingVictory(stepOnboarding(s,bank)),true);
});

test('Level 8: exact zero keeps Pot, resets factors, and permits bank only after Zero Break',()=>{
  let s=play(8,[steer(0),steer(0)]);
  assert.deepEqual(factorValues(s),[2,1,1]);
  assert.equal(onboardingActions(s).some(a=>a.type==='bank'),false);
  s=stepOnboarding(s,steer(0));
  assert.equal(s.game.lastAction.zeroBreak,true);
  assert.equal(s.zeroBreakCount,1);
  assert.equal(s.game.deal.S,0);
  assert.deepEqual(factorValues(s),[1,1,1]);
  assert.deepEqual(s.game.deal.pot.map(id=>Math.abs(signed(id))),[3,5,2]);
  s=stepOnboarding(s,bank);
  assert.equal(s.game.deal.T,10);
  assert.equal(onboardingVictory(s),true);
});

test('Level 9: optional Snap loses pending Pot but never already secured gold; recovery works',()=>{
  let s=play(9,[steer(0),steer(0),bank,steer(0)]);
  assert.equal(s.game.deal.T,4);
  assert.equal(s.game.deal.S,5);
  assert.equal(wouldSnap(s,steer(0)),true);
  assert.equal(wouldSnap(s,steer(1)),false);
  const safe=play(9,[steer(0),steer(0),bank,steer(0),steer(1),bank]);
  assert.equal(safe.game.deal.T,12);
  assert.equal(onboardingVictory(safe),true);
  s=stepOnboarding(s,steer(0));
  assert.equal(s.event.type,'snap');
  assert.equal(s.snaps,1);
  assert.equal(s.game.deal.T,4);
  assert.equal(s.game.deal.pot.length,0);
  s=playFrom(s,[flip,steer(0),bank]);
  assert.equal(s.game.deal.T,12);
  assert.equal(onboardingVictory(s),true);
});
function playFrom(round,actions){
  for(const action of actions){
    const next=stepOnboarding(round,action);
    assert.notStrictEqual(next,round,`Rejected recovery action: ${JSON.stringify(action)}`);
    round=next;
  }
  return round;
}

test('Level 10: unguided strategy choice, both a Steer and Flip opening can win',()=>{
  const initial=newOnboardingRound(10);
  assert.equal(onboardingActions(initial).filter(a=>a.type==='steer').length,3);
  assert.equal(onboardingActions(initial).some(a=>a.type==='flip'),true);
  const pathA=play(10,[steer(0),steer(0),bank,flip,steer(0),flip,bank]);
  const pathB=play(10,[flip,flip,flip,flip,flip,bank]);
  assert.equal(onboardingVictory(pathA),true);
  assert.equal(onboardingVictory(pathB),true);
  assert.equal(pathA.turn>=6,true);
  assert.equal(pathB.turn>=6,true);
});

test('Tutorial-only gates preserve default Overswing scoring when not selected',()=>{
  const deck=[1,12,23,2,10,21];
  const base={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true};
  const enabled={...base,enableSwingFactor:true,enableFlipFactor:true,
    enableJackpotFactor:true,enableResonance:true};
  let a=newOverswing({seed:8,deckOverride:deck,initialHandSize:2});
  let b=newOverswing({seed:8,deckOverride:deck,initialHandSize:2});
  for(const action of [steer(0),flip,flip,bank]){
    a=stepOverswing(a,action,base);
    b=stepOverswing(b,action,enabled);
    assert.deepEqual(a,b,'Default rules must be unchanged by added toggles');
  }
  let noResonance=newOverswing({deckOverride:[1,2],initialHandSize:2});
  noResonance=stepOverswing(noResonance,steer(0),{...base,enableResonance:false});
  noResonance=stepOverswing(noResonance,steer(0),{...base,enableResonance:false});
  assert.equal(noResonance.deal.resonancePoints,0);
});
import {simulateOnboardingLevel} from '../scripts/simulate-casual-onboarding.mjs';

test('deterministic state explorer finds wins for all ten levels and no early dead ends',()=>{
  for(let id=1;id<=ONBOARDING_COUNT;id++){
    const report=simulateOnboardingLevel(id,{maxStates:25000,maxDepth:16});
    assert.ok(report.shortestWin,'No winning path for level '+id);
    assert.ok(report.wins>0,'No winning terminal for level '+id);
    if(id<=3){
      assert.equal(report.failedEnds,0,'An early level can fail: '+id);
      assert.equal(report.deadEnds,0,'An early level can dead-end: '+id);
      assert.equal(report.truncated,false,'Early level was not exhaustively checked: '+id);
    }
  }
});


test('First screen always renders header, meter, hand, Pot, Bank destination and Bank action',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/casual/SimplifiedGame.jsx',import.meta.url),'utf8');
  assert.match(source,/<header className="sgv-hud sgv-tutorial-hud">/);
  assert.match(source,/<HorizontalMeter position=\{view\.position\}/);
  assert.doesNotMatch(source,/level\.showMeter\s*\?/);
  assert.match(source,/<PendingPot value=\{potDisplay\}/);
  assert.doesNotMatch(source,/sgv-pot-dormant/);
  assert.match(source,/<GlassChest banked=\{shownGold\}/);
  assert.match(source,/<SimpleCard key=\{id\}/);
  assert.match(source,/className=\{'sgv-action sgv-bank sgv-bank-command'/);
  assert.match(source,/const shownHand=deal\.hand\.slice/);
});
