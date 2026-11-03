import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startJourney,stepJourney,journeyActions,journeyGoldBalance,
  journeyRelicPrice,offerJourneyRelics,journeyRules,
  restoreJourneyRun,recordJourneyProgress,EMPTY_JOURNEY_PROGRESS
} from '../src/external/overswingJourney.js';

// End a gate with an Ace in the Pot; fixtures avoid manipulating draw RNG.
function finish(run,score){
  const d=run.encounter.engineState.deal;
  const prepared={...run,encounter:{...run.encounter,engineState:{
    ...run.encounter.engineState,deal:{
      ...d,pos:d.deck.length,hand:[],pot:[0],plays:2,T:score-1
    }}}};
  assert.deepEqual(journeyActions(prepared),[{type:'bank'}]);
  return stepJourney(prepared,{type:'PLAY',action:{type:'bank'}});
}

test('a new live journey offers a paid relic before Gate 1',()=>{
  const run=startJourney(7521,1000,1,[],{shopBeforeFirstGate:true});
  assert.equal(run.phase,'choosing_relic');
  assert.equal(run.shopForGate,0);
  assert.deepEqual(run.relicIds,[]);
  assert.equal(run.offeredRelicIds.length,3);
  assert.deepEqual(run.offeredRelicIds,offerJourneyRelics(run));
  assert.equal(journeyRelicPrice(run),160,'20% of Gate 1 target');
  assert.deepEqual(journeyActions(run),[]);
  const id=run.offeredRelicIds[0];
  const next=stepJourney(run,{type:'BUY_RELIC',relicId:id});
  assert.equal(next.phase,'playing');
  assert.equal(next.encounterIndex,0);
  assert.deepEqual(next.relicIds,[id]);
  assert.deepEqual(next.purchasedRelicIds,[id]);
  assert.equal(next.goldSpent,160);
  assert.equal(journeyGoldBalance(next),840);
  assert.equal(stepJourney(run,{type:'BUY_RELIC',relicId:'unknown'}),run);
  assert.equal(stepJourney(next,{type:'BUY_RELIC',relicId:id}),next);
  const skip=stepJourney(run,{type:'SKIP_RELIC'});
  assert.equal(skip.phase,'playing');
  assert.deepEqual(skip.relicIds,[]);
  assert.equal(skip.goldSpent,0);
});

test('relics expire between gates, can be purchased again and cost Gold each time',()=>{
  const initial=startJourney(8642,2000,1,[],{shopBeforeFirstGate:true});
  const secondOffer=offerJourneyRelics({...initial,shopForGate:1});
  const repeatId=initial.offeredRelicIds.find(id=>secondOffer.includes(id));
  assert.ok(repeatId,'at least two of each three-card offer overlap');
  const gate1=stepJourney(initial,{type:'BUY_RELIC',relicId:repeatId});
  const shop2=finish(gate1,800);
  assert.equal(shop2.phase,'choosing_relic');
  assert.equal(shop2.shopForGate,1);
  assert.deepEqual(shop2.relicIds,[],'Gate 1 relic expires immediately');
  assert.deepEqual(shop2.purchasedRelicIds,[repeatId],'history remains');
  assert.equal(journeyRelicPrice(shop2),360);
  assert.ok(shop2.offeredRelicIds.includes(repeatId),'used relic may be sold again');

  const gate2=stepJourney(shop2,{type:'BUY_RELIC',relicId:repeatId});
  assert.deepEqual(gate2.relicIds,[repeatId]);
  assert.deepEqual(gate2.purchasedRelicIds,[repeatId,repeatId]);
  assert.equal(gate2.goldSpent,520,'pay 160 + 360 for the same relic');
  const shop3=finish(gate2,1800);
  assert.equal(shop3.phase,'choosing_relic');
  assert.equal(shop3.shopForGate,2);
  assert.deepEqual(shop3.relicIds,[],'Gate 2 relic also expires');
  assert.equal(journeyRelicPrice(shop3),600);
  const gate3=stepJourney(shop3,{type:'SKIP_RELIC'});
  assert.equal(gate3.encounterIndex,2);
  assert.equal(gate3.phase,'playing');
  assert.deepEqual(gate3.relicIds,[],'skipping never inherits a previous relic');
  assert.equal(gate3.goldSpent,520);
  assert.deepEqual(gate3.purchasedRelicIds,[repeatId,repeatId]);
  assert.deepEqual(journeyRules(gate3).bankCapacityLoss,1);
  const abandoned=stepJourney(gate3,{type:'ABANDON'});
  const progress=recordJourneyProgress(EMPTY_JOURNEY_PROGRESS,abandoned);
  assert.ok(progress.discoveredRelicIds.includes(repeatId));
});

test('a retry is still the same gate, keeping its purchased relic and its cost',()=>{
  const shop=startJourney(9342,2000,1,[],{shopBeforeFirstGate:true});
  const id=shop.offeredRelicIds[0];
  const first=stepJourney(shop,{type:'BUY_RELIC',relicId:id});
  const lost=finish(first,799);
  assert.equal(lost.phase,'retry_offer');
  const retried=stepJourney(lost,{type:'BUY_RETRY'});
  assert.equal(retried.phase,'playing');
  assert.equal(retried.encounterIndex,0);
  assert.deepEqual(retried.relicIds,[id]);
  assert.deepEqual(retried.purchasedRelicIds,[id]);
  assert.deepEqual(retried.encounter.relicUses,{});
  assert.equal(retried.goldSpent,first.goldSpent+800,'no second relic charge');
  assert.deepEqual(retried.encounter.engineState.deal.deck,first.encounter.engineState.deal.deck,
    'gate replay must reuse the original shuffled deck');
});

test('older saved cumulative relics are cleared or reduced to the current gate purchase',()=>{
  const first=finish(startJourney(3589,1000),800);
  const current=stepJourney(first,{type:'BUY_RELIC',relicId:first.offeredRelicIds[0]});
  const {purchasedRelicIds,shopForGate,...oldCurrent}=current;
  const playing=restoreJourneyRun(oldCurrent);
  assert.deepEqual(playing.relicIds,current.relicIds);
  assert.deepEqual(playing.purchasedRelicIds,current.relicIds);

  const second=finish(current,1800);
  const oldShop={...second,relicIds:current.relicIds};
  delete oldShop.purchasedRelicIds;
  delete oldShop.shopForGate;
  const restored=restoreJourneyRun(oldShop);
  assert.equal(restored.phase,'choosing_relic');
  assert.deepEqual(restored.relicIds,[],'the old gate relic is not carried forward');
  assert.deepEqual(restored.purchasedRelicIds,current.relicIds);
  assert.equal(restored.shopForGate,2);
  assert.equal(restored.offeredRelicIds.length,3);
  assert.equal(journeyRelicPrice(restored),600);

  const withoutCurrentPayment={...oldCurrent,encounterIndex:2,
    encounter:{...oldCurrent.encounter,encounterId:'ember_keeper'}};
  assert.deepEqual(restoreJourneyRun(withoutCurrentPayment).relicIds,[],
    'a relic cannot be active if it was never bought for this gate');
});
