import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newOverswing,stepOverswing,overswingActions,overswingPayout,
  overswingMultiplier,applySwing
} from '../src/external/engines.js';
import {
  startJourney,journeyRules,journeyActions,stepJourney,
  recordJourneyProgress,EMPTY_JOURNEY_PROGRESS,isValidJourney,journeyRelicPrice
} from '../src/external/overswingJourney.js';
import {
  CAMPAIGN_LEVELS,campaignLevel,campaignNextLevel,campaignRuleLabels
} from '../src/external/overswingCampaign.js';

test('safe noncrossing FLIP consumes one SWING tier, never below x1',()=>{
  const source=newOverswing({seed:11});
  // The next ordinary FLIP is positive: start positive to avoid crossing.
  const next=source.deal.deck[source.deal.pos];
  const positive=Math.floor(next/10)<2;
  const S=positive?2:-2;
  const state={...source,deal:{...source.deal,S,W:3,plays:2,pot:[30]}};
  const after=stepOverswing(state,{type:'flip'});
  assert.equal(after.lastAction.snap,false);
  assert.equal(after.lastAction.swung,false);
  assert.equal(after.deal.W,2);
  assert.equal(after.lastAction.swingPenalty,true);
  assert.equal(after.deal.pot.length,2,'safe noncross FLIP still enters Pot');
  assert.equal(after.deal.flipFactor,2,'the FLIP multiplier still grows');
  const alreadyZero={...source,deal:{...source.deal,S,W:0}};
  assert.equal(stepOverswing(alreadyZero,{type:'flip'}).deal.W,0);
});

test('crossing FLIP earns SWING without noncross penalty',()=>{
  const s=newOverswing({seed:17}),id=s.deal.deck[s.deal.pos];
  const value=(Math.floor(id/10)<2?1:-1)*(id%10+1);
  const before=value>0?-1:1;
  const to=before+value;
  if(to===0)return; // exact-zero has its own reset test
  const state={...s,deal:{...s.deal,S:before,W:3}};
  const after=stepOverswing(state,{type:'flip'});
  assert.equal(after.deal.W,4);
  assert.equal(after.lastAction.swingPenalty,false);
  assert.equal(after.lastAction.swung,true);
});
test('exact-zero FLIP resets all multipliers and keeps Pot',()=>{
  const s=newOverswing({seed:12});
  const id=s.deal.deck[s.deal.pos],value=(Math.floor(id/10)<2?1:-1)*(id%10+1);
  const state={...s,deal:{...s.deal,S:-value,W:4,flipFactor:4,jackpotFactor:3,pot:[0]}};
  const after=stepOverswing(state,{type:'flip'});
  assert.equal(after.lastAction.zeroBreak,true);
  assert.equal(after.deal.W,0);
  assert.equal(after.deal.flipFactor,1);
  assert.equal(after.deal.jackpotFactor,1);
  assert.equal(after.deal.pot.length,2);
});

