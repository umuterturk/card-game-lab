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

test('minimal prepare shows portrait, four rules, buy-only Royals, and a fight button',()=>{
  const jsx=read('OverswingJourney.jsx');
  const prepare=jsx.slice(jsx.indexOf("if(view==='prepare')"),jsx.indexOf("if(!run||view==='menu'||view==='map')"));
  const home=jsx.slice(jsx.indexOf("if(!run||view==='menu'||view==='map')"),jsx.indexOf("if(run.phase==='playing')"));
  assert.match(prepare,/EnemyPortrait/);
  assert.match(prepare,/oj-prep-rules/);
  assert.match(prepare,/<RoyalWorkshop progress=\{progress\}/);
  assert.match(prepare,/begin\(selectedLevel\)/);
  assert.doesNotMatch(prepare,/onToggle|PREPARE YOUR JOURNEY/);
  assert.match(home,/OverswingCampaignMap/);
  assert.doesNotMatch(home,/RoyalWorkshop|ROYAL_PRICES|WildInventory/);
});

test('cinematic intro fades in, sparkles, then shrinks into prepare on player tap',()=>{
  const jsx=read('OverswingJourney.jsx'),intro=read('OverswingEnemy.jsx');
  const css=read('overswingEnemy.css');
  assert.match(jsx,/setIntroVisible\(true\)/);
  assert.match(jsx,/setIntroClosing\(true\)/);
  assert.match(intro,/TAP TO PREPARE/);
  assert.match(intro,/oe-intro-embers/);
  assert.match(css,/oe-intro-exit \.oe-intro-art/);
  assert.match(css,/prefers-reduced-motion:reduce/);
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
  assert.match(jsx,/settled\.ownedRoyalIds/);
  assert.match(jsx,/BUY ONCE · ALWAYS ACTIVE/);
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
