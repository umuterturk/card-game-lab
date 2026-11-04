import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  EMPTY_JOURNEY_PROGRESS,startJourney,stepJourney,
  journeyRelicPrice,resetJourneyAtLevel,recordJourneyGold,recordJourneyProgress
} from '../src/external/overswingJourney.js';

const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');

test('each PREPARE creates a fresh three-gate run and settles the old run once',()=>{
  const progress={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:1000};
  const previous=startJourney(101,1000,1,[],{shopBeforeFirstGate:true});
  const relicPrice=journeyRelicPrice(previous);
  const playing=stepJourney(previous,{type:'BUY_RELIC',relicId:previous.offeredRelicIds[0]});
  assert.equal(playing.phase,'playing');
  const next=resetJourneyAtLevel(progress,playing,1,102);
  assert.equal(next.run.phase,'choosing_relic');
  assert.equal(next.run.runSeed,102);
  assert.notEqual(next.run.runId,playing.runId);
  assert.equal(next.run.encounterIndex,0);
  assert.equal(next.run.goldStart,1000-relicPrice);
  assert.equal(next.progress.lifetimeGold,1000-relicPrice,'old relic cost remains spent');
  assert.equal(next.progress.totalRuns,1,'restarting abandons one attempt');
  assert.equal(next.progress.wins,0);
  assert.equal(next.progress.recordedRunIds.includes(playing.runId),true);
  assert.equal(next.run.offeredRelicIds.length,3);
  assert.deepEqual(next.run.relicIds,[]);
  assert.deepEqual(next.run.wildUsedIds,[]);
  assert.equal(next.run.retryCount,0);
  assert.deepEqual(next.run.completedEncounters,[]);

  // React effects can have credited the old run before the button press.
  // Settling the same run again must not double-charge or double-count.
  const again=resetJourneyAtLevel(next.progress,playing,1,103);
  assert.equal(again.progress.lifetimeGold,next.progress.lifetimeGold);
  assert.equal(again.progress.totalRuns,1);
  assert.equal(again.run.runSeed,103);
});

test('repeated PREPARE resets even an untouched first-gate briefing',()=>{
  const progress={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:2000};
  const first=resetJourneyAtLevel(progress,null,1,700);
  const second=resetJourneyAtLevel(first.progress,first.run,1,701);
  assert.equal(second.progress.lifetimeGold,2000);
  assert.equal(second.progress.totalRuns,1);
  assert.equal(second.run.runSeed,701);
  assert.equal(second.run.phase,'choosing_relic');
  assert.notDeepEqual(second.run.offeredRelicIds,[]);

  const third=resetJourneyAtLevel(second.progress,second.run,1,702);
  assert.equal(third.progress.totalRuns,2);
  assert.equal(third.run.runSeed,702);
});

test('reset does not wipe earned Gold or purchased Wild cards',()=>{
  const progress={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:900,
    wildInventory:{shuffle:2,polarity:1,shield:3}};
  const old=startJourney(333,900,1,[],{wildInventory:progress.wildInventory});
  const newRun=resetJourneyAtLevel(progress,old,1,334);
  assert.equal(newRun.run.goldStart,900);
  assert.deepEqual(newRun.run.wildInventoryStart,progress.wildInventory);
  assert.equal(newRun.progress.lifetimeGold,900);
  assert.equal(newRun.progress.wildInventory.shield,3);

  // Recorded treasury is not refunded, nor credited again if React already saved it.
  const banked={...old,treasuryEvents:[
    {id:old.runId+'|gate:0',amount:120,lifetimeDelta:120}]};
  const reset=resetJourneyAtLevel(progress,banked,1,335);
  assert.equal(reset.progress.lifetimeGold,1020);
  assert.equal(reset.run.goldStart,1020);
  const credited=recordJourneyGold(progress,banked);
  const settled=recordJourneyProgress(credited,stepJourney(banked,{type:'ABANDON'}));
  const repeated=resetJourneyAtLevel(settled,banked,1,336);
  assert.equal(repeated.progress.lifetimeGold,1020);
  assert.equal(repeated.progress.totalRuns,1);
});

test('PREPARE always runs the cinematic, while RESUME continues the saved run',()=>{
  const journey=read('OverswingJourney.jsx');
  const map=read('OverswingCampaignMap.jsx');
  const press=journey.slice(journey.indexOf('onSelect={setSelectedLevel} onStart={()=>{'),
    journey.indexOf('onQuick=',journey.indexOf('onSelect={setSelectedLevel} onStart={()=>{')));
  assert.match(press,/begin\(selectedLevel\)/);
  assert.match(press,/sound\.setAtmosphere\('cinematic'\)/);
  assert.match(press,/setBriefingReady\(false\)/);
  assert.doesNotMatch(press,/setIntroClosing/);
  assert.match(press,/setIntroVisible\(true\)/);
  assert.doesNotMatch(press,/if\(activeJourney\).*setView\('journey'\)/);
  assert.match(journey,/resetJourneyAtLevel\(progress,run,level,Date\.now\(\)\)/);
  assert.match(map,/RESUME CURRENT FIGHT/);
  assert.match(map,/PREPARE · RESET/);
  assert.match(journey,/activeRun=\{run&&/);
});
