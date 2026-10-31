import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing} from '../src/external/engines.js';
import {runBenchmark,STRATEGIES} from '../experiments/overswing-v13-benchmark.mjs';

test('v13 JACKPOT rises linearly on FLIP crossings, not noncrossing FLIPs',()=>{
  const hand=[20,22,24,26,28,30,32,34];
  const prefix=[1,0,21]; // +2, +1, -2
  const used=new Set([...hand,...prefix]);
  const deck=[...hand,...prefix,...Array.from({length:40},(_,i)=>i).filter(i=>!used.has(i))];
  let s=newOverswing({deckOverride:deck});
  s={...s,deal:{...s.deal,S:-1,jackpotFactor:4,plays:1,pot:[33]}};
  s=stepOverswing(s,{type:'flip'}); // -1 -> +1
  assert.equal(s.deal.jackpotFactor,5);
  s=stepOverswing(s,{type:'flip'}); // +1 -> +2, no crossing
  assert.equal(s.deal.jackpotFactor,5);
  s=stepOverswing(s,{type:'flip'}); // +2 -> 0 ZERO BREAK
  assert.equal(s.lastAction.zeroBreak,true);
  assert.equal(s.deal.jackpotFactor,1);
});

test('all nine benchmark strategies terminate on shared seeds and settle scores',()=>{
  assert.equal(STRATEGIES.length,9);
  const rows=runBenchmark(12,720000);
  assert.equal(rows.length,108);
  for(const r of rows){
    assert.equal(r.score,r.bankPoints);
    assert.ok(r.turns>0 && r.turns<120);
    assert.ok(r.flips+r.steers+r.banks<=r.turns);
    assert.ok(Number.isSafeInteger(r.score)&&r.score>=0);
  }
  for(let i=0;i<12;i++){
    assert.deepEqual(rows.slice(i*9,i*9+9).map(r=>r.seed),Array(9).fill(720000+i));
  }
});

test('benchmark deterministic and accepts chosen strategy subset',()=>{
  const subset=['fixed_bank_flip','fixed_bank_steer','fixed_bank_signal','fixed_bank_exact'];
  const one=runBenchmark(4,730000,subset);
  assert.deepEqual(runBenchmark(4,730000,subset),one);
  assert.deepEqual(one.filter(r=>r.seed===730000).map(r=>r.strategy),subset);
});
