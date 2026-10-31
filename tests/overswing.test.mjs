import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,overswingMultiplier,applySwing,signed} from '../src/external/engines.js';
const O=[32,2,6,29,12,15,34,16,31,1,13,35,26,3,18,10,5,11,27,4,28,21,37,38,7,19,36,14,25,20,8,39,23,0,24,9,22,33,17,30];
const deckWith=prefix=>[...prefix,...Array.from({length:40},(_,i)=>i).filter(x=>!prefix.includes(x))];
const go=(s,a)=>{const n=stepOverswing(s,a);assert.notStrictEqual(n,s,'Rejected '+JSON.stringify(a));return n;};
test('v8 starts with eight cards and correct suit signs',()=>{
 const s=newOverswing({deckOverride:O});
 assert.equal(s.version,8);assert.equal(s.deal.handCap,8);
 assert.deepEqual(s.deal.hand,O.slice(0,8));assert.equal(s.deal.pos,8);
 assert.equal(overswingActions(s).filter(a=>a.type==='steer').length,8);
 assert.ok(overswingActions(s).some(a=>a.type==='flip'));
 assert.ok(!overswingActions(s).some(a=>a.type==='bank'));
 for(let id=0;id<40;id++)assert.equal(signed(id),(id<20?1:-1)*(id%10+1));
});
test('all flipped cards go directly to Pot, including crosses',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,31,1]);
 let s=newOverswing({deckOverride:deck});
 s=go(s,{type:'flip'}); // -2
 assert.deepEqual(s.deal.pot,[31]);assert.equal(s.lastFlip.destination,'pot');
 s=go(s,{type:'flip'}); // +2 -> 0
 assert.deepEqual(s.deal.pot,[31,1]);assert.equal(s.lastFlip.destination,'pot');
 assert.equal(s.deal.hand.length,8);
 assert.equal(s.deal.crossFactor,2);assert.equal(s.deal.comboFactor,2);
});
test('non-crossing FLIP sequence grows base FLIP factor ×2 ×3 ×4',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,1,2,3]);
 let s=newOverswing({deckOverride:deck});
 s=go(s,{type:'flip'});assert.equal(s.deal.flipFactor,2);
 s=go(s,{type:'flip'});assert.equal(s.deal.flipFactor,3);
 assert.equal(s.deal.comboFactor,2);
 s=go(s,{type:'flip'});assert.equal(s.deal.flipFactor,4);
 assert.equal(s.deal.comboFactor,2);
 assert.equal(s.deal.crossFactor,1);
 assert.equal(s.deal.flipStreak,3);
 assert.equal(overswingPayout(s),(2+3+4)*4*2);
});
test('3rd consecutive FLIP crosses: separate ×2 series and ×3 third-cross plus ×2 crossing',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,31,33,18]);
 let s=newOverswing({deckOverride:deck});
 s=go(s,{type:'flip'}); // -2: flip factor 2
 s=go(s,{type:'flip'}); // -6: flip factor 3, combo x2
 s=go(s,{type:'flip'}); // +3: W gain2 => W3, crossing x2, combo x3 more
 assert.equal(s.deal.S,3);assert.equal(s.deal.W,2);
 assert.equal(s.deal.flipFactor,3);assert.equal(s.deal.comboFactor,6);
 assert.equal(s.deal.crossFactor,2);assert.equal(s.deal.zeroFactor,1);
 assert.equal(overswingMultiplier(s.deal),108);
 assert.equal(overswingPayout(s),15*108);
 assert.deepEqual(s.deal.pot,[31,33,18]);
});
test('Perfect Zero via STEER gives separate ×2 multiplier',()=>{
 let s=newOverswing({deckOverride:O});
 s=go(s,{type:'steer',index:1}); // +3 from card id2
 s=go(s,{type:'steer',index:0}); // -3 from id32, lands 0
 assert.equal(s.deal.S,0);
 assert.equal(s.deal.zeroFactor,2);
 assert.equal(s.deal.W,1);
 assert.deepEqual(s.deal.pot,[2,32]);
 assert.equal(overswingPayout(s),24);
});
test('STEER interrupts the consecutive FLIP run, but earned multipliers remain until BANK',()=>{
 let s=newOverswing({deckOverride:O});
 s=go(s,{type:'flip'}); // -2, flip x2
 s=go(s,{type:'steer',index:0}); // -3 -> -5: discard
 assert.equal(s.deal.flipStreak,0);assert.equal(s.deal.flipFactor,2);
 s=go(s,{type:'flip'}); // +2 -> -3: new streak
 assert.equal(s.deal.flipStreak,1);assert.equal(s.deal.flipFactor,2);
 assert.equal(s.deal.comboFactor,1);
});
test('BANK decreases cap, player chooses card to discard when over capacity',()=>{
 let s=newOverswing({deckOverride:O});
 s=go(s,{type:'flip'});s=go(s,{type:'flip'});
 const options=overswingActions(s).filter(a=>a.type==='bank');
 assert.equal(options.length,8);
 assert.strictEqual(stepOverswing(s,{type:'bank'}),s);
 s=go(s,{type:'bank',dropIndex:3});
 assert.equal(s.deal.handCap,7);assert.equal(s.deal.bankCount,1);
 assert.equal(s.deal.hand.length,7);assert.ok(!s.deal.hand.includes(29));
 assert.equal(s.lastAction.dropped,29);
 assert.equal(s.deal.S,0);assert.equal(overswingMultiplier(s.deal),1);
});
test('capacity decreases with every BANK but stops at 2',()=>{
 let s=newOverswing({deckOverride:O});
 for(let turn=0;turn<8;turn++){
  s={...s,deal:{...s.deal,pot:[31],plays:2}};
  const bank=overswingActions(s).find(a=>a.type==='bank');
  s=go(s,bank);
  assert.equal(s.deal.handCap,Math.max(2,7-turn));
  assert.ok(s.deal.hand.length<=s.deal.handCap);
 }
 assert.equal(s.deal.handCap,2);
});
test('empty hand automatically refills to current cap with remaining deck',()=>{
 let s=newOverswing({deckOverride:O});
 for(let i=0;i<8;i++)s=go(s,{type:'steer',index:0});
 assert.equal(s.deal.hand.length,8);
 assert.equal(s.deal.pos,16);
 assert.equal(s.lastRefill.length,8);
 assert.equal((40-s.deal.pos)+s.deal.hand.length+s.deal.pot.length+s.deal.discard.length,40);
 // Smaller-cap refill.
 const small={...s,deal:{...s.deal,hand:[],handCap:3}};
 const newer=go(small,{type:'flip'});
 assert.equal(newer.deal.hand.length,3);assert.equal(newer.lastRefill.length,3);
});
test('SNAP discards flipped card and Pot, not remaining Hand; no free refill unless empty',()=>{
 let s=newOverswing({deckOverride:O});
 s={...s,deal:{...s.deal,S:9,pot:[6],plays:2}};
 s=go(s,{type:'flip'}); // -2 stays safe: +9 -> +7, so use red card instead
 assert.equal(s.deal.S,7);
 s={...s,deal:{...s.deal,S:9,pot:[6],plays:2,pos:9}};
 s=go(s,{type:'flip'}); // +2 -> 11 SNAP
 assert.equal(s.lastAction.snap,true);
 assert.equal(s.deal.S,0);assert.deepEqual(s.deal.pot,[]);
 assert.equal(s.deal.hand.length,8);
 assert.equal(s.deal.handCap,8);
 assert.equal(s.lastRefill.length,0);
});
test('bank pays total product and resets all factors',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,31,33,18]);
 let s=newOverswing({deckOverride:deck});
 for(let i=0;i<3;i++)s=go(s,{type:'flip'});
 assert.equal(overswingPayout(s),1620);
 s=go(s,{type:'bank',dropIndex:0});
 assert.equal(s.deal.T,1620);assert.equal(s.lastAction.points,1620);
 assert.equal(overswingMultiplier(s.deal),1);
 assert.equal(s.deal.flipStreak,0);assert.equal(s.deal.handCap,7);
});
test('complete games preserve cards, hand capacity, and eventually end',()=>{
 for(let seed=0;seed<100;seed++){
  let s=newOverswing({seed});let count=0;
  while(s.status!=='over'&&count++<240){
   const d=s.deal;
   assert.ok(d.hand.length<=d.handCap);
   assert.ok(d.handCap>=2&&d.handCap<=8);
   assert.equal((40-d.pos)+d.hand.length+d.pot.length+d.discard.length,40,'conserve seed '+seed);
   const legal=overswingActions(s);
   assert.ok(legal.length,'softlock seed '+seed);
   const bank=legal.find(a=>a.type==='bank'),flip=legal.find(a=>a.type==='flip'),steer=legal.find(a=>a.type==='steer');
   s=go(s,bank&&count%3===0?bank:flip||steer||bank);
  }
  assert.equal(s.status,'over','termination seed '+seed);
 }
});
test('three-deal Match starts a fresh eight-card deck at each transition',()=>{
 let s=newOverswing({seed:42,mode:'match'});let moves=0;
 while(s.dealIndex===0&&moves++<200){
  const actions=overswingActions(s);
  s=go(s,actions.find(a=>a.type==='flip')||actions.find(a=>a.type==='steer')||actions.find(a=>a.type==='bank'));
 }
 assert.equal(s.dealIndex,1);assert.equal(s.deal.hand.length,8);
 assert.equal(s.deal.handCap,8);assert.equal(s.deal.pos,8);
 assert.equal(s.dealTotals.length,1);assert.equal(s.status,'playing');
});
