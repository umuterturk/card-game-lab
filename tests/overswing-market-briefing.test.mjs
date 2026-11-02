import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  startJourney,stepJourney,buyMarketWild,buyRoyal,
  EMPTY_JOURNEY_PROGRESS,MARKET_WILD_PRICES,journeyGoldBalance
} from '../src/external/overswingJourney.js';
import {campaignLevel,campaignRuleLabels} from '../src/external/overswingCampaign.js';
import {createOverswingAudio} from '../src/external/overswingAudio.js';
import {WILD_IDS} from '../src/external/overswingWilds.js';
const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');

test('Market sells consumable Wilds using permanent Gold without creating a run',()=>{
  const initial={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:5000};
  let p=initial;
  for(const id of WILD_IDS){
    const before=p.lifetimeGold,qty=p.wildInventory[id];
    p=buyMarketWild(p,id);
    assert.equal(p.lifetimeGold,before-MARKET_WILD_PRICES[id]);
    assert.equal(p.wildInventory[id],qty+1);
  }
  assert.equal(p.wildInventory.shield,1);
  assert.equal(initial.wildInventory.shield,0,'purchase must not mutate old state');
  assert.strictEqual(buyMarketWild(p,'invalid'),p);
  assert.strictEqual(buyMarketWild({...EMPTY_JOURNEY_PROGRESS,lifetimeGold:0},'shield').lifetimeGold,0);
});

test('purchased Royal cards and Wilds survive a new three-gate journey',()=>{
  let p={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:200000};
  p=buyRoyal(p,'J');
  p=buyMarketWild(p,'shield');
  const run=startJourney(79001,p.lifetimeGold,8,p.ownedRoyalIds,{
    wildInventory:p.wildInventory,shopBeforeFirstGate:true
  });
  assert.equal(run.phase,'choosing_relic');
  assert.deepEqual(run.equippedRoyals,['J']);
  assert.equal(run.wildInventoryStart.shield,1);
  assert.equal(run.offeredRelicIds.length,3);
  const next=stepJourney(run,{type:'SKIP_RELIC'});
  assert.equal(next.phase,'playing');
  assert.equal(journeyGoldBalance(next),p.lifetimeGold);
  assert.deepEqual(next.relicIds,[]);
  assert.deepEqual(campaignRuleLabels(campaignLevel(8)),['FLIP ≤14']);
});

test('cinematic intro leads into a single fading gate briefing under the character',()=>{
  const journey=read('OverswingJourney.jsx');
  const briefing=read('OverswingGateBriefing.jsx');
  const css=read('overswingGateBriefing.css');
  const market=read('OverswingMarket.jsx');
  assert.match(journey,/setBriefingReady\(false\)/);
  assert.match(journey,/setBriefingReady\(true\)/);
  assert.match(journey,/resetJourneyAtLevel/);
  assert.match(read('overswingJourney.js'),/shopBeforeFirstGate:true/);
  assert.doesNotMatch(journey,/if\(view==='prepare'\)/);
  assert.match(journey,/if\(run\.phase==='choosing_relic'\)return <OverswingGateBriefing/);
  assert.match(briefing,/<EnemyPortrait/);
  assert.match(briefing,/og-panel/);
  assert.match(briefing,/run\.offeredRelicIds\.map/);
  assert.match(briefing,/campaignRuleLabels\(level\)/);
  assert.match(briefing,/FIGHT WITHOUT RELIC/);
  assert.doesNotMatch(briefing,/ROYAL|AUTO-EQUIPPED|RoyalWorkshop/);
  assert.match(css,/animation:og-panel-in 1\.45s/);
  assert.match(market,/ROYALS/);
  assert.match(market,/WILDS/);
});

test('home audio is a distinct longer 74 BPM horror loop and crossfades to game',()=>{
  const source=read('overswingAudio.js'),hook=read('useOverswingSound.js');
  assert.match(source,/function renderMenuStep\(step,time,beat\)/);
  assert.match(source,/const roots=\[41\.2,36\.71,43\.65,38\.89,49,41\.2,36\.71,55\]/);
  assert.match(source,/currentTempo=cinematic\?44:74/);
  assert.match(source,/rampBus\(cinemaBus\.gain,cinematic\|\|menuMusic\?1:0,now\)/);
  assert.match(hook,/setAtmosphere/);
  const audio=createOverswingAudio(null);
  audio.setAtmosphere('menu');
  assert.equal(audio.menuMusic,true);
  audio.setCinematic(true);
  assert.equal(audio.cinematic,true);
  assert.equal(audio.menuMusic,false);
  audio.setAtmosphere(null);
  assert.equal(audio.cinematic,false);
  assert.equal(audio.menuMusic,false);
  assert.throws(()=>audio.setAtmosphere('unknown'),RangeError);
});
