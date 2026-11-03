import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {startJourney,buyRoyal,EMPTY_JOURNEY_PROGRESS} from '../src/external/overswingJourney.js';
import {OVERSWING_ENEMIES,opponentForLevel} from '../src/external/overswingEnemies.js';
const read=file=>readFileSync(new URL('../src/external/'+file,import.meta.url),'utf8');

test('the twelve three-gate levels have unique enemies and two real portrait atlases',()=>{
  assert.equal(OVERSWING_ENEMIES.length,12);
  assert.equal(new Set(OVERSWING_ENEMIES.map(e=>e.name)).size,12);
  assert.equal(new Set(OVERSWING_ENEMIES.map(e=>e.art)).size,2);
  assert.equal(new Set(OVERSWING_ENEMIES.map(e=>e.art+':'+e.slot)).size,12);
  assert.equal(OVERSWING_ENEMIES[0].art,'enemies/infernal-01-06.webp');
  assert.equal(OVERSWING_ENEMIES[11].art,'enemies/infernal-07-12.webp');
  assert.match(opponentForLevel(1).name,/BUTCHER/);
  const map=read('OverswingCampaignMap.jsx');
  assert.match(map,/ocm-opponent-art/);
  assert.doesNotMatch(map,/ocm-path|ocm-node|M22 88/);
  assert.match(map,/PREPARE · LEVEL/);
  assert.match(map,/onSelect\(selected-1\)/);
});

