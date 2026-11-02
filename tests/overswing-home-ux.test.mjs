import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startJourney,buyRoyal,toggleRoyalEquipped,EMPTY_JOURNEY_PROGRESS} from '../src/external/overswingJourney.js';

const read=filename=>readFileSync(new URL('../src/external/'+filename,import.meta.url),'utf8');

test('campaign homepage stays minimal; Royals and inventory live in preparation',()=>{
  const jsx=read('OverswingJourney.jsx');
  const mapStart=jsx.indexOf("if(!run||view==='menu'||view==='map')");
  const playStart=jsx.indexOf("if(run.phase==='playing')",mapStart);
  const prepStart=jsx.indexOf("if(view==='prepare')");
  assert.ok(prepStart>0&&prepStart<mapStart);
  const prepare=jsx.slice(prepStart,mapStart);
  const home=jsx.slice(mapStart,playStart);
  assert.match(prepare,/<RoyalWorkshop progress=\{progress\}/);
  assert.match(prepare,/<WildInventory inventory=\{progress.wildInventory\}/);
  assert.match(prepare,/<GoldProgress progress=\{progress\}/);
  assert.match(prepare,/begin\(selectedLevel\)/);
  assert.match(prepare,/onClick=\{\(\)=>setView\('map'\)\}/);
  assert.match(prepare,/activeJourney/);
  assert.doesNotMatch(home,/RoyalWorkshop/);
  assert.doesNotMatch(home,/ROYAL_NAMES|ROYAL_PRICES/);
  assert.doesNotMatch(home,/WildInventory/);
  assert.doesNotMatch(home,/oj-record/);
  assert.match(home,/<GoldProgress progress=\{progress\} compact\/>/);
  assert.match(home,/<OverswingCampaignMap/);
  assert.match(home,/onStart=\{\(\)=>setView\('prepare'\)\}/);
  const campaign=read('OverswingCampaignMap.jsx');
  assert.match(campaign,/PREPARE · LEVEL/);
});

test('the selected permanent Royal loadout still becomes the new hand',()=>{
  let progress={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:200000};
  progress=buyRoyal(progress,'K');
  progress=buyRoyal(progress,'J');
  assert.deepEqual(progress.ownedRoyalIds,['K','J']);
  assert.deepEqual(progress.equippedRoyalIds,['K','J']);
  progress=toggleRoyalEquipped(progress,'K');
  assert.deepEqual(progress.equippedRoyalIds,['J']);
  const run=startJourney(8127,progress.lifetimeGold,1,progress.equippedRoyalIds,
    {wildInventory:progress.wildInventory,rewardAvailable:true});
  assert.deepEqual(run.equippedRoyals,['J']);
  assert.equal(run.encounter.engineState.deal.hand.filter(card=>card>=40).length,1);
  assert.equal(run.levelNumber,1);
  assert.equal(run.wildRewardAvailable,true);
});

test('hellish minimal map keeps Doom fire, and the preparation screen fits portraits',()=>{
  const css=read('overswingJourney.css');
  assert.match(css,/\.oj-map-home\s*\{/);
  assert.match(css,/\.oj-map-home \.oj-gold-compact/);
  assert.match(css,/\.oj-prepare-heading/);
  assert.match(css,/\.oj-prepare-fire/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  const jsx=read('OverswingJourney.jsx');
  assert.match(jsx,/className="oj-title-doom-fire"/);
  assert.match(jsx,/className="oj-prepare-fire"/);
});

test('the map displays a low-frame-rate burning pendulum instead of J/Q/K shop',()=>{
  const jsx=read('OverswingJourney.jsx'),home=read('HellPendulum.jsx');
  const css=read('overswingJourney.css');
  const mapStart=jsx.indexOf("if(!run||view==='menu'||view==='map')");
  const playStart=jsx.indexOf("if(run.phase==='playing')",mapStart);
  const page=jsx.slice(mapStart,playStart);
  assert.match(jsx,/import HellPendulum from '\.\/HellPendulum\.jsx'/);
  assert.match(page,/<HellPendulum\/>/);
  assert.doesNotMatch(page,/oj-flame/);
  assert.doesNotMatch(page,/RoyalWorkshop|ROYAL_NAMES|ROYAL_PRICES|oj-royal-option/);
  assert.match(home,/className="oj-hell-pendulum-arm"/);
  assert.match(home,/className="oj-hell-pendulum-flame"/);
  assert.match(home,/className="oj-hell-pendulum-sparks"/);
  assert.match(home,/shapeRendering="crispEdges"/);
  assert.match(css,/oj-hell-pendulum-swing 3\.2s steps\(15,end\)/);
  assert.match(css,/oj-hell-pendulum-fire 1\.1s steps\(5,end\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
