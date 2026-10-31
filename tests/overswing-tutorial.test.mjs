import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newOverswing,overswingActions,stepOverswing,overswingMultiplier,overswingPayout,
  applySwing
} from '../src/external/engines.js';
import {
  OVERSWING_TUTORIAL_DECK,OVERSWING_TUTORIAL_STEPS,
  overswingTutorialExpectedAction
} from '../src/external/overswingTutorial.js';

test('STEER without crossing costs one SWING tier and preserves other bonuses',()=>{
  const deck=[0,...Array.from({length:40},(_,id)=>id).filter(id=>id!==0)];
  let s=newOverswing({deckOverride:deck});
  s={...s,deal:{...s.deal,S:4,W:3,plays:2,flipFactor:3,comboFactor:4,crossFactor:2,pot:[12]}};
  assert.equal(overswingMultiplier(s.deal),96);
  s=stepOverswing(s,{type:'steer',index:0}); // +1: +4 -> +5
  assert.equal(s.deal.S,5);
  assert.equal(s.deal.W,2);
  assert.equal(overswingMultiplier(s.deal),72);
  assert.equal(s.lastAction.swingPenalty,true);
  assert.equal(s.lastAction.swung,false);
  assert.equal(s.deal.flipFactor,3);
  assert.equal(s.deal.comboFactor,4);
  assert.equal(s.deal.crossFactor,2);
});
test('STEER penalty minimum is ×1; strict-cross STEER earns SWING',()=>{
  const deck=[0,27,...Array.from({length:40},(_,id)=>id).filter(id=>id!==0&&id!==27)];
  let s=newOverswing({deckOverride:deck});
  s={...s,deal:{...s.deal,S:3,W:0,plays:1,pot:[12]}};
  s=stepOverswing(s,{type:'steer',index:0}); // +1: +3 -> +4
  assert.equal(s.deal.W,0);
  assert.equal(s.lastAction.swingPenalty,false);
  s=stepOverswing(s,{type:'steer',index:0}); // -8: +4 -> -4
  assert.equal(s.deal.W,1);
  assert.equal(s.lastAction.swung,true);
  assert.equal(s.lastAction.swingPenalty,false);
});
test('tutorial deck is complete, deterministic, and uniquely suited',()=>{
  assert.equal(OVERSWING_TUTORIAL_DECK.length,40);
  assert.equal(new Set(OVERSWING_TUTORIAL_DECK).size,40);
  assert.equal(OVERSWING_TUTORIAL_STEPS.length,17);
  assert.deepEqual(OVERSWING_TUTORIAL_DECK.slice(0,8),[27,5,0,3,23,28,7,2]);
  assert.deepEqual(OVERSWING_TUTORIAL_DECK.slice(8,15),[12,11,24,21,15,17,4]);
  assert.deepEqual(newOverswing({mode:'tutorial',seed:1}).deal.deck,
    newOverswing({mode:'tutorial',seed:99}).deal.deck);
});
test('tutorial enforces one action per step and replays all concepts',()=>{
  let s=newOverswing({mode:'tutorial',seed:33});
  assert.equal(s.mode,'tutorial');assert.equal(s.version,10);
  assert.equal(s.tutorialStep,0);assert.equal(s.status,'playing');
  let previousTotal=0;
  for(let i=0;i<OVERSWING_TUTORIAL_STEPS.length;i++){
    const d=s.deal;
    assert.equal(s.tutorialStep,i);
    assert.equal((40-d.pos)+d.hand.length+d.pot.length+d.discard.length,40,'cards conserved '+i);
    const expected=overswingTutorialExpectedAction(d,i);
    const legal=overswingActions(s);
    assert.deepEqual(legal,[expected],'step '+i+' must expose exactly one action');
    const wrong=expected.type==='flip'?{type:'steer',index:0}:{type:'flip'};
    assert.strictEqual(stepOverswing(s,wrong),s,'cannot bypass step '+i);
    const prev=s;
    s=stepOverswing(s,expected);
    assert.notStrictEqual(s,prev);
    assert.equal(s.tutorialStep,i+1);
    if(i===0){assert.equal(s.deal.S,3);assert.equal(s.deal.flipFactor,2);}
    if(i===1){assert.equal(s.deal.S,5);assert.equal(s.deal.flipFactor,3);assert.equal(s.deal.comboFactor,2);}
    if(i===2){assert.equal(s.deal.S,-3);assert.equal(s.deal.W,1);}
    if(i===3){assert.equal(s.deal.S,3);assert.equal(s.deal.W,2);}
    if(i===4){assert.equal(s.deal.S,4);assert.equal(s.deal.W,1);assert.equal(s.lastAction.swingPenalty,true);}
    if(i===5){assert.equal(s.deal.S,-1);assert.equal(s.deal.crossFactor,2);}
    if(i===6){assert.equal(s.deal.S,-3);assert.equal(s.deal.comboFactor,4);}
    if(i===7){assert.equal(s.deal.S,3);assert.equal(s.deal.comboFactor,12);assert.equal(s.deal.crossFactor,4);}
    if(i===8){assert.equal(s.deal.handCap,7);assert.equal(s.deal.S,0);assert.ok(s.deal.T>0);}
    if(i===10){assert.equal(s.deal.S,0);assert.equal(s.lastAction.zeroBreak,true);assert.equal(overswingMultiplier(s.deal),1);assert.deepEqual(s.deal.pot,[3,23]);}
    if(i===12){assert.equal(s.lastAction.snap,true);assert.equal(s.deal.S,0);assert.equal(s.deal.pot.length,0);}
    if(i===15){assert.equal(s.deal.handCap,7);assert.equal(s.deal.hand.length,7);assert.deepEqual(s.lastRefill,[1,6,8,9,10,13,14]);}
    if(i===16){assert.equal(s.deal.handCap,6);assert.equal(s.deal.hand.length,6);assert.equal(s.lastAction.dropped,14);}
    assert.ok(s.deal.T>=previousTotal);
    previousTotal=s.deal.T;
  }
  assert.equal(s.status,'tutorial-complete');
  assert.deepEqual(overswingActions(s),[]);
  assert.strictEqual(stepOverswing(s,{type:'flip'}),s);
});
test('guided strict SWING and ZERO BREAK use the normal engine math',()=>{
  assert.deepEqual(applySwing(5,0,-8),{snap:false,S:-3,W:1,gain:1,swung:true});
  assert.deepEqual(applySwing(4,3,-4),{snap:false,S:0,W:3,gain:0,swung:false});
  const s=newOverswing({mode:'tutorial'});
  assert.equal(s.deal.hand.length,8);
  assert.equal(overswingPayout(s),0);
});
