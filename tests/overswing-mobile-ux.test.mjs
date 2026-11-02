import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,stepOverswing} from '../src/external/engines.js';
import {royalId} from '../src/external/overswingRoyals.js';

const read=file=>readFileSync(new URL('../src/external/'+file,import.meta.url),'utf8');

test('Jack Scout points at next actual flip even after a hand refill',()=>{
  const start=newOverswing({seed:73});
  const jack=royalId('J',0);
  const state={...start,deal:{...start.deal,
    hand:[jack],handCap:4,S:-2,plays:1,scoutNext:null}};
  const result=stepOverswing(state,{type:'steer',index:0});
  assert.notEqual(result,state);
  assert.equal(result.lastAction.snap,false);
  assert.equal(result.deal.hand.length,4,'playing the last hand card refills');
  assert.equal(result.deal.scoutNext,result.deal.deck[result.deal.pos]);
  assert.equal(result.lastAction.scouted,result.deal.scoutNext);
  const flipped=stepOverswing(result,{type:'flip'});
  assert.equal(flipped.lastAction.card,result.deal.scoutNext);
  assert.equal(flipped.deal.scoutNext,null,'preview is consumed by the next FLIP');
});

test('Flip displays the scouted card; Queen auto-plays the sole safe direction',()=>{
  const code=read('OverswingPlay.jsx');
  assert.match(code,/scoutedFlip=canFlip\?d\.scoutNext:null/);
  assert.match(code,/os8-next-flip-card/);
  assert.match(code,/name\(scoutedFlip\)/);
  assert.match(code,/signed\(scoutedFlip\)/);
  assert.match(code,/SCOUTED · NEXT CARD/);
  assert.doesNotMatch(code,/className="os8-scout-preview"/);
  assert.match(code,/safeDirections=legal\.filter/);
  assert.match(code,/Math\.abs\(d\.S\+a\.direction\*12\)<=limit/);
  assert.match(code,/safeDirections\.length===1/);
  assert.match(code,/direction:safeDirections\[0\]\.direction/);
  assert.match(code,/setQueenPick\(index\)/);
  assert.equal([-1,1].filter(direction=>Math.abs(-5+direction*12)<=10).length,1);
  assert.equal([-1,1].filter(direction=>Math.abs(0+direction*12)<=10).length,0);
});

test('mobile gate briefing uses compact rule chips and Market holds Royals',()=>{
  const play=read('OverswingPlay.jsx');
  const journey=read('OverswingJourney.jsx');
  const briefing=read('OverswingGateBriefing.jsx');
  const market=read('OverswingMarket.jsx');
  const controls=read('OverswingSoundControls.jsx');
  assert.doesNotMatch(play,/os8-meter-ends/);
  assert.match(play,/DECK \{deckRemaining\}/);
  assert.match(play,/d\.deck\.length-d\.pos/);
  assert.match(journey,/oj-market-button/);
  assert.doesNotMatch(journey,/view==='prepare'/);
  assert.match(briefing,/og-rules/);
  assert.match(briefing,/campaignRuleLabels\(level\)/);
  assert.match(market,/AUTO-EQUIPPED/);
  assert.match(controls,/<MusicNoteIcon\/>/);
  assert.match(controls,/sound\.restartAudio/);
});


