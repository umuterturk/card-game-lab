import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {signed,overswingFinal} from '../src/external/engines.js';
import {
  startJourney,stepJourney,isValidJourney,journeyActions,journeyCanUseWild,
  journeyWildBalance,recordJourneyGold,recordJourneyProgress,
  EMPTY_JOURNEY_PROGRESS,restoreJourneyProgress,restoreJourneyRun
} from '../src/external/overswingJourney.js';
import {WILD_IDS,EMPTY_WILD_INVENTORY} from '../src/external/overswingWilds.js';

const inventory=(id,count=1)=>({...EMPTY_WILD_INVENTORY,[id]:count});
const start=(seed,id,options={})=>startJourney(seed,0,1,options.royals||[],{
  wildInventory:inventory(id),rewardAvailable:options.rewardAvailable||false
});
function alterDeal(run,patch){
  return {...run,encounter:{...run.encounter,
    engineState:{...run.encounter.engineState,
      deal:{...run.encounter.engineState.deal,...patch}}}};
}
function finish(run,score){
  const ready=alterDeal(run,{pos:run.encounter.engineState.deal.deck.length,
    hand:[],pot:[0],plays:2,T:score-1});
  assert.deepEqual(journeyActions(ready),[{type:'bank'}]);
  return stepJourney(ready,{type:'PLAY',action:{type:'bank'}});
}
function conserved(s){
  const d=s.deal;
  return [...d.deck.slice(d.pos),...d.hand,...d.pot,...d.discard,
    ...(d.royalQueue||[])].sort((a,b)=>a-b);
}

test('Wild Shuffle refreshes only ordinary hand, conserves cards and uses deterministic RNG',()=>{
  const run=start(314,'shuffle',{royals:['J']});
  assert.ok(journeyCanUseWild(run,'shuffle'));
  const before=run.encounter.engineState;
  const royals=before.deal.royalQueue;
  assert.equal(before.deal.hand.filter(id=>id>=40).length,0,
    'Royal cards no longer enter the opening hand');
  const updated=stepJourney(run,{type:'USE_WILD',wildId:'shuffle'});
  const next=updated.encounter.engineState;
  assert.notStrictEqual(updated,run);
  assert.equal(updated.phase,'playing');
  assert.deepEqual(updated.wildUsedIds,['shuffle']);
  assert.equal(journeyWildBalance(updated).shuffle,0);
  assert.equal(next.deal.hand.length,before.deal.hand.length);
  assert.equal(next.deal.pos,before.deal.pos);
  assert.equal(next.deal.deck.length,before.deal.deck.length);
  assert.deepEqual(next.deal.royalQueue,royals,
    'SHUFFLE must not touch the future Royal hand queue');
  assert.equal(next.lastAction.wildId,'shuffle');
  assert.deepEqual(conserved(next),conserved(before),
    'Shuffle can neither create nor delete an ordinary or Royal card');
  assert.deepEqual(stepJourney(run,{type:'USE_WILD',wildId:'shuffle'}),updated);
  assert.strictEqual(stepJourney(updated,{type:'USE_WILD',wildId:'shuffle'}),updated);
});

test('Polarity Switch reverses exactly one ordinary STEER and applies ZERO BREAK',()=>{
  const run=start(315,'polarity');
  const id=run.encounter.engineState.deal.hand[0],value=signed(id);
  const ready=alterDeal(run,{S:value,plays:1,pot:[],W:2});
  assert.ok(journeyCanUseWild(ready,'polarity'));
  const done=stepJourney(ready,{type:'USE_WILD',wildId:'polarity',index:0});
  const action=done.encounter.engineState.lastAction;
  assert.equal(action.type,'steer');
  assert.equal(action.polarityReversed,true);
  assert.equal(action.to,0);
  assert.equal(action.zeroBreak,true);
  assert.equal(done.encounter.engineState.deal.W,0);
  assert.equal(journeyWildBalance(done).polarity,0);
  assert.deepEqual(done.wildUsedIds,['polarity']);
  assert.strictEqual(stepJourney(done,{type:'USE_WILD',wildId:'shield'}),done,
    'cannot use a Tactic without inventory');
  assert.strictEqual(stepJourney(run,{type:'USE_WILD',wildId:'polarity',index:99}),run,
    'invalid hand index must not consume a card');
});

