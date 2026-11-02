import test from 'node:test';
import assert from 'node:assert/strict';
import {swingImpactForAction} from '../src/external/overswingImpact.js';
import {newOverswing,stepOverswing} from '../src/external/engines.js';

test('only exact-zero and SNAP swing actions produce pixel impact events',()=>{
  assert.deepEqual(swingImpactForAction({type:'steer',zeroBreak:true,to:0}),
    {kind:'zero',side:'center'});
  assert.deepEqual(swingImpactForAction({type:'flip',zeroBreak:true,to:0}),
    {kind:'zero',side:'center'});
  assert.deepEqual(swingImpactForAction({type:'steer',snap:true,to:12}),
    {kind:'snap',side:'right'});
  assert.deepEqual(swingImpactForAction({type:'flip',snap:true,to:-11}),
    {kind:'snap',side:'left'});
  assert.equal(swingImpactForAction({type:'steer',swung:true,from:-1,to:2}),null);
  assert.equal(swingImpactForAction({type:'flip',from:0,to:2}),null);
  assert.equal(swingImpactForAction({type:'bank',zeroBreak:true,snap:true}),null);
  assert.equal(swingImpactForAction(null),null);
});

test('real engine ZERO BREAK and SNAP trigger respective impact visuals',()=>{
  const original=newOverswing({seed:719});
  const zeroStart={...original,deal:{...original.deal,
    hand:[1],S:-2,plays:1,pot:[0],W:3,flipFactor:4,jackpotFactor:2}};
  const zero=stepOverswing(zeroStart,{type:'steer',index:0});
  assert.equal(zero.lastAction.zeroBreak,true);
  assert.deepEqual(swingImpactForAction(zero.lastAction),{kind:'zero',side:'center'});
  assert.equal(zero.deal.W,0);
  assert.equal(zero.deal.pot.length,2,'zero break keeps pot');

  const snapStart={...original,deal:{...original.deal,
    hand:[2],S:9,plays:1,pot:[0]}};
  const snapped=stepOverswing(snapStart,{type:'steer',index:0});
  assert.equal(snapped.lastAction.snap,true);
  assert.deepEqual(swingImpactForAction(snapped.lastAction),{kind:'snap',side:'right'});
  assert.deepEqual(snapped.deal.pot,[],'SNAP loses the pot');

  const crossingStart={...original,deal:{...original.deal,
    hand:[2],S:-1,plays:1}};
  const crossing=stepOverswing(crossingStart,{type:'steer',index:0});
  assert.equal(crossing.lastAction.swung,true);
  assert.equal(swingImpactForAction(crossing.lastAction),null,
    'a safe crossing must not look like a ZERO BREAK');
});