test('portrait assets resolve from document root, not stylesheet /assets folder',()=>{
  const component=read('OverswingEnemy.jsx');
  const css=read('overswingEnemy.css');
    assert.match(component,/new URL\(relative,document\.baseURI\)\.href/);
  assert.match(component,/<img key=\{src\} className=\{/);
  assert.match(component,/onError=\{\(\)=>setFailedLoads/);
  assert.match(css,/\.oe-portrait-atlas\{/);
  assert.match(css,/\.oe-portrait-atlas\.oe-portrait-fallback/);
  assert.doesNotMatch(component,/--enemy-sprite/);
  assert.doesNotMatch(css,/background-image:var\(--enemy-sprite\)/);
  for(const file of ['infernal-01-06.webp','infernal-07-12.webp']){
    const asset=new URL('../public/enemies/'+file,import.meta.url);
    assert.ok(statSync(asset).size>4000,file+' must exist and contain image data');
    const header=readFileSync(asset);
    assert.equal(header.toString('ascii',0,4),'RIFF');
    assert.equal(header.toString('ascii',8,12),'WEBP');
  }
});

test('the Market owns Royal purchases and the gate briefing sits below the portrait',()=>{
  const jsx=read('OverswingJourney.jsx'),brief=read('OverswingGateBriefing.jsx');
  const market=read('OverswingMarket.jsx'),css=read('overswingGateBriefing.css');
  assert.doesNotMatch(jsx,/view==='prepare'|function RoyalWorkshop/);
  assert.match(jsx,/view==='market'/);
  assert.match(jsx,/oj-market-button/);
  assert.match(jsx,/<OverswingGateBriefing/);
  assert.match(jsx,/setBriefingReady\(true\)/);
  assert.match(brief,/<EnemyPortrait/);
  assert.match(brief,/campaignRuleLabels\(level\)/);
  assert.match(brief,/run\.offeredRelicIds\.map/);
  assert.match(brief,/FIGHT WITHOUT RELIC/);
  assert.doesNotMatch(brief,/ROYAL|RoyalWorkshop/);
  assert.match(css,/\.og-panel-visible/);
  assert.match(css,/@keyframes og-panel-in/);
  assert.match(market,/ROYALS/);
  assert.match(market,/WILDS/);
  assert.match(market,/onRoyal/);
  assert.match(market,/onWild/);
});

test('PREPARE crossfades the controls without moving or replacing the cinematic portrait',()=>{
  const jsx=read('OverswingJourney.jsx'),intro=read('OverswingEnemy.jsx');
  const css=read('overswingEnemy.css');
  assert.match(jsx,/setIntroVisible\(true\)/);
  assert.match(jsx,/prepared=\{briefingReady\}/);
  assert.match(jsx,/run\.phase==='choosing_relic'&&introVisible/);
  assert.match(jsx,/<OverswingGateBriefing run=\{run\} embedded/);
  assert.doesNotMatch(jsx,/setIntroClosing\(true\)/);
  assert.match(intro,/TAP TO PREPARE/);
  assert.match(intro,/oe-intro-embers/);
  assert.equal(intro.match(/<EnemyPortrait level=\{level\}/g)?.length,1);
  assert.match(intro,/\{children&&<div className="oe-intro-preparation"/);
  assert.match(css,/\.oe-intro-prepared \.oe-intro-words/);
  assert.match(css,/\.oe-intro-prepared \.oe-intro-preparation/);
  assert.doesNotMatch(css,/\.oe-intro-prepared \.oe-intro-image-shell/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('cinematic intro portals outside fullscreen scale and survives refresh without old bordered layout',()=>{
  const jsx=read('OverswingJourney.jsx'),intro=read('OverswingEnemy.jsx');
  const css=read('overswingEnemy.css');
  assert.match(jsx,/run\\.phase==='choosing_relic'\\)return null/);
  assert.match(jsx,/run\\?\\.phase==='choosing_relic'&&createPortal\\(/);
  assert.match(jsx,/document\\.body\\)/);
  assert.match(jsx,/prepared=\\{!introVisible\\|\\|briefingReady\\}/);
  assert.match(jsx,/<OverswingGateBriefing run=\\{run\\} embedded/);
  assert.doesNotMatch(jsx,/<OverswingGateBriefing\\s*\\n\\s*run=\\{run\\} ready=/);
  assert.match(intro,/oe-intro-image-shell/);
  assert.match(css,/body>\\.oe-intro\\{position:fixed/);
  assert.match(intro,/oe-intro-back/);
});

test('permanent royal purchases require no selection and all three enter a fight',()=>{
  let progress={...EMPTY_JOURNEY_PROGRESS,lifetimeGold:350000};
  for(const id of ['K','J','Q'])progress=buyRoyal(progress,id);
  assert.deepEqual(progress.ownedRoyalIds,['K','J','Q']);
  assert.deepEqual(progress.equippedRoyalIds,['K','J','Q']);
  const run=startJourney(8127,progress.lifetimeGold,1,progress.ownedRoyalIds);
  assert.deepEqual(run.equippedRoyals,['K','J','Q']);
  assert.equal(run.encounter.engineState.deal.pendingRoyals.length,3);
  assert.equal(run.encounter.engineState.deal.hand.filter(id=>id>=40).length,0);
  const jsx=read('OverswingJourney.jsx');
  const coordinator=read('overswingJourney.js');
  assert.match(jsx,/resetJourneyAtLevel\(progress,run,level,Date\.now\(\)\)/);
  assert.match(coordinator,/settled\.ownedRoyalIds/);
  assert.match(read('OverswingMarket.jsx'),/AUTO-EQUIPPED/);
});

test('homepage still has ambient hell pendulum and no Royal store',()=>{
  const jsx=read('OverswingJourney.jsx'),home=read('HellPendulum.jsx');
  const css=read('overswingJourney.css');
  const page=jsx.slice(jsx.indexOf("if(!run||view==='menu'||view==='map')"),jsx.indexOf("if(run.phase==='playing')"));
  assert.match(page,/<HellPendulum\/>/);
  assert.match(home,/className="oj-hell-pendulum-arm"/);
  assert.match(home,/shapeRendering="crispEdges"/);
  assert.match(css,/oj-hell-pendulum-swing 3\.2s steps\(15,end\)/);
});
