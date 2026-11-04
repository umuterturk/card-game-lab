import test from 'node:test';
import assert from 'node:assert/strict';
import {newRound,stepFirstLevel,FIRST_LEVEL} from '../src/casual/firstLevel.js';
import {overswingActions,overswingPayout,signed} from '../src/external/engines.js';

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
