import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fluidFillPercent} from '../src/casual/presentation.js';
import {newRound,stepFirstLevel,FIRST_LEVEL} from '../src/casual/firstLevel.js';
import {overswingActions,overswingPayout} from '../src/external/engines.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('meter has one moving red needle and no fixed red zero line',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(board,/className="sgv-meter-needle"/);
 assert.doesNotMatch(board,/className="sgv-meter-centerline"/);
 assert.match(board,/style=\{\{left:percentage\+'%'\}\}/);
 assert.match(css,/\.sgv-meter-needle\{/);
});

test('two adjacent bottles replace the floating Pot and standalone Bank button',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(board,/export function PendingPot\(/);
 assert.match(board,/className=\{'sgv-pending-pot sgv-pot-bottle'/);
 assert.match(board,/disabled=\{!bankable\}/);
 assert.match(board,/onBank\?\.\(event\.currentTarget\)/);
 assert.match(board,/className="sgv-pot-bank-preview"/);
 assert.match(board,/BANK \+\{bankPreview\}/);
 assert.match(board,/className="sgv-fluid-fill"/);
 assert.match(board,/className="sgv-pot-liquid"/);
 assert.match(board,/<GoalProgress banked=\{banked\} target=\{target\}\/>/);
 assert.match(screen,/className="sgv-bottle-pair"/);
 assert.match(screen,/onBank=\{source=>play\(\{type:'bank'\},source\)\}/);
 assert.doesNotMatch(screen,/className="sgv-action sgv-bank"/);
 assert.doesNotMatch(screen,/className="sgv-gold-counter"/);
 assert.match(screen,/className="sgv-action sgv-flip"/);
 assert.match(css,/\.sgv-bottle-pair\{[\s\S]*?display:flex/);
 assert.match(css,/\.sgv-bottle-pair \.sgv-goal-progress\{/);
});

test('fluid fill is stable, monotone, capped and zero when empty',()=>{
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

test('currency is fluid, not stars or coins in either bottle',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const motion=read('src/casual/minimalMotion.js');
 assert.match(board,/export function DropletIcon/);
 assert.doesNotMatch(board,/CoinIcon|GoldPile|★/);
 assert.match(board,/<DropletIcon className="sgv-pot-drop"\/>/);
 assert.doesNotMatch(motion,/sgv-flying-gold|sgv-lost-coin/);
 assert.match(motion,/sgv-fluid-drop/);
 assert.match(motion,/sgv-pour-stream/);
});

test('tap-to-bank respects engine eligibility and previews actual payout',()=>{
 let round=newRound();
 const bankable=state=>overswingActions(state.game,FIRST_LEVEL.rules)
   .some(a=>a.type==='bank'&&a.dropIndex==null);
 assert.equal(bankable(round),false);
 round=stepFirstLevel(round,{type:'flip'});
 assert.equal(bankable(round),false);
 round=stepFirstLevel(round,{type:'flip'});
 assert.equal(bankable(round),true);
 assert.equal(overswingPayout(round.game,FIRST_LEVEL.rules),56);
 const next=stepFirstLevel(round,{type:'bank'});
 assert.equal(next.game.deal.T,56);
 assert.equal(next.game.deal.pot.length,0);
 assert.equal(bankable(next),false);
});

test('pour animation transfers engine payout, then unlocks controls',()=>{
 const motion=read('src/casual/minimalMotion.js');
 const screen=read('src/casual/SimplifiedGame.jsx');
 assert.match(motion,/export function animateBankPour\(/);
 assert.match(motion,/rotation:23/);
 assert.match(motion,/classList\.add\('sgv-pour-stream'\)/);
 assert.match(motion,/onTake\(\)/);
 assert.match(motion,/onCount\(Math\.round\(displayed\.value\)\)/);
 assert.match(motion,/onComplete\(\)/);
 assert.match(motion,/toScore-fromScore/);
 assert.match(screen,/cancelRef\.current=animateBankPour\(/);
 assert.match(screen,/busyRef\.current=true/);
 assert.match(motion,/export function animateSnapLoss\(/);
 assert.match(motion,/action\.type==='flip'\?\.22:\.08/);
});