test('Ember Shield saves Pot from SNAP, resets multipliers and preserves boss SNAP tax',()=>{
  const base=start(316,'shield');
  const boss={...base,encounterIndex:2,
    encounter:{...base.encounter,encounterId:'ember_keeper',
      effectiveTarget:3000}};
  assert.ok(isValidJourney(boss));
  const armed=stepJourney(boss,{type:'USE_WILD',wildId:'shield'});
  assert.equal(armed.wildShieldArmed,true);
  assert.equal(journeyWildBalance(armed).shield,0);
  const d=armed.encounter.engineState.deal;
  const pending=signed(d.deck[d.pos]);
  const ready=alterDeal(armed,{S:pending>0?10:-10,W:4,pot:[1,2],
    plays:2,flipFactor:3,jackpotFactor:2});
  const result=stepJourney(ready,{type:'PLAY',action:{type:'flip'}});
  const action=result.encounter.engineState.lastAction;
  assert.equal(action.snap,true);
  assert.equal(action.shielded,true);
  assert.equal(action.lostPayout,0);
  assert.deepEqual(result.encounter.engineState.deal.pot,[1,2]);
  assert.equal(result.encounter.engineState.deal.S,0);
  assert.equal(result.encounter.engineState.deal.W,0);
  assert.equal(result.encounter.engineState.deal.flipFactor,1);
  assert.equal(result.encounter.engineState.deal.jackpotFactor,1);
  assert.equal(result.encounter.snapCount,1);
  assert.equal(result.encounter.effectiveTarget,3200,
    'a saved Pot must not cancel the boss SNAP tax');
  assert.equal(result.wildShieldArmed,false);
  assert.equal(journeyWildBalance(result).shield,0);
});

test('a safe FLIP consumes armed Shield without providing a second use',()=>{
  const run=stepJourney(start(317,'shield'),{type:'USE_WILD',wildId:'shield'});
  const ready=alterDeal(run,{S:0,plays:1,pot:[0]});
  const done=stepJourney(ready,{type:'PLAY',action:{type:'flip'}});
  assert.equal(done.encounter.engineState.lastAction.snap,false);
  assert.equal(done.encounter.engineState.lastAction.shieldFaded,true);
  assert.equal(done.wildShieldArmed,false);
  assert.deepEqual(done.wildUsedIds,['polarity']);
});

test('Wild inventory settles once and cannot be spent twice across retries',()=>{
  const first=start(318,'polarity');
  const d=first.encounter.engineState.deal;
  const used=stepJourney(alterDeal(first,{S:signed(d.hand[0]),plays:1}),
    {type:'USE_WILD',wildId:'polarity',index:0});
  let progress={...EMPTY_JOURNEY_PROGRESS,wildInventory:inventory('polarity')};
  progress=recordJourneyGold(progress,used);
  assert.equal(progress.wildInventory.polarity,0);
  assert.strictEqual(recordJourneyGold(progress,used),progress);
  const failed=finish(used,0);
  assert.equal(failed.phase,'retry_offer');
  const rerun=stepJourney({...failed,goldStart:1000},{type:'BUY_RETRY'});
  assert.deepEqual(rerun.wildUsedIds,[]);
  assert.equal(journeyWildBalance(rerun).polarity,1,'retry restores spent Tactic');
  let restored=recordJourneyGold(progress,rerun);
  assert.equal(restored.wildInventory.polarity,1);
  assert.strictEqual(recordJourneyGold(restored,rerun),restored,'refund settles once');
  const usedAgain=stepJourney(rerun,{type:'USE_WILD',wildId:'polarity',index:0});
  assert.notStrictEqual(usedAgain,rerun);
  assert.equal(journeyWildBalance(usedAgain).polarity,0);
  const nextGate={...usedAgain,wildUsedIds:[],encounterIndex:1,
    encounter:{...usedAgain.encounter,encounterId:'the_furnace',effectiveTarget:1800}};
  assert.equal(journeyCanUseWild(nextGate,'polarity'),false,'second consumption persists');
});

