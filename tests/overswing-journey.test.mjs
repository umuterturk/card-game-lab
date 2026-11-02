import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,overswingActions,overswingMultiplier,overswingFinal,stepOverswing,rank,signed} from '../src/external/engines.js';
import {LAST_FLAME} from '../src/external/overswingJourneyContent.js';
import {startJourney,stepJourney,journeyActions,journeyRules,journeySeed,
  offerJourneyRelics,recordJourneyProgress,EMPTY_JOURNEY_PROGRESS,isValidJourney,
  journeyRunScore,journeyEarnedGold,journeyGoldBalance,journeyRelicPrice,RELIC_PRICE_RATE,
  RETRY_PRICE_RATES,journeyRetryPrice,journeyCanRetry,recordJourneyGold,
  restoreJourneyProgress,restoreJourneyRun} from '../src/external/overswingJourney.js';

function withDeal(run,changes){
  return {...run,encounter:{...run.encounter,
    engineState:{...run.encounter.engineState,
      deal:{...run.encounter.engineState.deal,...changes}}}};
}
function atFinish(run,finalScore){
  // Unit fixture at the legal last BANK: remaining Pot contains exactly an Ace.
  const deck=run.encounter.engineState.deal.deck;
  return withDeal(run,{pos:40,hand:[],pot:[0],plays:2,T:finalScore-1});
}
function finish(run,score){
  const prepared=atFinish(run,score);
  assert.deepEqual(journeyActions(prepared),[{type:'bank'}]);
  return stepJourney(prepared,{type:'PLAY',action:{type:'bank'}});
}
function forceRelic(run,id){
  return {...run,relicIds:[id],encounter:{...run.encounter,relicUses:{}}};
}
function swapNextCard(deck,pos,id){
  const copy=deck.slice(),old=copy.indexOf(id);
  if(old<0||old===pos)return copy;
  [copy[old],copy[pos]]=[copy[pos],copy[old]];
  return copy;
}

