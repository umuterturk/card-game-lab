import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,applySwing,signed} from '../src/external/engines.js';

const DECK=[32,2,6,29,12,15,34,16,31,1,13,35,26,3,18,10,5,11,27,4,28,21,37,38,7,19,36,14,25,20,8,39,23,0,24,9,22,33,17,30];

function move(s,type,card){
  const before=s.deal;
  let action={type};
  if(type==='steer'){
    const idx=s.deal.hand.indexOf(card);
    assert.notEqual(idx,-1,'Steer card missing: '+card);
    action.index=idx;
  }else if(type==='flip'){
    assert.equal(before.deck[before.pos],card,'Unexpected flip card');
  }
  const next=stepOverswing(s,action);
  assert.notStrictEqual(next,s,'Action rejected '+type);
  return next;
}
test('Overswing: red cards positive, black cards negative',()=>{
  for(let c=0;c<40;c++){
    assert.equal(signed(c),(c<20?1:-1)*(c%10+1));
  }
});
test('Overswing: initial flip goes to pot and is traceable',()=>{
  let s=newOverswing({deckOverride:DECK});
  assert.deepEqual(s.deal.hand,[32,2]);
  assert.equal(s.deal.pos,2);
  assert.deepEqual(overswingActions(s),[{type:'flip'}]);
  s=move(s,'flip',6);
  assert.equal(s.deal.S,7);
  assert.equal(s.deal.W,0);
  assert.deepEqual(s.deal.pot,[6]);
  assert.equal(s.lastFlip.card,6);
  assert.equal(s.lastFlip.destination,'pot');
  assert.equal(s.lastAction.addedToPot,7);
});
test('Overswing: crossing zero captures a flipped card into the hand',()=>{
  let s=newOverswing({deckOverride:DECK});
  s=move(s,'flip',6);
  s=move(s,'flip',29);
  assert.equal(s.deal.S,-3);
  assert.equal(s.deal.W,2);
  assert.deepEqual(s.deal.pot,[6]);
  assert.deepEqual(s.deal.hand,[32,2,29]);
  assert.equal(s.lastFlip.destination,'hand');
  assert.equal(s.lastFlip.swung,true);
  assert.equal(s.lastFlip.gain,2);
});
test('Overswing: steering card goes to pot only on crossing',()=>{
  let s=newOverswing({deckOverride:DECK});
  s=move(s,'flip',6);
  s=move(s,'flip',29);
  s=move(s,'steer',2);
  assert.equal(s.deal.S,0);
  assert.equal(s.deal.W,3);
  assert.deepEqual(s.deal.pot,[6,2]);
  assert.equal(s.lastAction.type,'steer');
  assert.equal(s.lastAction.destination,'pot');
  assert.equal(s.lastAction.addedToPot,3);
  s=move(s,'flip',12);
  assert.equal(s.deal.S,3);
  s=move(s,'steer',32);
  assert.equal(s.deal.S,0);
  assert.equal(s.lastAction.destination,'pot');
});
test('Overswing: flip with full hand sends crossing card to pot',()=>{
  const original=newOverswing({deckOverride:DECK});
  let s={...original,deal:{...original.deal,hand:[32,2,10],pot:[6],S:7,pos:3,W:0}};
  s=stepOverswing(s,{type:'flip'});
  assert.equal(s.lastAction.card,29);
  assert.equal(s.lastFlip.destination,'pot');
  assert.equal(s.deal.hand.length,3);
  assert.equal(s.deal.pot.at(-1),29);
  assert.equal(s.lastAction.addedToPot,10);
});
test('Overswing: non-crossing steer discards the card without points',()=>{
  const original=newOverswing({deckOverride:DECK});
  let s={...original,deal:{...original.deal,pot:[6],S:0,pos:3,W:0}};
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.lastAction.card,32);
  assert.equal(s.lastAction.destination,'discard');
  assert.equal(s.lastAction.addedToPot,0);
  assert.equal(overswingPayout(s),7);
});
test('Overswing: SNAP reveals lost pot and retains hand',()=>{
  const original=newOverswing({deckOverride:DECK});
  let s={...original,deal:{...original.deal,pot:[6],S:8,pos:2,W:2}};
  s=stepOverswing(s,{type:'flip'});
  assert.equal(s.lastAction.card,6);
  assert.equal(s.lastFlip.destination,'discard');
  assert.equal(s.lastAction.lost,7);
  assert.equal(s.deal.S,0);
  assert.equal(s.deal.W,0);
  assert.deepEqual(s.deal.hand,[32,2]);
  assert.deepEqual(s.deal.pot,[]);
  assert.equal(s.deal.T,0);
});
test('Overswing: bank is traceable and its payout is correct',()=>{
  let s=newOverswing({deckOverride:DECK});
  s=move(s,'flip',6);
  s=move(s,'flip',29);
  s=move(s,'steer',2);
  assert.equal(overswingPayout(s),40);
  s=stepOverswing(s,{type:'bank'});
  assert.equal(s.deal.T,40);
  assert.equal(s.lastAction.type,'bank');
  assert.equal(s.lastAction.pot,10);
  assert.equal(s.lastAction.points,40);
  assert.equal(s.deal.S,0);
});
test('Overswing: v6 complete 534-point three-swing reference fixture',()=>{
  let s=newOverswing({deckOverride:DECK});
  const sequences=[
    [['flip',6],['flip',29],['steer',2],['flip',12],['steer',32],['flip',15],['steer',29],['bank']],
    [['flip',34],['flip',16],['flip',31],['flip',1],['flip',13],['flip',35],['flip',26],['steer',16],['flip',3],['steer',35],['flip',18],['bank']],
    [['flip',10],['flip',5],['flip',11],['flip',27],['flip',4],['flip',28],['flip',21],['steer',18],['bank']]
  ];
  const expected=[192,402,534];
  for(let i=0;i<sequences.length;i++){
    for(const [action,card] of sequences[i])s=move(s,action,card);
    assert.equal(s.deal.T,expected[i],'Cumulative score after swing '+(i+1));
  }
  assert.equal(s.deal.pos,22);
  assert.equal(s.deal.flips,20);
});
test('Overswing: terminal result counted once in three-deal match',()=>{
  let s=newOverswing({mode:'match',deckOverride:DECK});
  // The first deal terminates when its 38 flips have been consumed and we bank.
  for(let turns=0;turns<200&&s.dealIndex===0;turns++){
    const legal=overswingActions(s);
    assert.ok(legal.length);
    s=stepOverswing(s,legal.find(a=>a.type==='flip')??legal.find(a=>a.type==='bank'));
  }
  assert.equal(s.dealIndex,1);
  assert.equal(s.dealTotals.length,1);
  assert.equal(s.deal.T,0);
  assert.equal(s.lastFlip,null);
  assert.equal(s.lastAction,null);
});
