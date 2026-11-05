import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fluidFillPercent} from '../src/casual/presentation.js';
import {newRound,stepFirstLevel,FIRST_LEVEL} from '../src/casual/firstLevel.js';
import {overswingPayout} from '../src/external/engines.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the approved fluid UI has one moving red needle and no fixed red zero line',()=>{
  const board=read('src/casual/MinimalBoard.jsx');
  const css=read('src/casual/minimal.css');
  assert.match(board,/className="sgv-meter-needle"/);
  assert.doesNotMatch(board,/className="sgv-meter-centerline"/);
  assert.match(board,/style=\{\{left:percentage\+'%'\}\}/);
  assert.match(css,/\.sgv-meter-needle\{/);
});

test('the goal is attached to the compact fluid tank, not floating over the hand',()=>{
  const board=read('src/casual/MinimalBoard.jsx');
  const game=read('src/casual/SimplifiedGame.jsx');
  const css=read('src/casual/minimal.css');
  assert.match(board,/<GoalProgress banked=\{banked\} target=\{target\}\/>/);
  assert.match(board,/className="sgv-fluid-fill"/);
  assert.match(board,/className="sgv-pot-liquid"/);
  assert.match(css,/\.sgv-chest-art\{\s*width:clamp\(180px,54vw,295px\)/);
  assert.match(css,/\.sgv-goal-progress\{\s*position:absolute;z-index:10;left:50%/);
  assert.doesNotMatch(game,/\<GoalProgress banked=/);
});

test('fluid percentage is stable, monotone, capped, and empty at zero',()=>{
  assert.equal(fluidFillPercent(0,24),0);
  assert.equal(fluidFillPercent(-5,24),0);
  assert.equal(fluidFillPercent(5,24),16);
  assert.equal(fluidFillPercent(24,24),78);
  assert.equal(fluidFillPercent(48,24),78);
  assert.equal(fluidFillPercent(0,24,{max:76}),0);
  assert.equal(fluidFillPercent(24,24,{max:76}),76);
  assert.equal(fluidFillPercent(5,0),0);
  let last=0;
  for(let n=0;n<=100;n++){
    const current=fluidFillPercent(n,24);
    assert.ok(current>=last);
    assert.ok(current<=78);
    last=current;
  }
});

test('only fluid drops are used for currency; stars remain level decorations',()=>{
  const board=read('src/casual/MinimalBoard.jsx');
  const screen=read('src/casual/SimplifiedGame.jsx');
  const motion=read('src/casual/minimalMotion.js');
  assert.match(board,/export function DropletIcon/);
  assert.doesNotMatch(board,/CoinIcon|GoldPile|★/);
  assert.match(board,/<DropletIcon className="sgv-pot-drop"\/>/);
  assert.match(screen,/<DropletIcon className="sgv-gold-icon"\/>/);
  assert.match(screen,/<DropletIcon className="sgv-bank-coin"\/>/);
  assert.match(screen,/<span className="sgv-bank-title">BANK<\/span>/);
  assert.match(screen,/overswingPayout\(game,FIRST_LEVEL\.rules\)/);
  assert.doesNotMatch(motion,/sgv-flying-gold|sgv-lost-coin/);
  assert.match(motion,/sgv-fluid-drop/);
});

test('Bank and Snap preserve engine totals while fluid changes presentation only',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'flip'});
  round=stepFirstLevel(round,{type:'flip'});
  assert.equal(overswingPayout(round.game,FIRST_LEVEL.rules),56);
  const after=stepFirstLevel(round,{type:'bank'});
  assert.equal(after.game.deal.T,56);
  assert.equal(after.game.deal.pot.length,0);
  const motion=read('src/casual/minimalMotion.js');
  assert.match(motion,/export function animateSnapLoss\(root,lostPot\)/);
  assert.match(motion,/onCount\(Math\.round\(displayed\.value\)\)/);
  assert.match(motion,/reward\.textContent='\+'\+\(toScore-fromScore\)/);
  assert.match(motion,/action\.type==='flip'\?\.22:\.08/);
});
