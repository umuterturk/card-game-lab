import test from 'node:test';
import assert from 'node:assert/strict';
import {meterPercent,meterMarks} from '../src/casual/meterScale.js';

test('all nine visible Level 1 numbers use accurate positions in the same meter scale',()=>{
  const marks=meterMarks(8);
  assert.deepEqual(marks,[-8,-6,-4,-2,0,2,4,6,8]);
  assert.deepEqual(marks.map(n=>meterPercent(n,8)),[0,12.5,25,37.5,50,62.5,75,87.5,100]);
  for(const n of marks){
    // Both the marker and its matching label use meterPercent(n, limit).
    assert.equal(meterPercent(n,8),50+50*n/8);
  }
});

test('markers clamp within the same physical scale, including a Snap overshoot',()=>{
  assert.equal(meterPercent(-11,8),0);
  assert.equal(meterPercent(11,8),100);
  assert.equal(meterPercent(0,8),50);
  assert.equal(meterPercent(3,8),68.75);
  assert.equal(meterPercent(-1,8),43.75);
});

test('other integer Snap limits have a readable symmetric scale',()=>{
  for(const limit of [4,6,9,10,12]){
    const ticks=meterMarks(limit);
    assert.equal(ticks[0],-limit);
    assert.equal(ticks.at(-1),limit);
    assert.ok(ticks.includes(0));
    assert.ok(ticks.every(Number.isInteger));
    assert.deepEqual(ticks, ticks.toSorted((a,b)=>a-b));
    assert.equal(meterPercent(-limit,limit),0);
    assert.equal(meterPercent(limit,limit),100);
    assert.equal(meterPercent(0,limit),50);
  }
});
