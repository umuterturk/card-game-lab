import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,overswingActions,stepOverswing,overswingPayout} from '../src/external/engines.js';
import {royalCardsForLoadout,royalId,royalRank} from '../src/external/overswingRoyals.js';
import {
  startJourney,stepJourney,journeySeed,journeyActions,journeyRules,
  journeyCanUseWild,journeyWildBalance,recordJourneyGold,EMPTY_JOURNEY_PROGRESS
} from '../src/external/overswingJourney.js';

const action=(s,kind)=>overswingActions(s).find(a=>a.type===kind);

test('Royal summon order and suit are independent of gate index',()=>{
  const ranks=['J','Q','K'];
  for(let seed=0;seed<80;seed++){
    const r=startJourney(seed,0,1,ranks);
    const expected=royalCardsForLoadout(ranks,journeySeed(seed,0,'royals'));
    assert.deepEqual(r.encounter.engineState.deal.royalQueue,expected);
    assert.equal(r.royalSeed,journeySeed(seed,0,'royals'));
    assert.deepEqual(royalCardsForLoadout(ranks,r.royalSeed,1),expected);
    assert.deepEqual(royalCardsForLoadout(ranks,r.royalSeed,2),expected);
  }
  assert.notEqual(startJourney(111).royalSeed,startJourney(112).royalSeed);
});

test('Royal SUMMON occupies a free hand slot, preserves ordinary deck and cannot chain by default',()=>{
  let s=newOverswing({seed:1,royals:[royalId('J',0),royalId('K',1)]});
  const initial=s.deal.deck[s.deal.pos];
  assert.equal(action(s,'summon'),undefined);
  s=stepOverswing(s,{type:'steer',index:0});
  assert.ok(action(s,'summon'));
  s=stepOverswing(s,{type:'summon'});
  assert.equal(s.lastAction.card,royalId('J',0));
  assert.equal(s.deal.deck[s.deal.pos],initial);
  assert.equal(s.deal.flips,0);
  assert.equal(s.deal.plays,1);
  assert.equal(s.deal.consecutiveSummons,1);
  assert.equal(action(s,'summon'),undefined);
  const held=s.deal.hand.filter(x=>royalRank(x));
  assert.deepEqual(held,[royalId('J',0)]);
});

test('Herald increases consecutive summons from one to two without granting more Royals',()=>{
  let run=startJourney(42,0,1,['J','K']);
  const d=run.encounter.engineState.deal;
  // Free two slots, recording ordinary cards as discarded to preserve counts.
  const hand=d.hand.slice(0,-2);
  run={...run,relicIds:['herald'],encounter:{...run.encounter,
    engineState:{...run.encounter.engineState,deal:{...d,hand,discard:d.hand.slice(-2)}}}};
  assert.equal(journeyRules(run).maxConsecutiveSummons,2);
  assert.ok(journeyActions(run).some(x=>x.type==='summon'));
  run=stepJourney(run,{type:'PLAY',action:{type:'summon'}});
  assert.equal(run.encounter.engineState.deal.consecutiveSummons,1);
  assert.ok(journeyActions(run).some(x=>x.type==='summon'));
  run=stepJourney(run,{type:'PLAY',action:{type:'summon'}});
  assert.equal(run.encounter.engineState.deal.consecutiveSummons,2);
  assert.equal(run.encounter.engineState.deal.royalQueue.length,0);
  assert.equal(journeyActions(run).some(x=>x.type==='summon'),false);
});

test('FLIP crossing grows JACKPOT but never FLIP, including later streaks',()=>{
  let s=newOverswing({seed:123});
  const d=s.deal,nextIndex=d.deck.findIndex((c,i)=>i>=d.pos&&c<20&&c%10>=4);
  assert.ok(nextIndex>=d.pos);
  const deck=d.deck.slice();
  [deck[d.pos],deck[nextIndex]]=[deck[nextIndex],deck[d.pos]];
  s={...s,deal:{...d,deck,S:-3,pot:[23],plays:2,W:1,flipFactor:3,flipStreak:2,jackpotFactor:2}};
  const after=stepOverswing(s,{type:'flip'});
  assert.equal(after.lastAction.swung,true);
  assert.equal(after.deal.flipFactor,3);
  assert.equal(after.deal.flipStreak,0);
  assert.equal(after.deal.jackpotFactor,3);
  assert.equal(after.lastAction.flipTierGained,false);
});

