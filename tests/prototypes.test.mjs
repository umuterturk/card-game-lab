import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPrototype,prototypeActions,prototypeStep,prototypeView,prototypeIds} from '../src/prototypes/engines.js';
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(const id of prototypeIds){
 test(`${id} has valid starting state and a playable turn`,()=>{
  const s=createPrototype(id,seeded(Number(id)*2017));
  assert.equal(s.id,id);
  assert.equal(s.score,0);
  const actions=prototypeActions(s);
  assert.ok(actions.length>0);
  assert.ok(prototypeView(s).zones.length>0);
  assert.notEqual(prototypeStep(s,actions[0]),s);
 });
 test(`${id} 100 seeded legal games terminate and bank nonnegative points`,()=>{
  for(let seed=1;seed<=100;seed++){
   const rng=seeded(seed*971+Number(id));
   let s=createPrototype(id,rng),steps=0;
   while(!s.finished&&steps<100){
    const all=prototypeActions(s);
    assert.ok(all.length,`No action in ${id} seed ${seed} turn ${steps}`);
    // Mix deliberate place choices with occasional bank/risk; don't get stuck only banking.
    const consuming=all.filter(x=>!['bank','cash'].includes(x.type));
    let pool=consuming.length?consuming:all;
    if(steps%6===5&&all.some(a=>['bank','cash'].includes(a.type)))pool=all;
    const a=pool[Math.floor(rng()*pool.length)];
    const before=s.deck.length+s.hand.length;
    const next=prototypeStep(s,a);
    assert.notEqual(next,s,`${id} ignored ${JSON.stringify(a)}`);
    assert.ok(next.deck.length+next.hand.length<=before);
    assert.ok(next.score>=0 && Number.isFinite(next.score));
    s=next;steps++;
   }
   assert.ok(s.finished,`${id} seed ${seed} did not finish after ${steps} actions`);
   assert.equal(s.deck.length+s.hand.length,0);
   assert.equal(prototypeActions(s).length,0);
  }
 });
}
