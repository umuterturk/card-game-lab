import test from 'node:test';
import assert from 'node:assert/strict';
import {newRound,stepFirstLevel,FIRST_LEVEL} from '../src/casual/firstLevel.js';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,overswingMultiplier,signed} from '../src/external/engines.js';
import {multiplierParts,multiplierRewards} from '../src/casual/multiplierView.js';
import {rawPotValue,actionPresentation} from '../src/casual/presentation.js';

test('level one is tiny and has no abilities or royals',()=>{
  const {game,snaps}=newRound(),d=game.deal;
  assert.equal(FIRST_LEVEL.deck.length,10);
  assert.equal(d.hand.length,3);
  assert.equal(d.deck.length-d.pos,7);
  assert.equal(d.royalQueue.length,0);
  assert.equal(snaps,0);
  assert.deepEqual(d.hand.map(signed),[3,-2,5]);
  assert.deepEqual(new Set(overswingActions(game,FIRST_LEVEL.rules).map(a=>a.type)),
    new Set(['flip','steer']));
});

test('cannot BANK before collecting a pot and playing twice',()=>{
  const original=newRound();
  assert.strictEqual(stepFirstLevel(original,{type:'bank'}),original);
  const once=stepFirstLevel(original,{type:'flip'});
  assert.equal(once.turn,1);
  assert.ok(overswingPayout(once.game,FIRST_LEVEL.rules)>0);
  assert.equal(overswingActions(once.game,FIRST_LEVEL.rules).some(a=>a.type==='bank'),false);
});

test('two safe FLIPs then BANK clears the short target and locks the round',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'flip'});
  round=stepFirstLevel(round,{type:'flip'});
  assert.equal(round.game.deal.S,-1); // +3 then -4 crosses zero safely.
  assert.equal(round.game.deal.W,1);
  assert.ok(overswingActions(round.game,FIRST_LEVEL.rules).some(a=>a.type==='bank'));
  round=stepFirstLevel(round,{type:'bank'});
  assert.ok(round.game.deal.T>=FIRST_LEVEL.target);
  assert.equal(round.event.type,'win');
  assert.strictEqual(stepFirstLevel(round,{type:'flip'}),round);
});

test('a large move SNAPs and drops the unbanked pot',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'steer',index:0}); // +3
  round=stepFirstLevel(round,{type:'steer',index:1}); // +5 -> +8
  assert.equal(round.game.deal.S,8);
  round=stepFirstLevel(round,{type:'flip'}); // +3 -> outside +/-8
  assert.equal(round.snaps,1);
  assert.equal(round.event.type,'snap');
  assert.equal(round.game.deal.S,0);
  assert.equal(round.game.deal.pot.length,0);
});

test('three pills reflect Swing, Flip and Jackpot directly from the engine',()=>{
  let round=newRound();
  assert.deepEqual(multiplierParts(round.game.deal).map(x=>x.value),[1,1,1]);
  assert.equal(overswingMultiplier(round.game.deal),1);
  round=stepFirstLevel(round,{type:'flip'}); // safe +3, not crossing
  assert.deepEqual(multiplierParts(round.game.deal).map(x=>x.value),[1,2,1]);
  assert.deepEqual(multiplierRewards(round.game.deal,round.game.lastAction).map(x=>x.kind),['flip']);
  round=stepFirstLevel(round,{type:'flip'}); // -4 strictly crosses +3 -> -1
  const parts=multiplierParts(round.game.deal);
  assert.deepEqual(parts.map(x=>x.value),[2,2,2]);
  assert.deepEqual(multiplierRewards(round.game.deal,round.game.lastAction).map(x=>x.kind),['swing','jackpot']);
  assert.equal(parts.reduce((x,factor)=>x*factor.value,1),overswingMultiplier(round.game.deal));
  assert.equal(round.game.deal.pot.reduce((sum,c)=>sum+Math.abs(signed(c)),0),7);
  assert.equal(overswingPayout(round.game,FIRST_LEVEL.rules),56);
});

