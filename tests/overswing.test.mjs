import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,applySwing,signed} from '../src/external/engines.js';
const O=[32,2,6,29,12,15,34,16,31,1,13,35,26,3,18,10,5,11,27,4,28,21,37,38,7,19,36,14,25,20,8,39,23,0,24,9,22,33,17,30];
const withFront=prefix=>[...prefix,...Array.from({length:40},(_,i)=>i).filter(x=>!prefix.includes(x))];
const next=(s,a)=>{const n=stepOverswing(s,a);assert.notStrictEqual(n,s,'Unexpected illegal action '+JSON.stringify(a));return n;};
test('suits have correct signed rank',()=>{for(let c=0;c<40;c++)assert.equal(signed(c),(c<20?1:-1)*(c%10+1));});
test('starts with four cards, cap four and either opening action',()=>{
  const s=newOverswing({deckOverride:O});assert.equal(s.version,7);
  assert.equal(s.deal.pos,4);assert.deepEqual(s.deal.hand,O.slice(0,4));
  assert.deepEqual(overswingActions(s).map(a=>a.type),['flip','steer','steer','steer','steer']);
  assert.equal(overswingActions(s).some(a=>a.type==='bank'),false);
});
test('opening STEER immediately moves pendulum and sends card to Pot',()=>{
  let s=newOverswing({deckOverride:O});
  s=next(s,{type:'steer',index:1});
  assert.equal(s.deal.S,3);assert.deepEqual(s.deal.pot,[2]);
  assert.equal(s.lastAction.destination,'pot');assert.equal(s.lastAction.openingSteer,true);
  assert.equal(s.deal.hand.length,3);assert.equal(s.deal.plays,1);
  assert.equal(overswingActions(s).some(a=>a.type==='bank'),false);
});
test('opening FLIP still moves pendulum and puts ordinary flip into Pot',()=>{
  let s=newOverswing({deckOverride:O});s=next(s,{type:'flip'});
  assert.equal(s.deal.S,3);assert.deepEqual(s.deal.pot,[12]);assert.equal(s.lastFlip.destination,'pot');
});
test('BANK cannot be farmed after one opening card; needs two card actions',()=>{
  let s=newOverswing({deckOverride:O});s=next(s,{type:'steer',index:1});
  assert.strictEqual(stepOverswing(s,{type:'bank'}),s);
  s=next(s,{type:'flip'});assert.ok(overswingActions(s).some(a=>a.type==='bank'));
});
test('BANK secures points, refills one card, resets series',()=>{
  let s=newOverswing({deckOverride:O});
  s=next(s,{type:'steer',index:1}); // 2 = 3 hearts, Pot +3
  s=next(s,{type:'flip'}); // 12 = 3 diamonds, Pot +3
  assert.equal(overswingPayout(s),6);
  s=next(s,{type:'bank'});
  assert.equal(s.deal.T,6);assert.equal(s.deal.pos,6);
  assert.deepEqual(s.deal.hand,[32,6,29,15]);
  assert.equal(s.lastAction.refill,15);assert.equal(s.deal.plays,0);
  assert.equal(s.deal.S,0);assert.equal(s.deal.W,0);assert.deepEqual(s.deal.pot,[]);
});
test('BANK does not refill if hand full',()=>{
  const deck=withFront([32,2,10,11,6,28]);
  let s=newOverswing({deckOverride:deck});
  s=next(s,{type:'flip'});s=next(s,{type:'flip'});
  assert.equal(s.deal.hand.length,4);assert.equal(s.deal.pot.length,2);
  s=next(s,{type:'bank'});
  assert.equal(s.deal.pos,6);assert.equal(s.lastAction.refill,null);
});
test('flipped crossing card goes to hand only when space exists',()=>{
  const deck=withFront([32,2,6,29,28]);
  let s=newOverswing({deckOverride:deck});
  s=next(s,{type:'steer',index:2}); // +7, hand now 3
  s=next(s,{type:'flip'}); // -9 from +7 -> -2; caught
  assert.equal(s.deal.S,-2);assert.equal(s.deal.W,2);
  assert.equal(s.lastFlip.destination,'hand');assert.equal(s.lastFlip.card,28);
  assert.equal(s.deal.hand.length,4);assert.deepEqual(s.deal.pot,[6]);
});
test('flipped crossing card with full hand instead goes to Pot',()=>{
  const deck=withFront([32,2,10,11,6,28]);
  let s=newOverswing({deckOverride:deck});
  s=next(s,{type:'flip'}); // +7
  s=next(s,{type:'flip'}); // -9; with 4-card hand
  assert.equal(s.deal.S,-2);assert.equal(s.deal.W,2);
  assert.equal(s.lastFlip.destination,'pot');assert.deepEqual(s.deal.pot,[6,28]);
});
test('non-opening non-crossing STEER discards card without Pot points',()=>{
  let s=newOverswing({deckOverride:O});
  s=next(s,{type:'flip'}); // +3, pot +3
  s=next(s,{type:'steer',index:1}); // +3 -> +6; card 2 non crossing
  assert.equal(s.lastAction.destination,'discard');assert.equal(s.lastAction.addedToPot,0);
  assert.deepEqual(s.deal.pot,[12]);
});
test('SNAP loses Pot, keeps Hand, and does not refill',()=>{
  let s=newOverswing({deckOverride:O});
  s=next(s,{type:'flip'}); // +3
  s=next(s,{type:'flip'}); // +6 -> +9
  s=next(s,{type:'steer',index:1}); // +3 makes +12 -> SNAP
  assert.equal(s.lastAction.snap,true);assert.equal(s.lastAction.lost,9);
  assert.equal(s.lastAction.destination,'discard');
  assert.equal(s.deal.pos,6);assert.equal(s.deal.S,0);
  assert.equal(s.deal.hand.length,3);assert.deepEqual(s.deal.pot,[]);
});
test('BANK when no cards remain avoids an unwinnable deadlock',()=>{
  const deck=withFront([6,2,10,11]);
  const base=newOverswing({deckOverride:deck});
  const s={...base,deal:{...base.deal,pos:40,hand:[],pot:[6],plays:1,S:7}};
  assert.deepEqual(overswingActions(s),[{type:'bank'}]);
  const n=next(s,{type:'bank'});
  assert.equal(n.status,'over');assert.equal(n.dealTotals.length,1);
});
test('cap and card conservation across 100 seeds and complete game',()=>{
  for(let seed=0;seed<100;seed++){
    let s=newOverswing({seed});let turns=0;
    while(s.status!=='over'&&turns++<200){
      const d=s.deal;
      assert.ok(d.hand.length<=4,'hand cap');
      assert.equal((40-d.pos)+d.hand.length+d.pot.length+d.discard.length,40,'cards conserved');
      const actions=overswingActions(s);
      assert.ok(actions.length,'no softlock at seed '+seed);
      const bank=actions.find(a=>a.type==='bank');
      const flip=actions.find(a=>a.type==='flip');
      const steer=actions.find(a=>a.type==='steer');
      s=next(s,(bank&&((turns+seed)%3===0))?bank:flip||steer||bank);
    }
    assert.equal(s.status,'over','game should end, seed '+seed);
    assert.ok(s.deal.hand.length<=4);
  }
});
