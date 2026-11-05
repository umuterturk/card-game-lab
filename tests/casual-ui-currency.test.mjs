import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fluidFillPercent,bankPourAmounts,visiblePotPayout} from '../src/casual/presentation.js';
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
 assert.doesNotMatch(board,/sgv-pot-bank-preview|bankPreview/);
 assert.doesNotMatch(css,/sgv-pot-bank-preview/);
 assert.match(board,/className="sgv-pot-amount"/);
 assert.match(css,/sgv-bankable-shine/);
 assert.match(css,/sgv-bankable-breathe/);
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

test('Pot physically approaches the Bank lip, streams briefly, then returns home',()=>{
 const motion=read('src/casual/minimalMotion.js');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const board=read('src/casual/MinimalBoard.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(motion,/export function animateBankPour\(/);
 assert.match(motion,/const angle=56/);
 assert.match(motion,/rotatedLip=point\(lip,root\)/);
 assert.match(motion,/targetLip=\{/);
 assert.match(motion,/tl\.to\(source,\{x:approach\.x,y:approach\.y,rotation:angle/);
 assert.match(motion,/start=point\(lip,root\),end=point\(mouth,root\)/);
 assert.match(motion,/classList\.add\('sgv-pour-stream'\)/);
 assert.match(motion,/tl\.to\(source,\{x:0,y:0,rotation:0/);
 assert.match(motion,/onPourProgress\?\.\(pot\)/);
 assert.match(motion,/onCount\(secured\)/);
 assert.match(motion,/onTake\(\)/);
 assert.match(motion,/onComplete\(\)/);
 assert.match(screen,/onPourProgress:rawPot=>setView/);
 assert.match(screen,/potValue:change\.rawPotBefore/);
 assert.match(screen,/cancelRef\.current=animateBankPour\(/);
 assert.match(board,/className="sgv-pot-pour-lip"/);
 assert.match(board,/className="sgv-pot-bottle-mouth"/);
 assert.doesNotMatch(board,/className="sgv-pot-bottle-rim"/);
 assert.match(css,/\.sgv-pot-bottle-mouth\{/);
 assert.match(motion,/export function animateSnapLoss\(/);
});

test('actual Bank value and raw Pot drain are synchronized through the entire pour',()=>{
 const samples=[0,.02,.25,.5,.75,.98,1].map(p=>bankPourAmounts(7,10,66,p));
 assert.equal(samples[0].pot,7);
 assert.equal(samples[0].secured,10);
 assert.equal(samples.at(-1).pot,0);
 assert.equal(samples.at(-1).secured,66);
 for(let i=1;i<samples.length;i++){
   assert.ok(samples[i].pot<samples[i-1].pot,'Pot decreases from the very start');
   assert.ok(samples[i].secured>=samples[i-1].secured,'Bank total never drops');
 }
 assert.deepEqual(bankPourAmounts(7,10,66,-1),{pot:7,secured:10});
 assert.deepEqual(bankPourAmounts(7,10,66,2),{pot:0,secured:66});
 assert.ok(fluidFillPercent(3.5,24,{max:76,smooth:true})<
           fluidFillPercent(7,24,{max:76,smooth:true}));
 assert.equal(fluidFillPercent(0,24,{max:76,smooth:true}),0);
});

test('approved visual cleanup is reflected in styling and version markup',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const css=read('src/casual/minimal.css');
 const html=read('casual.html');
 assert.match(css,/\.sgv-multiplier-pill::before\{display:none\}/);
 assert.match(css,/\.sgv-bottle-pair \.sgv-goal-progress\{[\s\S]*?background:transparent;border:0/);
 assert.match(css,/\.sg-foreground-leaves path\{/);
 assert.match(css,/@keyframes sgv-wind-leaf/);
 assert.match(css,/\.sg-cloud-one\{animation-duration:23s\}/);
 assert.match(css,/\.sg-waterfall path:nth-child\(3\)/);
 assert.doesNotMatch(board,/sgv-pot-bottle-rim/);
 assert.match(html,/border:0;background:transparent/);
 assert.match(html,/font:500 9px/);
});


test('P0 regression: Pot bottle receives touch and pointer events when Bank is legal',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const css=read('src/casual/minimal.css');
 const bottleRule=css.match(/\.sgv-bottle-pair \.sgv-pending-pot\s*\{([^}]*)\}/);
 assert.ok(bottleRule,'two-bottle button rule exists');
 assert.match(bottleRule[1],/pointer-events:\s*auto\s*;/,
   'Pot bottle must not inherit decorative pointer-events:none');
 assert.match(bottleRule[1],/touch-action:\s*manipulation\s*;/);
 const oldRule=css.match(/\.sgv-pending-pot\s*\{([^}]*)\}/);
 assert.ok(oldRule);
 assert.doesNotMatch(oldRule[1],/pointer-events:\s*none/,
   'old decorative Pot style must not block touch on real button');
 assert.match(board,/onClick=\{event=>onBank\?\.\(event\.currentTarget\)\}/);
 assert.match(board,/disabled=\{!bankable\}/);
});

test('normal Bank stays eligible after three safe played cards',()=>{
 let round=newRound();
 for(let i=0;i<3;i++){
   const next=stepFirstLevel(round,{type:'steer',index:0});
   assert.notStrictEqual(next,round,'steer must be legal in first three turns');
   assert.equal(next.snaps,0,'the three-card sequence must remain safe');
   round=next;
 }
 const legal=overswingActions(round.game,FIRST_LEVEL.rules);
 assert.ok(legal.some(a=>a.type==='bank'&&a.dropIndex==null),
   'Bank must be available after three safe card plays');
 const payout=overswingPayout(round.game,FIRST_LEVEL.rules);
 assert.ok(payout>0);
 const after=stepFirstLevel(round,{type:'bank'});
 assert.equal(after.game.deal.T,round.game.deal.T+payout);
 assert.equal(after.game.deal.pot.length,0);
});

test('Pot number and fluid represent engine payout, never the unmultiplied raw cards',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const screen=read('src/casual/SimplifiedGame.jsx');
 const css=read('src/casual/minimal.css');
 assert.equal(visiblePotPayout(18,9,9),18);
 assert.equal(visiblePotPayout(18,9,4.5),9);
 assert.equal(visiblePotPayout(18,9,0),0);
 assert.equal(visiblePotPayout(18,9,-1),0);
 assert.equal(visiblePotPayout(18,9,500),18);
 assert.equal(visiblePotPayout(0,9,9),0);
 assert.equal(visiblePotPayout(18,0,0),0);
 assert.equal(visiblePotPayout(18,9,Number.NaN),18);
 assert.ok(fluidFillPercent(9,24,{max:76,smooth:true})<
           fluidFillPercent(18,24,{max:76,smooth:true}));
 assert.match(screen,/visiblePotPayout\(potentialPayout,rawPotValue\(deal\),view\.rawPot\)/);
 assert.match(screen,/<PendingPot value=\{potDisplay\}/);
 assert.match(board,/sgv-pot-amount/);
 assert.doesNotMatch(board,/sgv-pot-bank-preview|bankPreview/);
 assert.doesNotMatch(css,/sgv-pot-bank-preview/);
});

test('only a bankable Pot shines; touch remains possible and reduced motion is respected',()=>{
 const board=read('src/casual/MinimalBoard.jsx');
 const css=read('src/casual/minimal.css');
 assert.match(board,/bankable\?' sgv-pot-bankable':'/);
 assert.match(board,/disabled=\{!bankable\}/);
 assert.match(board,/onClick=\{event=>onBank\?\.\(event\.currentTarget\)\}/);
 assert.match(css,/\.sgv-bottle-pair \.sgv-pot-bankable \.sgv-pot-bottle-glass\{/);
 assert.match(css,/\.sgv-pot-bankable \.sgv-pot-glass-shine\{/);
 assert.match(css,/@keyframes sgv-bankable-shine/);
 assert.match(css,/@keyframes sgv-bankable-breathe/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\s*\.sgv-pot-bankable/);
});

