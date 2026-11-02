import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,stepOverswing,signed} from '../src/external/engines.js';
import {flipFlightResult,flipFlightPoints} from '../src/external/overswingFlipFlight.js';

const file=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');
test('a safe FLIP reveals the actual drawn card, which enters the Pot',()=>{
  const s=newOverswing({seed:20260401}),drawn=s.deal.deck[s.deal.pos];
  const next=stepOverswing(s,{type:'flip'});
  assert.equal(next.lastAction.type,'flip');
  assert.equal(next.lastAction.card,drawn);
  assert.equal(next.lastAction.snap,false);
  assert.equal(next.deal.pot.at(-1),drawn);
  assert.deepEqual(flipFlightResult(next.lastAction),{
    card:drawn,destination:'pot',shielded:false,zeroBreak:false
  });
});

test('ZERO BREAK still lands safely in the Pot; SNAP must not fly to it',()=>{
  const s=newOverswing({seed:20260402}),drawn=s.deal.deck[s.deal.pos];
  const value=signed(drawn);
  const zeroReady={...s,deal:{...s.deal,S:-value,plays:1,pot:[s.deal.hand[0]]}};
  const zero=stepOverswing(zeroReady,{type:'flip'});
  assert.equal(zero.lastAction.zeroBreak,true);
  assert.equal(flipFlightResult(zero.lastAction).destination,'pot');
  assert.equal(flipFlightResult(zero.lastAction).zeroBreak,true);
  const snapReady={...s,deal:{...s.deal,S:value>0?10:-10,plays:1,pot:[s.deal.hand[0]]}};
  const snapped=stepOverswing(snapReady,{type:'flip'});
  assert.equal(snapped.lastAction.snap,true);
  assert.equal(snapped.deal.pot.length,0);
  assert.deepEqual(flipFlightResult(snapped.lastAction),{
    card:drawn,destination:'snap',shielded:false,zeroBreak:false
  });
  assert.equal(flipFlightResult({type:'bank',card:drawn}),null);
  assert.equal(flipFlightResult({type:'steer',card:drawn}),null);
  assert.equal(flipFlightResult(null),null);
});

test('FLIP flight coordinates follow real button, readable center, and target',()=>{
  const props=flipFlightPoints(
    {left:40,top:630,width:140,height:60},
    {left:220,top:420,width:36,height:30},
    {width:390,height:844}
  );
  assert.deepEqual(props,{
    '--flip-start-x':'69px','--flip-start-y':'602px',
    '--flip-center-x':'154px','--flip-center-y':'313px',
    '--flip-end-x':'197px','--flip-end-y':'377px'
  });
  assert.throws(()=>flipFlightPoints(null,{},{}),TypeError);
});

test('FLIP flight is non-blocking, pixel stepped and replaces redundant event row',()=>{
  const jsx=file('OverswingPlay.jsx'),css=file('overswing.css');
  assert.match(jsx,/ref=\{flipButtonRef\}/);
  assert.match(jsx,/ref=\{potTargetRef\}/);
  assert.match(jsx,/ref=\{meterRef\}/);
  assert.match(jsx,/data-pot-card=\{potCard\?id:undefined\}/);
  assert.match(jsx,/flightHidden=\{flight\?\.destination==='pot'/);
  assert.match(jsx,/<Outcome e=\{s\.lastAction\}\/>/);
  assert.doesNotMatch(jsx,/className=\{'os8-event/);
  assert.match(jsx,/os8-flip-a11y/);
  assert.match(jsx,/createPortal\(/);
  assert.match(jsx,/prefers-reduced-motion: reduce/);
  assert.match(css,/os8-flip-flight-pot/);
  assert.match(css,/os8-flip-flight-snap/);
  assert.match(css,/os8-flip-to-pot/);
  assert.match(css,/os8-flip-to-snap/);
  assert.match(css,/animation-timing-function:steps\(11,end\)/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/os8-pot-flight-hidden/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.os8-flip-face-suit/);
});