test('journey creates three distinct deterministic decks with independent reward offer RNG',()=>{
  const seed=539,
    a=startJourney(seed),b=startJourney(seed);
  assert.deepEqual(a,b);
  assert.equal(a.phase,'playing');
  assert.equal(a.encounterId,undefined);
  assert.equal(a.encounter.encounterId,'ash_gate');
  assert.equal(a.encounter.engineState.version,13);
  assert.equal(journeySeed(seed,0,'deck'),journeySeed(seed,0,'deck'));
  assert.notEqual(journeySeed(seed,0,'deck'),journeySeed(seed,0,'rewards'));
  const first=finish(a,800);
  assert.equal(first.phase,'choosing_relic');
  assert.equal(first.offeredRelicIds.length,3);
  assert.equal(new Set(first.offeredRelicIds).size,3);
  assert.deepEqual(first.offeredRelicIds,offerJourneyRelics(first));
  assert.deepEqual(finish(b,800),first);
  const next=stepJourney(first,{type:'BUY_RELIC',relicId:first.offeredRelicIds[0]});
  const alt=stepJourney(first,{type:'BUY_RELIC',relicId:first.offeredRelicIds[1]});
  assert.equal(RELIC_PRICE_RATE,0.20);
  assert.equal(journeyRelicPrice(first),360);
  assert.equal(journeyEarnedGold(first),800);
  assert.equal(journeyGoldBalance(first),800);
  assert.equal(next.encounter.encounterId,'the_furnace');
  assert.equal(next.goldSpent,360);
  assert.equal(journeyGoldBalance(next),440);
  assert.equal(journeyRunScore(next),440);
  assert.deepEqual(next.encounter.engineState.deal.deck,alt.encounter.engineState.deal.deck,
    'relic selection must not alter subsequent deck');
  assert.equal(next.encounter.relicUses[first.offeredRelicIds[0]],undefined);
});
test('goal check waits for full deal, threshold equality wins and below fails',()=>{
  const run=startJourney(100);
  const halfway=withDeal(run,{T:3000});
  assert.equal(halfway.phase,'playing');
  assert.equal(halfway.encounter.engineState.status,'playing');
  assert.equal(finish(startJourney(100),799).phase,'retry_offer');
  const passed=finish(startJourney(100),800);
  assert.equal(passed.phase,'choosing_relic');
  assert.equal(passed.completedEncounters[0].finalScore,800);
  assert.equal(passed.completedEncounters[0].target,800);
  assert.strictEqual(stepJourney(passed,{type:'PLAY',action:{type:'flip'}}),passed);
  assert.strictEqual(stepJourney(passed,{type:'BUY_RELIC',relicId:'unknown'}),passed);
  assert.strictEqual(stepJourney(passed,{type:'CHOOSE_RELIC',relicId:passed.offeredRelicIds[0]}),passed,'legacy free-choice command cannot bypass the price');
  const chosen=stepJourney(passed,{type:'BUY_RELIC',relicId:passed.offeredRelicIds[0]});
  assert.strictEqual(stepJourney(chosen,{type:'BUY_RELIC',relicId:passed.offeredRelicIds[1]}),chosen);
});
test('shop never grants unpaid relics and SKIP advances without spending',()=>{
  const ready=finish(startJourney(24),800);
  const poor={...ready,goldSpent:800,treasuryEvents:[
    ...ready.treasuryEvents,{id:'test-expense',amount:-800,lifetimeDelta:0}]};
  assert.equal(poor.phase,'choosing_relic');
  assert.equal(journeyGoldBalance(poor),0);
  const refused=stepJourney(poor,{type:'BUY_RELIC',relicId:poor.offeredRelicIds[0]});
  assert.strictEqual(refused,poor);
  const skip=stepJourney(poor,{type:'SKIP_RELIC'});
  assert.equal(skip.phase,'playing');
  assert.equal(skip.encounter.encounterId,'the_furnace');
  assert.deepEqual(skip.relicIds,[]);
  assert.equal(skip.goldSpent,800);
  assert.strictEqual(stepJourney(skip,{type:'BUY_RELIC',relicId:poor.offeredRelicIds[0]}),skip);
  assert.strictEqual(stepJourney(skip,{type:'SKIP_RELIC'}),skip);
});
test('shop prices scale with next gate targets, including lifetime Gold tiers',()=>{
  for(const [lifetimeGold,first,second] of [
    [0,360,600],[40000,380,630],[100000,400,660],[180000,410,690]]){
    let run=finish(startJourney(71,lifetimeGold),Math.ceil(first*3));
    assert.equal(journeyRelicPrice(run),first);
    run=stepJourney(run,{type:'SKIP_RELIC'});
    run=finish(run,Math.ceil(second*3));
    assert.equal(journeyRelicPrice(run),second);
    const buy=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
    assert.equal(buy.goldSpent,second);
    assert.equal(journeyRunScore(buy),journeyEarnedGold(buy)-second);
    assert.equal(journeyGoldBalance(buy),journeyEarnedGold(buy)-second);
    assert.equal(buy.relicIds.length,1);
    const stored=JSON.parse(JSON.stringify(buy));
    assert.ok(isValidJourney(stored));
    assert.deepEqual(stored,buy);
  }
});
test('purchases never reduce cleared gate score or lifetime banked Gold',()=>{
  let run=finish(startJourney(91),800);
  const before=run.completedEncounters[0];
  const bought=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
  assert.deepEqual(bought.completedEncounters[0],before);
  assert.equal(bought.completedEncounters[0].passed,true);
  assert.equal(journeyRunScore(bought),journeyRunScore(run)-360);
  assert.equal(bought.goldSpent,360);
  assert.strictEqual(stepJourney(bought,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]}),bought);
  assert.equal(recordJourneyProgress(EMPTY_JOURNEY_PROGRESS,stepJourney(bought,{type:'ABANDON'})).bestRunScore,440);
});
test('steady hand consumes once only on noncrossing STEER; ordinary quick play unchanged',()=>{
  let run=forceRelic(startJourney(22),'steady_hand');
  run=withDeal(run,{S:4,W:3,plays:2,hand:[0,1,2],pot:[3]});
  const before=run.encounter.engineState;
  let n=stepJourney(run,{type:'PLAY',action:{type:'steer',index:0}});
  assert.equal(n.encounter.engineState.deal.W,3);
  assert.equal(n.encounter.relicUses.steady_hand,1);
  assert.deepEqual(n.encounter.engineState.lastAction.modifiersApplied,['steady_hand']);
  n=stepJourney(n,{type:'PLAY',action:{type:'steer',index:0}});
  assert.equal(n.encounter.engineState.deal.W,2);
  assert.equal(n.encounter.relicUses.steady_hand,1);
  assert.equal(stepOverswing(before,{type:'steer',index:0}).deal.W,2);
});
test('jackpot spark adds one extra linear tier on first FLIP crossing only',()=>{
  let run=forceRelic(startJourney(43),'jackpot_spark');
  const deal=run.encounter.engineState.deal;
  run=withDeal(run,{S:-2,plays:1,deck:swapNextCard(deal.deck,deal.pos,4),pot:[30]}); // +5: -2 → +3
  let n=stepJourney(run,{type:'PLAY',action:{type:'flip'}});
  assert.equal(n.encounter.engineState.deal.jackpotFactor,3);
  assert.equal(n.encounter.relicUses.jackpot_spark,1);
  let deck=n.encounter.engineState.deal.deck,pos=n.encounter.engineState.deal.pos;
  n=withDeal(n,{S:-2,deck:swapNextCard(deck,pos,5)}); // another crossing
  const n2=stepJourney(n,{type:'PLAY',action:{type:'flip'}});
  assert.equal(n2.encounter.engineState.deal.jackpotFactor,4,'second crossing adds just one');
});
test('swing coil triggers only on strict STEER crossing, not on exact zero',()=>{
  let run=forceRelic(startJourney(39),'swing_coil');
  run=withDeal(run,{S:4,W:0,plays:2,hand:[23,27],pot:[3]}); // -4: zero break
  let n=stepJourney(run,{type:'PLAY',action:{type:'steer',index:0}});
  assert.equal(n.encounter.engineState.deal.S,0);
  assert.equal(n.encounter.relicUses.swing_coil,undefined);
  n=withDeal(n,{S:4,hand:[27]}); // -8 cross: +4 → -4
  n=stepJourney(n,{type:'PLAY',action:{type:'steer',index:0}});
  assert.equal(n.encounter.engineState.deal.W,2,'base +1 and extra +1');
  assert.equal(n.encounter.relicUses.swing_coil,1);
});
test('vault seal preserves capacity and changes legal BANK action shape',()=>{
  let run=forceRelic(startJourney(31),'vault_seal');
  const hand=run.encounter.engineState.deal.hand;
  run=withDeal(run,{pot:[30],plays:2,hand,handCap:8});
  assert.deepEqual(journeyActions(run),[
    {type:'flip'},...hand.map((_,index)=>({type:'steer',index})),{type:'bank'}
  ]);
  let n=stepJourney(run,{type:'PLAY',action:{type:'bank'}});
  assert.equal(n.encounter.engineState.deal.handCap,8);
  assert.equal(n.encounter.relicUses.vault_seal,1);
  n=withDeal(n,{pot:[30],plays:2});
  assert.equal(journeyActions(n).filter(x=>x.type==='bank').length,8);
  const bank=journeyActions(n).find(x=>x.type==='bank');
  n=stepJourney(n,{type:'PLAY',action:bank});
  assert.equal(n.encounter.engineState.deal.handCap,7);
});
test('boss SNAP increases target 200, while earlier stages stay unchanged',()=>{
  let run=startJourney(777);
  run=finish(run,800);
  run=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
  run=finish(run,1800);
  assert.equal(journeyRelicPrice(run),600);
  assert.equal(journeyGoldBalance(run),2240);
  run=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
  assert.equal(run.goldSpent,960);
  assert.equal(run.encounter.encounterId,'ember_keeper');
  assert.equal(run.encounter.effectiveTarget,3000);
  const d=run.encounter.engineState.deal;
  const red=Array.from({length:40},(_,i)=>i).find(id=>
    Math.floor(id/10)<2&&rank(id)>=2&&d.deck.indexOf(id)>=d.pos);
  assert.notEqual(red,undefined);
  run=withDeal(run,{S:9,plays:2,deck:swapNextCard(d.deck,d.pos,red),pot:[30]});
  const snapped=stepJourney(run,{type:'PLAY',action:{type:'flip'}});
  assert.equal(snapped.encounter.snapCount,1);
  assert.equal(snapped.encounter.effectiveTarget,3200);
  assert.equal(snapped.encounter.engineState.deal.pot.length,0);
  assert.equal(finish(snapped,3199).phase,'retry_offer');
  assert.equal(finish(snapped,3200).phase,'won');
});
test('run progress and terminal commands are idempotent; persisted JSON is resumable',()=>{
  const start=startJourney(991);
  const loaded=JSON.parse(JSON.stringify(start));
  assert.deepEqual(loaded,start);
  assert.ok(isValidJourney(loaded));
  const wonEarly=finish(start,800);
  const run=stepJourney(wonEarly,{type:'ABANDON'});
  const profile=recordJourneyProgress(EMPTY_JOURNEY_PROGRESS,run);
  assert.equal(profile.totalRuns,1);
  assert.strictEqual(recordJourneyProgress(profile,run),profile);
  assert.strictEqual(stepJourney(run,{type:'PLAY',action:{type:'flip'}}),run);
  assert.strictEqual(stepJourney(run,{type:'BUY_RELIC',relicId:'steady_hand'}),run);
  assert.equal(profile.wins,0);
  assert.equal(profile.bestRunScore,800);
});
test('three retry prices are linear percentages, per-gate, deterministic and capped',()=>{
  assert.deepEqual(RETRY_PRICE_RATES,[0.25,0.35,0.50]);
  let run=finish(startJourney(2001,0,1,5000),799);
  assert.equal(run.phase,'retry_offer');
  assert.equal(journeyEarnedGold(run),0,'failed gate Gold is forfeited');
  assert.equal(journeyGoldBalance(run),5000);
  for(const [index,price] of [200,280,400].entries()){
    assert.equal(journeyRetryPrice(run),price);
    assert.equal(journeyCanRetry(run),true);
    const previous=run,spentBefore=run.goldSpent;
    run=stepJourney(run,{type:'BUY_RETRY'});
    assert.equal(run.retryCount,index+1);
    assert.equal(run.goldSpent,spentBefore+price);
    assert.equal(run.retryGoldSpent,run.goldSpent);
    assert.equal(run.encounter.engineState.deal.T,0);
    assert.deepEqual(run.encounter.relicUses,{});
    assert.deepEqual(run.completedEncounters,[]);
    assert.notDeepEqual(run.encounter.engineState.deal.deck,previous.encounter.engineState.deal.deck);
    assert.deepEqual(stepJourney(previous,{type:'BUY_RETRY'}),run,
      'same initial state and retry number produce the same attempt');
    run=finish(run,700);
  }
  assert.equal(run.retryCount,3);
  assert.equal(run.phase,'retry_offer');
  assert.equal(journeyCanRetry(run),false);
  assert.equal(journeyRetryPrice(run),0);
  assert.strictEqual(stepJourney(run,{type:'BUY_RETRY'}),run);
  assert.equal(journeyGoldBalance(run),4120);
  const lost=stepJourney(run,{type:'ACCEPT_DEFEAT'});
  assert.equal(lost.phase,'lost');
  assert.strictEqual(stepJourney(lost,{type:'ACCEPT_DEFEAT'}),lost);
  assert.equal(recordJourneyProgress(EMPTY_JOURNEY_PROGRESS,run).totalRuns,0,
    'a pending retry offer must not finalize the journey');
  assert.equal(recordJourneyProgress(EMPTY_JOURNEY_PROGRESS,lost).totalRuns,1);
});
test('affordability prevents retries without Treasury Gold and prices scale without SNAP tax',()=>{
  const broke=finish(startJourney(2002),799);
  assert.equal(journeyRetryPrice(broke),200);
  assert.equal(journeyCanRetry(broke),false);
  assert.strictEqual(stepJourney(broke,{type:'BUY_RETRY'}),broke);
  const expensive=startJourney(2003,180000,12,10000);
  const fakeBoss={...expensive,phase:'retry_offer',encounterIndex:2,
    encounter:{...expensive.encounter,encounterId:'ember_keeper',effectiveTarget:99999},
    completedEncounters:[{id:'ember_keeper',finalScore:2000,target:99999,passed:false}]};
  assert.equal(journeyRetryPrice(fakeBoss),1000);
  assert.equal(journeyRetryPrice({...fakeBoss,encounter:{
    ...fakeBoss.encounter,effectiveTarget:3000}}),1000,
    'SNAP target penalties must not change retry price');
});
test('failed BANKs never credit lifetime Gold; cleared gates deposit exactly once',()=>{
  const oldProgress={...EMPTY_JOURNEY_PROGRESS,treasuryGold:1200};
  let run=finish(startJourney(2004,0,1,1200),799);
  assert.strictEqual(recordJourneyGold(oldProgress,run),oldProgress);
  run=stepJourney(run,{type:'BUY_RETRY'});
  let progress=recordJourneyGold(oldProgress,run);
  assert.equal(progress.treasuryGold,1000);
  assert.equal(progress.lifetimeGold,0);
  assert.strictEqual(recordJourneyGold(progress,run),progress);
  run=finish(run,800);
  assert.equal(run.phase,'choosing_relic');
  progress=recordJourneyGold(progress,run);
  assert.equal(progress.treasuryGold,1800);
  assert.equal(progress.lifetimeGold,800);
  assert.equal(journeyEarnedGold(run),800);
  assert.equal(journeyRunScore(run),600);
  assert.strictEqual(recordJourneyGold(progress,JSON.parse(JSON.stringify(run))),progress);
  const bought=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
  progress=recordJourneyGold(progress,bought);
  assert.equal(progress.treasuryGold,1440);
  assert.equal(progress.lifetimeGold,800,'buying a relic does not reverse unlock progress');
  assert.strictEqual(recordJourneyGold(progress,bought),progress);
  const nextJourney=startJourney(2005,progress.lifetimeGold,1,progress.treasuryGold);
  assert.equal(journeyGoldBalance(nextJourney),1440,'Treasury survives across journeys');
});
test('retry preserves passed gates and relics, then resets retry count at next gate',()=>{
  let run=finish(startJourney(2006),800);
  const first=run.completedEncounters[0];
  run=stepJourney(run,{type:'BUY_RELIC',relicId:run.offeredRelicIds[0]});
  const relicId=run.relicIds[0];
  run=finish(run,1000);
  assert.equal(run.phase,'retry_offer');
  assert.equal(journeyGoldBalance(run),440,'failed Furnace does not deposit its score');
  assert.equal(journeyRetryPrice(run),450);
  assert.equal(journeyCanRetry(run),false,'remaining Gold cannot be borrowed');
  // A player with previously saved Treasury can afford the same retry.
  let rich=finish(startJourney(2007,0,1,1000),800);
  rich=stepJourney(rich,{type:'BUY_RELIC',relicId:rich.offeredRelicIds[0]});
  rich=finish(rich,1500);
  const before=rich.completedEncounters[0],keptRelic=rich.relicIds[0];
  rich=stepJourney(rich,{type:'BUY_RETRY'});
  assert.equal(rich.phase,'playing');
  assert.equal(rich.encounterIndex,1);
  assert.equal(rich.retryCount,1);
  assert.equal(rich.completedEncounters.length,1);
  assert.deepEqual(rich.completedEncounters[0],before);
  assert.ok(rich.relicIds.includes(keptRelic));
  assert.deepEqual(rich.encounter.relicUses,{},'relic charges recharge on retries');
  rich=finish(rich,1800);
  assert.equal(rich.phase,'choosing_relic');
  rich=stepJourney(rich,{type:'SKIP_RELIC'});
  assert.equal(rich.encounterIndex,2);
  assert.equal(rich.retryCount,0);
  assert.equal(journeyRetryPrice({...rich,phase:'retry_offer'}),750);
  assert.deepEqual(run.completedEncounters[0],first);
  assert.ok(run.relicIds.includes(relicId));
});
test('legacy saves keep unlocked Royals, and in-progress gate earnings are not double counted',()=>{
  const legacy={...EMPTY_JOURNEY_PROGRESS,schemaVersion:1,lifetimeGold:100000,
    creditedBankIds:['legacy'],treasuryGold:undefined,creditedTreasuryEventIds:undefined};
  const upgraded=restoreJourneyProgress(legacy);
  assert.equal(upgraded.lifetimeGold,100000);
  assert.equal(upgraded.treasuryGold,0);
  assert.equal(upgraded.schemaVersion,2);
  assert.equal(upgraded.creditedBankIds,undefined);
  const cleared=finish(startJourney(2010),800);
  const oldRun={...cleared,schemaVersion:1,treasuryStart:undefined,
    treasuryEvents:undefined,retryGoldSpent:undefined,retryCount:undefined};
  const restored=restoreJourneyRun(oldRun,0);
  assert.ok(isValidJourney(restored));
  const funded=recordJourneyGold(upgraded,restored);
  assert.equal(funded.treasuryGold,800);
  assert.equal(funded.lifetimeGold,100000);
  assert.strictEqual(recordJourneyGold(funded,restored),funded);
});
test('full real deck play terminates, each card is conserved; Journey never bypasses engine',()=>{
  for(let seed=1;seed<=25;seed++){
    let run=startJourney(seed),count=0;
    while(run.phase==='playing'&&count++<150){
      const d=run.encounter.engineState.deal;
      assert.equal(40-d.pos+d.hand.length+d.pot.length+d.discard.length,40);
      const actions=journeyActions(run),bank=actions.find(x=>x.type==='bank');
      const choice=bank&&count%3===0?bank:
        actions.find(x=>x.type==='flip')||actions.find(x=>x.type==='steer')||bank;
      assert.ok(choice);
      const next=stepJourney(run,{type:'PLAY',action:choice});
      assert.notStrictEqual(next,run);run=next;
    }
    assert.ok(count<150);
    assert.notEqual(run.phase,'playing');
    assert.equal(run.completedEncounters.length,1);
    assert.equal(run.completedEncounters[0].finalScore,overswingFinal(run.encounter.engineState));
  }
});