test('Suit Resonance earns two base points for matching Pot suit on STEER',()=>{
  let s=newOverswing({seed:1});
  s={...s,deal:{...s.deal,hand:[2],pot:[0],plays:0,S:0}};
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.lastAction.resonanceGained,2);
  assert.equal(s.deal.resonancePoints,2);
  assert.equal(overswingPayout(s),6);
});

test('Holding multiple Royals requires selecting one to carry to next ordinary hand',()=>{
  const j=royalId('J',0),q=royalId('Q',1);
  let s=newOverswing({seed:9,royals:[j,q]});
  s={...s,deal:{...s.deal,hand:[j,q],royalQueue:[],
    discard:s.deal.hand.slice(),summonedRoyals:[j,q]}};
  assert.equal(overswingActions(s).filter(a=>a.type==='carry').length,2);
  s=stepOverswing(s,{type:'carry',index:0});
  assert.ok(s.deal.hand.includes(j));
  assert.ok(!s.deal.hand.includes(q));
  assert.equal(s.lastRefill.length,7);
  assert.equal(s.deal.hand.length,8);
  assert.equal(s.deal.royalQueue.length,0);
});

test('Two distinct Tactics are legal, but a repeated or third Tactic is refused',()=>{
  let run=startJourney(334,0,1,['J'],{wildInventory:{shuffle:2,shield:1,polarity:1}});
  assert.ok(journeyCanUseWild(run,'shield'));
  run=stepJourney(run,{type:'USE_WILD',wildId:'shield'});
  assert.deepEqual(run.wildUsedIds,['shield']);
  const again=stepJourney(run,{type:'USE_WILD',wildId:'shield'});
  assert.strictEqual(again,run);
  run=stepJourney(run,{type:'USE_WILD',wildId:'shuffle'});
  assert.deepEqual(run.wildUsedIds,['shield','shuffle']);
  assert.equal(journeyCanUseWild(run,'polarity'),false);
  assert.strictEqual(stepJourney(run,{type:'USE_WILD',wildId:'polarity',index:0}),run);
});

test('Paid retry restores consumed Tactic, Herald, and exact Royal queue',()=>{
  let run=startJourney(886,5000,1,['J','Q'],
    {wildInventory:{shuffle:1,polarity:1,shield:1}});
  run={...run,relicIds:['herald']};
  const originalQueue=run.encounter.engineState.deal.royalQueue;
  run=stepJourney(run,{type:'USE_WILD',wildId:'shuffle'});
  assert.equal(journeyWildBalance(run).shuffle,0);
  const engine=run.encounter.engineState;
  run={...run,encounter:{...run.encounter,engineState:{...engine,deal:{...engine.deal,
    pos:engine.deal.deck.length,hand:[],pot:[0],plays:2,T:0}}}};
  run=stepJourney(run,{type:'PLAY',action:{type:'bank'}});
  assert.equal(run.phase,'retry_offer');
  const retried=stepJourney(run,{type:'BUY_RETRY'});
  assert.equal(retried.phase,'playing');
  assert.equal(retried.retryCount,1);
  assert.deepEqual(retried.relicIds,['herald']);
  assert.deepEqual(retried.encounter.engineState.deal.royalQueue,originalQueue);
  assert.deepEqual(retried.wildUsedIds,[]);
  assert.equal(journeyWildBalance(retried).shuffle,1);
  let progress={...EMPTY_JOURNEY_PROGRESS,wildInventory:{shuffle:1,polarity:1,shield:1},lifetimeGold:5000};
  progress=recordJourneyGold(progress,retried);
  assert.equal(progress.wildInventory.shuffle,1);
  assert.equal(recordJourneyGold(progress,retried).wildInventory.shuffle,1);
});