test('safe casual STEER always adds the absolute card rank, even without crossing',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'steer',index:0}); // +3, opening
  round=stepFirstLevel(round,{type:'steer',index:0}); // -2: +3 -> +1; not crossing
  assert.equal(round.game.deal.S,1);
  assert.equal(round.game.lastAction.swung,false);
  assert.equal(round.game.lastAction.destination,'pot');
  assert.equal(round.game.lastAction.addedToPot,2);
  assert.deepEqual(round.game.deal.pot.map(id=>Math.abs(signed(id))),[3,2]);
  assert.equal(overswingPayout(round.game,FIRST_LEVEL.rules),5);
});

test('original Overswing noncrossing STEER still discards; casual rule is opt-in only',()=>{
  let normal=newOverswing({deckOverride:FIRST_LEVEL.deck,seed:20261104,initialHandSize:3});
  normal=stepOverswing(normal,{type:'steer',index:0},{snapLimit:8,bankCapacityLoss:0});
  normal=stepOverswing(normal,{type:'steer',index:0},{snapLimit:8,bankCapacityLoss:0});
  assert.equal(normal.deal.S,1);
  assert.equal(normal.lastAction.destination,'discard');
  assert.equal(normal.lastAction.addedToPot,0);
  assert.deepEqual(normal.deal.pot.map(id=>Math.abs(signed(id))),[3]);
});

test('landing exactly on zero resets all multipliers without losing absolute Pot',()=>{
  const rules={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true};
  let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},rules); // +3
  game=stepOverswing(game,{type:'steer',index:0},rules); // -4 crossing, S = -1, W = 1
  assert.equal(game.deal.S,-1);
  assert.deepEqual(multiplierParts(game.deal).map(x=>x.value),[2,1,1]);
  // The hand refills when emptied, so +1 is now in hand, not atop the Flip deck.
  game=stepOverswing(game,{type:'steer',index:0},rules); // +1 exact zero -> Zero Break
  assert.equal(game.lastAction.zeroBreak,true);
  assert.equal(game.deal.S,0);
  assert.deepEqual(multiplierParts(game.deal).map(x=>x.value),[1,1,1]);
  assert.equal(multiplierRewards(game.deal,game.lastAction).length,0);
  assert.deepEqual(game.deal.pot.map(id=>Math.abs(signed(id))),[3,4,1]);
});

test('Snap discards the offending card and unbanked Pot even in casual mode',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'steer',index:0}); // +3
  round=stepFirstLevel(round,{type:'steer',index:1}); // +5 => +8, safe; pot contains 3 and 5
  assert.deepEqual(round.game.deal.pot.map(id=>Math.abs(signed(id))),[3,5]);
  round=stepFirstLevel(round,{type:'flip'}); // +3 => 11, SNAP
  assert.equal(round.game.lastAction.snap,true);
  assert.equal(round.game.deal.pot.length,0);
  assert.deepEqual(multiplierParts(round.game.deal).map(x=>x.value),[1,1,1]);
  assert.equal(multiplierRewards(round.game.deal,round.game.lastAction).length,0);
});


test('presentation keeps pending raw Pot separate from projected Bank payout',()=>{
  let round=newRound();
  const first=stepFirstLevel(round,{type:'flip'});
  const p1=actionPresentation(round,first,{type:'flip'});
  assert.equal(p1.signedCard,3);
  assert.equal(p1.from,0);
  assert.equal(p1.to,3);
  assert.equal(p1.addedToPot,3);
  assert.equal(p1.rawPotAfter,3);
  assert.equal(p1.securedAfter,0);
  assert.deepEqual(p1.rewards.map(x=>x.kind),['flip']);
  round=first;
  const second=stepFirstLevel(round,{type:'flip'});
  const p2=actionPresentation(round,second,{type:'flip'});
  assert.equal(p2.signedCard,-4);
  assert.equal(p2.from,3);
  assert.equal(p2.to,-1);
  assert.equal(p2.addedToPot,4);
  assert.equal(p2.rawPotAfter,7);
  assert.equal(rawPotValue(second.game.deal),7);
  assert.equal(overswingPayout(second.game,FIRST_LEVEL.rules),56);
  assert.equal(p2.securedAfter,0);
  assert.deepEqual(p2.factorsAfter.map(f=>f.value),[2,2,2]);
  assert.deepEqual(p2.rewards.map(f=>f.kind),['swing','jackpot']);
});