test('level map is sequential, persistent and old victories unlock level 2',()=>{
  assert.equal(CAMPAIGN_LEVELS.length,12);
  assert.equal(campaignNextLevel([]),1);
  assert.equal(campaignNextLevel(['last_flame_v1']),2);
  let progress=EMPTY_JOURNEY_PROGRESS;
  for(let number=1;number<=12;number++){
    assert.equal(campaignNextLevel(progress.clearedChapterIds),number);
    const won={...startJourney(300+number,0,number),phase:'won'};
    assert.ok(isValidJourney(won));
    progress=recordJourneyProgress(progress,won);
    assert.ok(progress.clearedChapterIds.includes(campaignLevel(number).id));
    assert.equal(campaignNextLevel(progress.clearedChapterIds),Math.min(number+1,12));
  }
  assert.equal(progress.wins,12);
});
test('map publishes initial hand, pendulum, flip cap and bank tax constraints',()=>{
  assert.deepEqual(campaignRuleLabels(campaignLevel(1)),['STANDARD RULES']);
  assert.ok(campaignRuleLabels(campaignLevel(2)).includes('HAND 7'));
  assert.ok(campaignRuleLabels(campaignLevel(3)).includes('SNAP ±9'));
  assert.ok(campaignRuleLabels(campaignLevel(4)).includes('FLIP ≤18'));
  assert.ok(campaignRuleLabels(campaignLevel(5)).includes('BANK TAX 5%'));
  assert.ok(campaignRuleLabels(campaignLevel(12)).includes('BANK TAX 15%'));
  assert.throws(()=>startJourney(1,0,13),RangeError);
});
test('hand capacity and target rules are applied at level start',()=>{
  const s=startJourney(41,0,6);
  assert.equal(s.levelNumber,6);
  assert.equal(s.encounter.engineState.deal.handCap,6);
  assert.equal(s.encounter.engineState.deal.hand.length,6);
  assert.equal(s.encounter.engineState.deal.pos,6);
  assert.equal(s.encounter.engineState.deal.deck.length,40);
  assert.equal(s.encounter.effectiveTarget,Math.round(800*campaignLevel(6).targetScale));
  assert.equal(startJourney(41,0).encounter.engineState.deal.hand.length,8);
});
test('SNAP limit affects real engine and dynamic action outcome',()=>{
  assert.equal(applySwing(7,0,2,8).snap,true);
  assert.equal(applySwing(7,0,2,10).snap,false);
  const s=newOverswing({seed:1}),d=s.deal;
  const state={...s,deal:{...d,S:7,hand:[1],pot:[30],plays:2}};
  const rule=journeyRules(startJourney(2,0,7));
  assert.equal(rule.snapLimit,8);
  const result=stepOverswing(state,{type:'steer',index:0},rule);
  assert.equal(result.lastAction.snap,true);
  assert.equal(result.deal.pot.length,0);
});
test('FLIP cap prevents additional FLIPs but allows STEER, BANK and termination',()=>{
  const rules=journeyRules(startJourney(1,0,4));
  assert.equal(rules.maxFlips,18);
  const s=newOverswing({seed:5}),d=s.deal;
  const state={...s,deal:{...d,flips:18,S:3,pot:[30],plays:2}};
  const legal=overswingActions(state,rules);
  assert.ok(!legal.some(a=>a.type==='flip'));
  assert.ok(legal.some(a=>a.type==='steer'));
  assert.ok(legal.some(a=>a.type==='bank'));
  assert.strictEqual(stepOverswing(state,{type:'flip'},rules),state);
});
test('BANK tax reduces deposited Gold and matches forecast precisely',()=>{
  const rules=journeyRules(startJourney(21,0,9));
  assert.equal(rules.bankTax,10);
  const s=newOverswing({seed:21});
  const state={...s,deal:{...s.deal,pot:[0,1],plays:2,W:1,
    hand:s.deal.hand.slice(0,3),handCap:4}};
  const raw=overswingPayout(state);
  assert.equal(raw,6);
  assert.equal(overswingPayout(state,rules),5);
  const bank=stepOverswing(state,{type:'bank'},rules);
  assert.equal(bank.lastAction.points,5);
  assert.equal(bank.lastAction.gross,6);
  assert.equal(bank.lastAction.taxPaid,1);
  assert.equal(bank.deal.T,5);
});
test('relic purchases scale with map level and modifier survives shop progression',()=>{
  const normal=startJourney(5),advanced=startJourney(5,0,12);
  assert.ok(journeyRelicPrice({...advanced,encounterIndex:0})>journeyRelicPrice({...normal,encounterIndex:0}));
  assert.deepEqual(journeyRules(advanced).snapLimit,8);
  assert.equal(journeyRules(advanced).bankTax,15);
  assert.equal(journeyRules(advanced).maxFlips,12);
  const draft={...advanced,phase:'choosing_relic',offeredRelicIds:['steady_hand'],
    completedEncounters:[{id:'ash_gate',finalScore:2000,passed:true,target:1500}]};
  const next=stepJourney(draft,{type:'SKIP_RELIC'});
  assert.equal(next.levelNumber,12);
  assert.equal(next.encounter.engineState.deal.handCap,6);
  assert.equal(journeyRules(next).snapLimit,8);
  assert.equal(next.relicIds.length,0);
});
