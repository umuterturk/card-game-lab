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

test('mobile preparation highlights level limit and simplifies tall Royal section',()=>{
  const play=read('OverswingPlay.jsx');
  const journey=read('OverswingJourney.jsx');
  const controls=read('OverswingSoundControls.jsx');
  assert.doesNotMatch(play,/os8-meter-ends/);
  assert.match(play,/DECK \{deckRemaining\}/);
  assert.match(play,/d\.deck\.length-d\.pos/);
  assert.match(journey,/oj-prepare-snap/);
  assert.match(journey,/level\.rules\.snapLimit\?\?10/);
  assert.match(journey,/aria-expanded=\{expanded\}/);
  assert.match(journey,/expanded&&<>/);
  assert.match(controls,/<MusicNoteIcon\/>/);
  assert.match(controls,/sound\.restartAudio/);
});