test('action summaries stay accessible but never shift the board',()=>{
  const jsx=read('OverswingPlay.jsx');
  const actionBlock=jsx.slice(jsx.indexOf('const multiplierDetails='),jsx.indexOf('if(fullView&&helpOpen)'));
  assert.match(actionBlock,/className="os8-flip-a11y"/);
  assert.match(actionBlock,/role="status" aria-live="polite"/);
  assert.doesNotMatch(actionBlock,/className=\{'os8-event/);
  assert.doesNotMatch(actionBlock,/<div className="os8-event"/);
  const css=read('overswing.css');
  assert.match(css,/\.os8-flip-a11y\{position:absolute/);
});

test('hand always shows eight positions, with pale X markers on locked slots',()=>{
  const jsx=read('OverswingPlay.jsx');
  const css=read('overswingVisualFix.css');
  assert.match(jsx,/const MAX_HAND_SLOTS=8/);
  assert.match(jsx,/Array\.from\(\{length:MAX_HAND_SLOTS\}/);
  assert.match(jsx,/index>=d\.handCap/);
  assert.match(jsx,/os8-hand-slot-locked/);
  assert.match(jsx,/os8-hand-slot-empty/);
  assert.match(jsx,/os8-hand-slot-occupied/);
  assert.match(jsx,/locked&&<span aria-hidden="true">×<\/span>/);
  assert.match(css,/\.os8-hand \.os8-hand-slot\{/);
  assert.match(css,/\.os8-hand \.os8-hand-slot-locked\{/);
  assert.match(css,/\.os8-hand \.os8-hand-slot-locked>span\{/);
  assert.match(css,/opacity:\.55/);
});

test('Queen shows no directional suit/type, and a single ±12 value',()=>{
  const jsx=read('OverswingPlay.jsx');
  assert.match(jsx,/const isQueen=royalRank\(id\)==='Q'/);
  assert.match(jsx,/const cardName=isQueen\?'Q':name\(id\)/);
  assert.match(jsx,/const cardValue=isQueen\?'±12':val\(signed\(id\)\)/);
  assert.match(jsx,/isQueen\?'os8-queen'/);
  assert.match(jsx,/royal==='Q'\?'':o\.snap/);
  assert.match(jsx,/!isQueen&&<strong className="os8-flip-face-suit"/);
  assert.match(jsx,/isQueen\?'±12':val\(signed\(flight\.card\)\)/);
});


test('five seconds without a move highlights only enabled game actions',()=>{
  const jsx=read('OverswingPlay.jsx');
  const css=read('overswingVisualFix.css');
  assert.match(jsx,/const \[idleHint,setIdleHint\]=useState\(false\)/);
  assert.match(jsx,/window\.setTimeout\(\(\)=>\{timeout=null;setIdleHint\(true\);\},5000\)/);
  assert.match(jsx,/window\.clearTimeout\(timeout\)/);
  assert.match(jsx,/window\.addEventListener\('pointerdown',reset/);
  assert.match(jsx,/window\.addEventListener\('touchstart',reset/);
  assert.match(jsx,/window\.addEventListener\('keydown',reset\)/);
  assert.match(jsx,/document\.addEventListener\('visibilitychange',reset\)/);
  assert.match(jsx,/!document\.hidden/);
  assert.match(jsx,/s\.lastAction,s\.dealIndex,s\.seed/);
  assert.match(jsx,/!historyOpen&&\s*!polarityPick&&queenPick===null&&!helpOpen/);
  assert.match(jsx,/\(idleHint\?' os8-idle':''\)/);
  assert.match(css,/\.os8:not\(\.os8-idle\) \.os8-actions button:not\(:disabled\)/);
  assert.match(css,/\.os8\.os8-idle \.os8-hand \.os8-card:not\(:disabled\)/);
  assert.match(css,/\.os8\.os8-idle \.os8-abilities button:not\(:disabled\)/);
  assert.match(css,/animation:os8-action-heartbeat 5s ease-in-out infinite/);
  assert.match(css,/@keyframes os8-action-heartbeat\{\s*0%,3%,42%,100%/);
  assert.match(css,/19%\{transform:scale\(1\.07\);filter:brightness\(1\.35\)/);
  assert.match(css,/animation:os8-gold-sweep 5s ease-in-out infinite/);
  assert.match(css,/@keyframes os8-gold-sweep\{/);
  assert.match(css,/33%\{opacity:1;transform:translateX\(240%\)\}/);
  assert.match(css,/\.os8\.os8-idle \.os8-actions button:not\(:disabled\)::after/);
  assert.match(css,/\.os8\.os8-idle \.os8-hand \.os8-card:not\(:disabled\)::after/);
  assert.match(css,/\.os8\.os8-idle \.os8-abilities button:not\(:disabled\)::after/);
  assert.match(css,/mix-blend-mode:screen/);
  assert.match(css,/pointer-events:none/);
  assert.doesNotMatch(css,/os8-action-heartbeat 2s/);
  assert.doesNotMatch(css,/animation-delay:\.14s|animation-delay:\.28s/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
