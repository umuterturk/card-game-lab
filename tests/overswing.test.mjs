import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,overswingMultiplier,applySwing,signed} from '../src/external/engines.js';
const O=[32,2,6,29,12,15,34,16,31,1,13,35,26,3,18,10,5,11,27,4,28,21,37,38,7,19,36,14,25,20,8,39,23,0,24,9,22,33,17,30];
const deckWith=prefix=>[...prefix,...Array.from({length:40},(_,i)=>i).filter(x=>!prefix.includes(x))];
const go=(s,a)=>{const n=stepOverswing(s,a);assert.notStrictEqual(n,s,'Rejected '+JSON.stringify(a));return n;};
test('strict SWING from ±1 or ±2 always raises multiplier by +1',()=>{
 assert.deepEqual(applySwing(1,0,-3),{snap:false,S:-2,W:1,gain:1,swung:true});
 assert.deepEqual(applySwing(-1,0,3),{snap:false,S:2,W:1,gain:1,swung:true});
 assert.deepEqual(applySwing(2,1,-5),{snap:false,S:-3,W:2,gain:1,swung:true});
 assert.deepEqual(applySwing(-2,0,4),{snap:false,S:2,W:1,gain:1,swung:true});
});
test('SWING scales with distance and has no multiplier ceiling',()=>{
 assert.deepEqual(applySwing(5,0,-8),{snap:false,S:-3,W:1,gain:1,swung:true});
 assert.deepEqual(applySwing(7,0,-9),{snap:false,S:-2,W:2,gain:2,swung:true});
 assert.deepEqual(applySwing(-10,0,10),{snap:false,S:0,W:0,gain:0,swung:false});
 assert.deepEqual(applySwing(9,3,-10),{snap:false,S:-1,W:6,gain:3,swung:true});
 assert.deepEqual(applySwing(1,5,-3),{snap:false,S:-2,W:6,gain:1,swung:true});
 assert.deepEqual(applySwing(9,30,-10),{snap:false,S:-1,W:33,gain:3,swung:true});
});
test('repeated strict crossings continue raising SWING beyond ×6',()=>{
 let S=2,W=0;
 for(let i=0;i<10;i++){
  const result=applySwing(S,W,S>0?-4:4);
  assert.equal(result.swung,true);
  assert.equal(result.gain,1);
  ({S,W}=result);
 }
 assert.equal(W,10); // SWING ×11, not ×6
});
test('uncapped STEER crossing increases payout and BANK settles full multiplier',()=>{
 const base=newOverswing({deckOverride:O});
 let s={...base,deal:{...base.deal,S:1,W:6,plays:1,pot:[0]}};
 s=go(s,{type:'steer',index:0}); // 3♣: +1 -> −2; SWING ×7 -> ×8
 assert.equal(s.deal.W,7);
 assert.equal(s.lastAction.gain,1);
 assert.equal(overswingMultiplier(s.deal),8);
 assert.equal(overswingPayout(s),32);
 s=go(s,overswingActions(s).find(a=>a.type==='bank'));
 assert.equal(s.lastAction.points,32);
 assert.equal(s.deal.T,32);
});
test('neither starting at zero nor landing on zero is a SWING reward',()=>{
 assert.deepEqual(applySwing(0,0,2),{snap:false,S:2,W:0,gain:0,swung:false});
 assert.deepEqual(applySwing(2,0,-2),{snap:false,S:0,W:0,gain:0,swung:false});
});
test('actual STEER crossing from +1 to -2 increases SWING factor',()=>{
 const base=newOverswing({deckOverride:O});
 let s={...base,deal:{...base.deal,S:1,plays:1,pot:[0]}};
 s=go(s,{type:'steer',index:0}); // 3♣ = -3
 assert.equal(s.deal.S,-2);
 assert.equal(s.deal.W,1);
 assert.equal(s.lastAction.gain,1);
 assert.equal(s.lastAction.swung,true);
 assert.equal(s.lastAction.zeroBreak,false);
 assert.equal(s.lastAction.destination,'pot');
 assert.equal(overswingMultiplier(s.deal),2);
});
test('actual FLIP crossing from -1 to +1 grants both SWING and CROSS',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,1]);
 let s=newOverswing({deckOverride:deck});
 s={...s,deal:{...s.deal,S:-1,plays:1,pot:[30]}};
 s=go(s,{type:'flip'}); // 2♥ = +2
 assert.equal(s.deal.S,1);
 assert.equal(s.deal.W,1);
 assert.equal(s.deal.crossFactor,2);
 assert.equal(s.lastAction.gain,1);
 assert.equal(s.lastAction.swung,true);
 assert.equal(overswingMultiplier(s.deal),4);
});
test('v10 starts with eight cards and correct suit signs',()=>{
 const s=newOverswing({deckOverride:O});
 assert.equal(s.version,10);assert.equal(s.deal.handCap,8);
 assert.deepEqual(s.deal.hand,O.slice(0,8));assert.equal(s.deal.pos,8);
 assert.equal(overswingActions(s).filter(a=>a.type==='steer').length,8);
 assert.ok(overswingActions(s).some(a=>a.type==='flip'));
 assert.ok(!overswingActions(s).some(a=>a.type==='bank'));
 for(let id=0;id<40;id++)assert.equal(signed(id),(id<20?1:-1)*(id%10+1));
});
test('all flipped cards enter Pot; exact zero is Zero Break, not a crossing',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,31,1]);
 let s=newOverswing({deckOverride:deck});
 s=go(s,{type:'flip'}); // -2
 assert.deepEqual(s.deal.pot,[31]);assert.equal(s.lastFlip.destination,'pot');
 s=go(s,{type:'flip'}); // +2 -> 0
 assert.deepEqual(s.deal.pot,[31,1]);assert.equal(s.lastFlip.destination,'pot');
 assert.equal(s.deal.hand.length,8);
 assert.equal(s.deal.crossFactor,1);assert.equal(s.deal.comboFactor,1);
 assert.equal(s.deal.flipFactor,1);assert.equal(s.deal.flipStreak,0);
 assert.equal(s.deal.W,0);assert.equal(s.lastAction.zeroBreak,true);
 assert.equal(overswingMultiplier(s.deal),1);
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
 assert.equal(s.deal.crossFactor,2);
 assert.equal(overswingMultiplier(s.deal),108);
 assert.equal(overswingPayout(s),15*108);
 assert.deepEqual(s.deal.pot,[31,33,18]);
});
test('Zero Break with STEER reaches exact zero, preserves Pot and removes all bonuses',()=>{
 let s=newOverswing({deckOverride:O});
 s=go(s,{type:'steer',index:1}); // +3 from 3♥
 s=go(s,{type:'steer',index:0}); // -3 from 3♣, lands exactly 0
 assert.equal(s.deal.S,0);
 assert.equal(s.deal.W,0);
 assert.deepEqual(s.deal.pot,[2,32]);
 assert.equal(overswingMultiplier(s.deal),1);
 assert.equal(overswingPayout(s),6);
 assert.equal(s.lastAction.zeroBreak,true);
 assert.equal(s.lastAction.destination,'pot');
 assert.equal(s.lastAction.swung,false);
});
test('Zero Break resets even accumulated crossing, streak and no-cross bonuses',()=>{
 const d=deckWith([36,1,2,3,4,5,6,7,8]);
 let s=newOverswing({deckOverride:d});
 s={...s,deal:{...s.deal,S:7,W:2,pot:[8],plays:3,
   flipFactor:3,comboFactor:6,crossFactor:2,
   flipStreak:3,dryFlips:2}};
 assert.equal(overswingMultiplier(s.deal),108);
 s=go(s,{type:'steer',index:0}); // 7♣ moves +7 -> 0
 assert.equal(s.lastAction.zeroBreak,true);
 assert.equal(s.lastAction.resetFromMultiplier,108);
 assert.equal(s.deal.S,0);
 assert.equal(s.deal.W,0);
 assert.equal(s.deal.flipFactor,1);
 assert.equal(s.deal.comboFactor,1);
 assert.equal(s.deal.crossFactor,1);
 assert.equal(s.deal.flipStreak,0);
 assert.equal(s.deal.dryFlips,0);
 assert.deepEqual(s.deal.pot,[8,36]);
 assert.equal(overswingMultiplier(s.deal),1);
 assert.equal(overswingPayout(s),16);
 s=go(s,{type:'bank'});
 assert.equal(s.deal.T,16,'BANK uses reset multiplier, not the old 108x');
});
test('third consecutive FLIP landing exactly zero loses every multiplier and streak',()=>{
 const deck=deckWith([32,2,6,29,12,15,34,16,31,33,15]);
 let s=newOverswing({deckOverride:deck});
 s=go(s,{type:'flip'}); // -2, FLIP ×2
 s=go(s,{type:'flip'}); // -6, FLIP ×3 and streak ×2
 assert.equal(s.deal.flipFactor,3);
 assert.equal(s.deal.comboFactor,2);
 s=go(s,{type:'flip'}); // +6 -> exactly zero
 assert.equal(s.lastAction.zeroBreak,true);
 assert.equal(s.lastAction.swung,false);
 assert.equal(s.deal.S,0);
 assert.equal(s.deal.flipFactor,1);
 assert.equal(s.deal.comboFactor,1);
 assert.equal(s.deal.crossFactor,1);
 assert.equal(s.deal.flipStreak,0);
 assert.equal(overswingMultiplier(s.deal),1);
 assert.deepEqual(s.deal.pot,[31,33,15]);
 s=go(s,{type:'flip'}); // series restarts from zero
 assert.equal(s.deal.flipStreak,1);
 assert.equal(s.deal.flipFactor,2);
 assert.equal(s.deal.comboFactor,1);
});
test('strict crossing yields bonus but exact zero does not',()=>{
 assert.deepEqual(applySwing(7,0,-7),{snap:false,S:0,W:0,gain:0,swung:false});
 assert.deepEqual(applySwing(7,0,-9),{snap:false,S:-2,W:2,gain:2,swung:true});
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
