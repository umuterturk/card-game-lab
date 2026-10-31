import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  newOverswing,overswingActions,stepOverswing,overswingMultiplier,overswingPayout,
  applySwing
} from '../src/external/engines.js';
import {
  OVERSWING_TUTORIAL_DECK,OVERSWING_TUTORIAL_STEPS,OVERSWING_TUTORIAL_INTRO,
  overswingTutorialExpectedAction
} from '../src/external/overswingTutorial.js';

test('STEER without crossing costs exactly one SWING and preserves JACKPOT/FLIP',()=>{
  const deck=[0,...Array.from({length:40},(_,id)=>id).filter(id=>id!==0)];
  let s=newOverswing({deckOverride:deck});
  s={...s,deal:{...s.deal,S:4,W:3,plays:2,flipFactor:3,jackpotFactor:4,pot:[12]}};
  assert.equal(overswingMultiplier(s.deal),48);
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.deal.S,5);assert.equal(s.deal.W,2);
  assert.equal(overswingMultiplier(s.deal),36);
  assert.equal(s.lastAction.swingPenalty,true);
  assert.equal(s.deal.flipFactor,3);
  assert.equal(s.deal.jackpotFactor,4);
});
test('STEER penalty has minimum ×1, strict-cross STEER earns SWING but not JACKPOT',()=>{
  const deck=[0,27,...Array.from({length:40},(_,id)=>id).filter(id=>id!==0&&id!==27)];
  let s=newOverswing({deckOverride:deck});
  s={...s,deal:{...s.deal,S:3,W:0,plays:1,pot:[12]}};
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.deal.W,0);assert.equal(s.lastAction.swingPenalty,false);
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.deal.S,-4);assert.equal(s.deal.W,1);
  assert.equal(s.deal.jackpotFactor,1);
});
test('JACKPOT increases linearly on strict FLIP crossings; STEER preserves it',()=>{
  const deck=[20,21,22,23,24,25,26,27,1,31];
  const complete=[...deck,...Array.from({length:40},(_,i)=>i).filter(i=>!deck.includes(i))];
  let s=newOverswing({deckOverride:complete});
  s={...s,deal:{...s.deal,S:-1,jackpotFactor:4,plays:1,pot:[30]}};
  s=stepOverswing(s,{type:'flip'}); // +2: -1 -> +1, JACKPOT 5
  assert.equal(s.deal.S,1);assert.equal(s.deal.jackpotFactor,5);
  assert.equal(s.deal.flipFactor,2);
  s=stepOverswing(s,{type:'flip'}); // -2: +1 -> -1, JACKPOT 6
  assert.equal(s.deal.S,-1);assert.equal(s.deal.jackpotFactor,6);
  assert.equal(s.deal.flipFactor,3);
  s=stepOverswing(s,{type:'steer',index:0}); // -1 -> -2 without a crossing
  assert.equal(s.deal.jackpotFactor,6);
});
test('tutorial short fixed deck and concise basics',()=>{
  assert.equal(OVERSWING_TUTORIAL_STEPS.length,10);
  assert.equal(OVERSWING_TUTORIAL_DECK.length,40);
  assert.equal(new Set(OVERSWING_TUTORIAL_DECK).size,40);
  assert.deepEqual(OVERSWING_TUTORIAL_DECK.slice(0,8),[27,0,3,23,5,28,7,2]);
  assert.deepEqual(OVERSWING_TUTORIAL_DECK.slice(8,13),[12,11,15,17,4]);
  assert.deepEqual(OVERSWING_TUTORIAL_INTRO.map(i=>i.term),['FLIP','STEER','POT','SCORE']);
  assert.ok(OVERSWING_TUTORIAL_INTRO.every(i=>i.text.length<100));
  assert.match(OVERSWING_TUTORIAL_INTRO[0].text,/random card/i);
  assert.match(OVERSWING_TUTORIAL_INTRO[1].text,/your hand/i);
  assert.equal(newOverswing({mode:'tutorial',seed:1}).deal.deck.join(','),
    newOverswing({mode:'tutorial',seed:999}).deal.deck.join(','));
});
test('tutorial start requires glossary; every scripted action is forced and completes',()=>{
  let s=newOverswing({mode:'tutorial',seed:33});
  assert.equal(s.version,13);
  assert.equal(s.tutorialStep,0);
  assert.equal(s.tutorialIntroDone,false);
  assert.deepEqual(overswingActions(s),[]);
  assert.strictEqual(stepOverswing(s,{type:'flip'}),s);
  assert.strictEqual(stepOverswing(s,{type:'steer',index:0}),s);
  const originalDeal=s.deal;
  s=stepOverswing(s,{type:'tutorial-start'});
  assert.equal(s.tutorialIntroDone,true);
  assert.equal(s.tutorialStep,0);
  assert.strictEqual(s.deal,originalDeal);

  for(let i=0;i<OVERSWING_TUTORIAL_STEPS.length;i++){
    assert.equal(s.tutorialStep,i);
    assert.equal((40-s.deal.pos)+s.deal.hand.length+s.deal.pot.length+s.deal.discard.length,40,'card count '+i);
    const expected=overswingTutorialExpectedAction(s.deal,i);
    assert.deepEqual(overswingActions(s),[expected],'step '+i+' must offer one action');
    const invalid=expected.type==='flip'?{type:'steer',index:0}:{type:'flip'};
    assert.strictEqual(stepOverswing(s,invalid),s,'wrong action blocked '+i);
    s=stepOverswing(s,expected);
    assert.equal(s.tutorialStep,i+1);
    if(i===0){assert.equal(s.deal.S,3);assert.equal(s.deal.flipFactor,2);}
    if(i===1){assert.equal(s.deal.S,5);assert.equal(s.deal.flipFactor,3);}
    if(i===2){assert.equal(s.deal.S,-3);assert.equal(s.deal.W,1);}
    if(i===3){assert.equal(s.deal.S,-2);assert.equal(s.deal.W,0);assert.equal(s.lastAction.swingPenalty,true);}
    if(i===4){assert.equal(s.deal.S,4);assert.equal(s.deal.W,1);assert.equal(s.deal.flipFactor,3);assert.equal(s.deal.jackpotFactor,2);assert.equal(overswingPayout(s),228);}
    if(i===5){assert.equal(s.deal.T,228);assert.equal(s.deal.handCap,7);assert.equal(s.deal.S,0);}
    if(i===7){assert.equal(s.lastAction.zeroBreak,true);assert.deepEqual(s.deal.pot,[3,23]);assert.equal(overswingMultiplier(s.deal),1);}
    if(i===8){assert.equal(s.deal.S,8);assert.equal(s.deal.flipFactor,2);}
    if(i===9){assert.equal(s.lastAction.snap,true);assert.equal(s.deal.pot.length,0);assert.equal(s.deal.T,228);}
  }
  assert.equal(s.status,'tutorial-complete');
  assert.deepEqual(overswingActions(s),[]);
  assert.strictEqual(stepOverswing(s,{type:'flip'}),s);
});
test('normal mode remains playable and does not accept tutorial-start',()=>{
  const s=newOverswing({mode:'short',seed:11});
  assert.equal(s.version,13);
  assert.ok(overswingActions(s).some(a=>a.type==='flip'));
  assert.strictEqual(stepOverswing(s,{type:'tutorial-start'}),s);
});
test('tutorial appears after pendulum before hand; buttons near requested action',()=>{
  const jsx=readFileSync(new URL('../src/external/OverswingPlay.jsx',import.meta.url),'utf8');
  const view=jsx.slice(jsx.indexOf("return <div className={'os8'"));
  const meter=view.indexOf('className="os8-meter"');
  const tutorial=view.indexOf('className="os8-tutorial"');
  const hand=view.indexOf('className="os8-hand"');
  assert.ok(meter>=0&&tutorial>meter&&hand>tutorial);
  assert.ok(view.indexOf('{guidedActionFirst&&actionButtons}')>tutorial);
  assert.ok(view.indexOf('{guidedActionFirst&&actionButtons}')<hand);
  assert.ok(view.indexOf('{!guidedActionFirst&&actionButtons}')>hand);
  assert.ok(view.indexOf('{multiplierDetails}')>tutorial && view.indexOf('{multiplierDetails}')<hand,'multipliers above played cards and hand');
 assert.ok(view.indexOf('className="os8-pot"')<hand,'pot cards above hand');
  assert.ok(jsx.includes('label="JACKPOT"'));
  assert.ok(!jsx.includes('label="CROSS"'));
  assert.ok(!jsx.includes('label="SERİ"'));
  assert.deepEqual(applySwing(5,0,-8),{snap:false,S:-3,W:1,gain:1,swung:true});
});
