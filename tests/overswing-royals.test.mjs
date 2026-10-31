import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,rank,label} from '../src/external/engines.js';
import {startJourney,recordJourneyGold,EMPTY_JOURNEY_PROGRESS,stepJourney} from '../src/external/overswingJourney.js';
import {ROYAL_THRESHOLDS,royalTier,pickRoyalCards,royalRank,royalId} from '../src/external/overswingRoyals.js';

test('lifetime Gold unlock thresholds and journey targets are immutable during the run',()=>{
  assert.deepEqual(ROYAL_THRESHOLDS,[40000,100000,180000]);
  for(const [gold,tier] of [[0,0],[39999,0],[40000,1],[99999,1],[100000,2],[179999,2],[180000,3]])
    assert.equal(royalTier(gold),tier);
  assert.equal(startJourney(7).encounter.effectiveTarget,800);
  assert.equal(startJourney(7,40000).encounter.effectiveTarget,840);
  assert.equal(startJourney(7,100000).encounter.effectiveTarget,880);
  assert.equal(startJourney(7,180000).encounter.effectiveTarget,920);
});
test('Royal hand replaces ordinary cards but FLIP is exclusively A–10',()=>{
  for(const tier of [0,1,2,3]){
    const royals=pickRoyalCards(tier,321,0),s=newOverswing({seed:123,royals}),d=s.deal;
    assert.equal(royals.length,Math.min(tier,2));
    assert.equal(d.hand.length,8);
    assert.equal(d.deck.length+royals.length,40);
    assert.ok(d.deck.every(c=>c<40));
    assert.equal(d.deck.length-d.pos+d.hand.length,40);
    assert.equal(new Set([...d.deck,...royals]).size,40);
    for(const id of royals)assert.ok(d.hand.includes(id));
  }
});
test('J is worth 11, crosses and reveals exactly the next FLIP card',()=>{
  let s=newOverswing({seed:222,royals:[royalId('J',0)]});
  assert.equal(label(s.deal.hand.at(-1)),'J♥');
  assert.equal(rank(s.deal.hand.at(-1)),11);
  s={...s,deal:{...s.deal,S:-5}};
  const top=s.deal.deck[s.deal.pos];
  s=stepOverswing(s,{type:'steer',index:7});
  assert.equal(s.deal.S,6);assert.equal(s.deal.pot.at(-1),royalId('J',0));
  assert.equal(s.deal.scoutNext,top);assert.equal(s.lastAction.scouted,top);
  s=stepOverswing(s,{type:'flip'});
  assert.equal(s.deal.scoutNext,null);
});
test('Q requires direction, adds 12 Pot on safe crossing and can SNAP',()=>{
  let s=newOverswing({seed:222,royals:[royalId('Q',0)]});
  const directions=overswingActions(s).filter(a=>a.type==='steer'&&a.index===7);
  assert.deepEqual(directions.map(x=>x.direction),[1,-1]);
  assert.strictEqual(stepOverswing(s,{type:'steer',index:7}),s);
  s={...s,deal:{...s.deal,S:7}};
  const safe=stepOverswing(s,{type:'steer',index:7,direction:-1});
  assert.equal(safe.deal.S,-5);
  assert.equal(safe.deal.pot.at(-1),royalId('Q',0));
  assert.equal(safe.lastAction.addedToPot,12);
  const snap=stepOverswing(s,{type:'steer',index:7,direction:1});
  assert.equal(snap.lastAction.snap,true);
});
test('K offers an automatically decaying Crown or a dangerous ±13 STEER',()=>{
  const k=royalId('K',0);
  let s=newOverswing({seed:555,royals:[k]});
  assert.equal(s.deal.crownBonus,50);
  s={...s,deal:{...s.deal,S:-8}};
  const played=stepOverswing(s,{type:'steer',index:7});
  assert.equal(played.deal.S,5);assert.equal(played.lastAction.addedToPot,13);
  assert.equal(played.deal.crownBonus,0);
  let held=newOverswing({seed:44,royals:[k]});
  held={...held,deal:{...held.deal,S:0,plays:2,pot:[0,1]}};
  assert.equal(overswingPayout(held),4); // floor(3 * 1.5)
  const bank=stepOverswing(held,{type:'bank'});
  assert.equal(bank.lastAction.points,4);
  assert.equal(bank.lastAction.crownBonus,50);
  assert.equal(bank.deal.hand.length,7); // K consumed covers the capacity drop
  assert.ok(bank.deal.discard.includes(k));
  let expiring=newOverswing({seed:1,royals:[k]});
  for(let i=0;i<5;i++){
    // A legal FLIP counts as a move even on SNAP.
    expiring=stepOverswing(expiring,{type:'flip'});
  }
  assert.equal(expiring.deal.crownBonus,0);
  assert.ok(!expiring.deal.hand.includes(k));
  assert.ok(expiring.deal.discard.includes(k));
});
test('King BANK discards the selected non-K card, not the shifted index',()=>{
  const k=royalId('K',0);
  let s=newOverswing({seed:1,royals:[k]});
  const hand=[k,...s.deal.hand.filter(c=>c!==k)];
  s={...s,deal:{...s.deal,hand,handCap:7,pot:[1],plays:2}};
  const actions=overswingActions(s).filter(a=>a.type==='bank');
  assert.ok(actions.every(a=>a.dropIndex!==0));
  const toDrop=hand[3];
  const bank=stepOverswing(s,{type:'bank',dropIndex:3});
  assert.equal(bank.lastAction.dropped,toDrop);
  assert.ok(!bank.deal.hand.includes(toDrop));
});
test('Gold accounting credits BANK exactly once and is independent of run completion',()=>{
  const run=startJourney(101,0);
  const bankState={...run.encounter.engineState,
    deal:{...run.encounter.engineState.deal,pot:[1],plays:2}};
  const base={...run,encounter:{...run.encounter,engineState:bankState}};
  const after=stepJourney(base,{type:'PLAY',action:{type:'bank',dropIndex:0}});
  const once=recordJourneyGold(EMPTY_JOURNEY_PROGRESS,after);
  assert.equal(once.lifetimeGold,2);
  assert.strictEqual(recordJourneyGold(once,after),once);
  assert.equal(recordJourneyGold(once,run),once);
});
test('full 40-card conservation and legal game termination with Royal combinations',()=>{
  for(const tier of [1,2,3])for(let seed=1;seed<=30;seed++){
    let s=newOverswing({seed,royals:pickRoyalCards(tier,seed,0)});
    for(let turn=0;turn<120&&s.status==='playing';turn++){
      const d=s.deal;
      assert.equal(d.deck.length-d.pos+d.hand.length+d.pot.length+d.discard.length,40);
      const actions=overswingActions(s);
      assert.ok(actions.length>0,'legal actions at seed '+seed+' turn '+turn);
      const banks=actions.filter(a=>a.type==='bank');
      let choice;
      if(banks.length&& (d.plays>=4||d.pos===d.deck.length))choice=banks[0];
      else{
        const steers=actions.filter(a=>a.type==='steer');
        const safe=steers.filter(a=>{
          const c=d.hand[a.index],delta=royalRank(c)==='Q'?a.direction*12:(c<40?((Math.floor(c/10)<2)?1:-1)*(c%10+1):((c-40)%4<2?1:-1)*rank(c));
          return Math.abs(d.S+delta)<=10;
        });
        choice=safe[0]||actions.find(a=>a.type==='flip')||steers[0]||banks[0];
      }
      assert.ok(choice);
      const next=stepOverswing(s,choice);
      assert.notStrictEqual(next,s);
      s=next;
    }
    assert.equal(s.status,'over','seed '+seed+' tier '+tier);
    assert.equal(s.deal.deck.length-s.deal.pos+s.deal.hand.length+s.deal.pot.length+s.deal.discard.length,40);
  }
});
