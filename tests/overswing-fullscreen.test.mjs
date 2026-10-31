import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isOverswingFullView} from '../src/external/overswingViewMode.js';
import {newOverswing,stepOverswing} from '../src/external/engines.js';
import {OVERSWING_TUTORIAL_INTRO,OVERSWING_TUTORIAL_STEPS} from '../src/external/overswingTutorial.js';

function source(name){return readFileSync(new URL(name,import.meta.url),'utf8');}

test('view=full activates from root, query before hash or query inside hash',()=>{
  assert.equal(isOverswingFullView('/','?view=full'),true);
  assert.equal(isOverswingFullView('/play/overswing','?view=full'),true);
  assert.equal(isOverswingFullView('/play/overswing?view=full',''),true);
  assert.equal(isOverswingFullView('/?view=full',''),true);
  assert.equal(isOverswingFullView('/play/overswing?mode=test','?view=full'),true);
  assert.equal(isOverswingFullView('/play/overswing','?view=normal'),false);
  assert.equal(isOverswingFullView('/play/kindling','?view=full'),false);
  assert.equal(isOverswingFullView('/games/overswing','?view=full'),false);
  assert.equal(isOverswingFullView('/play/overswing',''),false);
});

test('all Overswing game-facing copy and tutorial instructions are English',()=>{
  const files=[
    source('../src/external/OverswingPlay.jsx'),
    source('../src/external/OverswingJourney.jsx'),
    source('../src/external/overswingTutorial.js'),
    source('../src/external/overswingJourneyContent.js')
  ];
  const engine=source('../src/external/engines.js');
  files.push(engine.slice(engine.indexOf('export function newOverswing('),engine.indexOf('export const overswingFinal')));
  for(const text of files){
    assert.doesNotMatch(text,/[çğıöşüÇĞİÖŞÜ]/,'Turkish UI text remains');
    assert.doesNotMatch(text,/['"]tr-TR['"]/,'Turkish number formatting remains');
  }
  assert.deepEqual(OVERSWING_TUTORIAL_INTRO.map(item=>item.term),['FLIP','STEER','POT','SCORE']);
  assert.ok(OVERSWING_TUTORIAL_STEPS.every(step=>/^[\x00-\x7F\u2013\u2014\u2192\u2212\u00D7\u2660\u2665\u2666\u2663]*$/.test(
    step.title+step.instruction+step.why)));
  const s=newOverswing({mode:'tutorial',seed:2026});
  assert.match(s.last,/Learn FLIP/i);
  const started=stepOverswing(s,{type:'tutorial-start'});
  assert.match(started.last,/highlighted FLIP/i);
});

test('full-screen renderer removes site chrome and resizes on viewport changes',()=>{
  const app=source('../src/App.jsx');
  const external=source('../src/external/ExternalPlay.jsx');
  const fit=source('../src/external/FullscreenFit.jsx');
  const root=source('../src/styles.css');
  assert.match(app,/isOverswingFullView\(route,window\.location\.search\)/);
  assert.match(app,/if\(fullView\)return <div className="overswing-fullscreen"/);
  assert.match(external,/fullView\)return <FullscreenFit>/);
  assert.match(fit,/ResizeObserver/);
  assert.match(fit,/visualViewport/);
  assert.match(fit,/scrollHeight/);
  assert.match(root,/html\.overswing-full-active/);
  assert.match(root,/height:100dvh/);
  assert.match(root,/overflow:hidden/);
});

test('full-screen keeps interactive cards, bank and tutorial without scrollable pot',()=>{
  const board=source('../src/external/OverswingPlay.jsx');
  const css=source('../src/external/overswing.css');
  assert.match(board,/fullView\?d\.pot\.slice\(-6\):d\.pot/);
  assert.match(board,/os8-pot-overflow/);
  assert.match(board,/className=\{'os8'\+\(fullView/);
  assert.match(board,/journeyActions\(journey\)/);
  assert.match(board,/GOT IT — START/);
  assert.match(board,/BACK TO GAME/);
  assert.match(css,/\.os8-full \.os8-handcards/);
  assert.match(css,/\.os8-full \.os8-actions/);
  assert.match(css,/\.os8-full \.os8-potcards\{display:flex;overflow:hidden/);
});