test('Bank presentation transfers engine payout but clears only pending Pot',()=>{
  let round=stepFirstLevel(stepFirstLevel(newRound(),{type:'flip'}),{type:'flip'});
  const next=stepFirstLevel(round,{type:'bank'});
  const p=actionPresentation(round,next,{type:'bank'});
  assert.equal(p.rawPotBefore,7);
  assert.equal(p.rawPotAfter,0);
  assert.equal(p.bankGain,56);
  assert.equal(p.securedBefore,0);
  assert.equal(p.securedAfter,56);
  assert.equal(p.event,'win');
  assert.deepEqual(p.rewards,[]);
});

test('Snap presentation never awards Pot or touches previously secured score',()=>{
  let round=newRound();
  round=stepFirstLevel(round,{type:'steer',index:0}); // +3
  round=stepFirstLevel(round,{type:'steer',index:1}); // +5 -> +8
  const next=stepFirstLevel(round,{type:'flip'}); // +3 -> +11 Snap
  const p=actionPresentation(round,next,{type:'flip'});
  assert.equal(p.snap,true);
  assert.equal(p.to,11);
  assert.equal(p.rawPotBefore,8);
  assert.equal(p.rawPotAfter,0);
  assert.equal(p.addedToPot,0);
  assert.equal(p.securedAfter,p.securedBefore);
  assert.equal(p.snapsAfter,1);
  assert.deepEqual(p.rewards,[]);
});

test('zero break retains Pot and produces no fake factor awards',()=>{
  const rules={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true};
  let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},rules); // +3
  game=stepOverswing(game,{type:'steer',index:0},rules); // -4 -> -1
  const before={game,snaps:0,event:{type:'cross'}};
  const nextGame=stepOverswing(game,{type:'steer',index:0},rules); // +1 -> 0
  const after={game:nextGame,snaps:0,event:{type:'zero_break'}};
  const p=actionPresentation(before,after,{type:'steer'});
  assert.equal(p.zeroBreak,true);
  assert.equal(p.to,0);
  assert.equal(p.rawPotBefore,7);
  assert.equal(p.rawPotAfter,8);
  assert.deepEqual(p.factorsAfter.map(f=>f.value),[1,1,1]);
  assert.deepEqual(p.rewards,[]);
});


test('casual non-swing Steer and Flip never spend earned SWING tiers',()=>{
 assert.equal(FIRST_LEVEL.rules.steerNoncrossPenalty,0);
 assert.equal(FIRST_LEVEL.rules.flipNoncrossPenalty,0);
 let round=newRound();
 round=stepFirstLevel(round,{type:'flip'}); // RIGHT 3
 round=stepFirstLevel(round,{type:'flip'}); // LEFT 4 => strict crossing at -1
 assert.equal(round.game.deal.W,1);
 const afterSteer=stepFirstLevel(round,{type:'steer',index:1}); // LEFT 2 => -3
 assert.notStrictEqual(afterSteer,round);
 assert.equal(afterSteer.game.lastAction.swung,false);
 assert.equal(afterSteer.game.lastAction.swingPenalty,false);
 assert.equal(afterSteer.game.deal.W,1);
 const afterFlip=stepFirstLevel(afterSteer,{type:'flip'}); // RIGHT 1 => -2
 assert.notStrictEqual(afterFlip,afterSteer);
 assert.equal(afterFlip.game.lastAction.swung,false);
 assert.equal(afterFlip.game.lastAction.swingPenalty,false);
 assert.equal(afterFlip.game.deal.W,1);
 assert.equal(multiplierParts(afterFlip.game.deal)[0].value,2);
});

test('casual Zero Break still resets Swing tiers and retains pending Pot',()=>{
 const rules={...FIRST_LEVEL.rules};
 let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
 game=stepOverswing(game,{type:'steer',index:0},rules); // RIGHT 3
 game=stepOverswing(game,{type:'steer',index:0},rules); // LEFT 4 -> -1, W=1
 assert.equal(game.deal.W,1);
 const rawBefore=rawPotValue(game.deal);
 game=stepOverswing(game,{type:'steer',index:0},rules); // RIGHT 1 -> exactly 0
 assert.equal(game.lastAction.zeroBreak,true);
 assert.equal(game.deal.W,0);
 assert.equal(game.deal.S,0);
 assert.equal(rawPotValue(game.deal),rawBefore+1);
 assert.deepEqual(multiplierParts(game.deal).map(f=>f.value),[1,1,1]);
});