test('first cleared location awards exactly one chosen Wild with no bonus Gold',()=>{
  let run=start(319,'shuffle',{rewardAvailable:true});
  run=finish(run,800);
  assert.equal(run.phase,'choosing_relic');
  run=stepJourney(run,{type:'SKIP_RELIC'});
  run=finish(run,1800);
  assert.equal(run.phase,'choosing_relic');
  run=stepJourney(run,{type:'SKIP_RELIC'});
  run=finish(run,3000);
  assert.equal(run.phase,'choosing_wild');
  assert.equal(run.completedEncounters.length,3);
  let progress=recordJourneyGold(EMPTY_JOURNEY_PROGRESS,run);
  assert.equal(progress.lifetimeGold,5600);
  assert.deepEqual(progress.wildInventory,EMPTY_WILD_INVENTORY);
  assert.equal(recordJourneyProgress(progress,run).totalRuns,0,
    'victory not finalized until a reward is chosen');
  assert.strictEqual(stepJourney(run,{type:'CHOOSE_WILD',wildId:'unknown'}),run);
  const awarded=stepJourney(run,{type:'CHOOSE_WILD',wildId:'shield'});
  assert.equal(awarded.phase,'won');
  assert.equal(awarded.wildRewardId,'shield');
  assert.strictEqual(stepJourney(awarded,{type:'CHOOSE_WILD',wildId:'shield'}),awarded);
  progress=recordJourneyGold(progress,awarded);
  assert.equal(progress.lifetimeGold,5600,'rewards do not add extra Gold');
  assert.equal(progress.wildInventory.shield,1);
  assert.strictEqual(recordJourneyGold(progress,awarded),progress);
  progress=recordJourneyProgress(progress,awarded);
  assert.ok(progress.clearedChapterIds.includes('first_ember'));
  const replay=startJourney(320,progress.lifetimeGold,1,[],{
    wildInventory:progress.wildInventory,rewardAvailable:false});
  assert.equal(replay.wildRewardAvailable,false);
  assert.deepEqual(journeyWildBalance(replay),progress.wildInventory);
  let replayGate=finish(replay,800);
  replayGate=stepJourney(replayGate,{type:'SKIP_RELIC'});
  replayGate=finish(replayGate,1800);
  replayGate=stepJourney(replayGate,{type:'SKIP_RELIC'});
  replayGate=finish(replayGate,3000);
  assert.equal(replayGate.phase,'won','replayed locations do not yield another Wild');
});
test('schema v3 saves preserve Gold and Royal ownership while initializing Wild inventory',()=>{
  const v3={...EMPTY_JOURNEY_PROGRESS,schemaVersion:3,lifetimeGold:12345,
    wildInventory:undefined,creditedWildEventIds:undefined};
  const migrated=restoreJourneyProgress(v3);
  assert.equal(migrated.schemaVersion,5);
  assert.equal(migrated.lifetimeGold,12345);
  assert.deepEqual(migrated.wildInventory,EMPTY_WILD_INVENTORY);
  const original=startJourney(321,12345);
  const previous={...original,schemaVersion:3,
    wildInventoryStart:undefined,wildEvents:undefined,
    wildUsedGate:undefined,wildShieldArmed:undefined,
    wildRewardAvailable:undefined,wildRewardId:undefined};
  const restored=restoreJourneyRun(previous,migrated);
  assert.ok(isValidJourney(restored));
  assert.equal(restored.goldStart,12345);
  assert.deepEqual(restored.wildInventoryStart,EMPTY_WILD_INVENTORY);
});
test('gameplay UI has no STEER button, supports Wild picker and idle/reduced motion styles',()=>{
  const jsx=readFileSync(new URL('../src/external/OverswingPlay.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/external/overswing.css',import.meta.url),'utf8');
  const homeCss=readFileSync(new URL('../src/external/overswingJourney.css',import.meta.url),'utf8');
  assert.doesNotMatch(jsx,/os8-steer-focus|className=\{?'os8-steer/);
  assert.match(jsx,/YOUR HAND · STEER/);
  assert.match(jsx,/os8-wild-action/);
  assert.match(css,/os8-idle-embers/);
  assert.match(homeCss,/oj-idle-flame/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
