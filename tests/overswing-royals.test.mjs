import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,rank,label} from '../src/external/engines.js';
import {startJourney,recordJourneyGold,EMPTY_JOURNEY_PROGRESS,stepJourney} from '../src/external/overswingJourney.js';
import {ROYAL_PRICES,royalCardsForLoadout,pickRoyalCards,royalRank,royalId,KING_INITIAL_BANK_BONUS,KING_DECAY_PER_MOVE,ROYAL_RULES} from '../src/external/overswingRoyals.js';

// Isolated Royal fixture preserves card conservation while positioning one
// summoned card into a known hand slot for deterministic J/Q/K ability tests.
function withRoyalInHand(s,royal){
  const d=s.deal;
  assert.ok(d.royalQueue.includes(royal),'Royal must be available for SUMMON');
  const ordinary=d.hand.at(-1);
  return {...s,deal:{...d,
    hand:[...d.hand.slice(0,-1),royal],
    deck:[...d.deck,ordinary],
    royalQueue:d.royalQueue.filter(c=>c!==royal),
    summonedRoyals:[...d.summonedRoyals,royal],
    crownBonus:royalRank(royal)==='K'?KING_INITIAL_BANK_BONUS:d.crownBonus
  }};
}
const royalReserve=d=>d.royalQueue||[];
const totalCards=d=>d.deck.length-d.pos+d.hand.length+d.pot.length+
  d.discard.length+royalReserve(d).length;

test('Royal cards are permanent purchases, never wealth-based auto-unlocks or difficulty scaling',()=>{
  assert.deepEqual(ROYAL_PRICES,{J:40000,Q:100000,K:180000});
  for(const balance of [0,39999,40000,100000,180000,999999]){
    assert.equal(startJourney(7,balance).encounter.effectiveTarget,800);
    assert.equal(startJourney(7,balance).encounter.engineState.deal.hand.filter(id=>id>=40).length,0,
      'Gold balance alone must never inject Royal cards');
  }
});
test('Royal loadout produces a game-wide seeded summon order and suits',()=>{
  for(let seed=1;seed<=50;seed++){
    const a=startJourney(seed,10000,1,['K','Q','J']);
    assert.deepEqual(a.equippedRoyals,['K','Q','J']);
    assert.deepEqual(a.encounter.engineState.deal.hand.filter(id=>id>=40),[]);
    assert.deepEqual(a.encounter.engineState.deal.royalQueue.map(royalRank).sort(),['J','K','Q']);
    assert.deepEqual(a.encounter.engineState.deal.royalQueue,
      royalCardsForLoadout(a.equippedRoyals,a.royalSeed));
    assert.ok(a.encounter.engineState.deal.deck.every(c=>c<40));
    assert.equal(a.encounter.engineState.deal.deck.length,37);
  }
  assert.throws(()=>royalCardsForLoadout(['J','J'],42),TypeError);
});
test('Royal reserve replaces ordinary cards and only SUMMON can release it',()=>{
  for(const tier of [0,1,2,3]){
    const royals=pickRoyalCards(tier,321,0),s=newOverswing({seed:123,royals}),d=s.deal;
    assert.equal(royals.length,Math.min(tier,2));
    assert.equal(d.hand.length,8);
    assert.equal(d.deck.length+royals.length,40);
    assert.ok(d.deck.every(c=>c<40));
    assert.equal(totalCards(d),40);
    assert.ok(d.hand.every(id=>id<40));
    assert.deepEqual(new Set(royalReserve(d)),new Set(royals));
    assert.equal(overswingActions(s).some(a=>a.type==='summon'),false,'opening hand is full');
  }
});
test('SUMMON is deliberate, limited consecutively and never affects ordinary FLIP deck',()=>{
  const royals=[royalId('J',0),royalId('K',1)];
  let s=newOverswing({seed:7,royals});
  const d=s.deal;
  // Free a slot while accounting for the displaced ordinary card.
  s={...s,deal:{...d,hand:d.hand.slice(0,-1),
    discard:[...d.discard,d.hand.at(-1)]}};
  assert.ok(overswingActions(s).some(a=>a.type==='summon'));
  const nextCard=s.deal.deck[s.deal.pos],beforeFlip=s.deal.flips;
  s=stepOverswing(s,{type:'summon'});
  assert.equal(s.lastAction.card,royals[0]);
  assert.equal(s.deal.royalQueue.length,1);
  assert.equal(s.deal.consecutiveSummons,1);
  assert.equal(s.deal.flips,beforeFlip);
  assert.equal(s.deal.deck[s.deal.pos],nextCard);
  assert.ok(!overswingActions(s).some(a=>a.type==='summon'));
  assert.equal(totalCards(s.deal),40);
  s=stepOverswing(s,{type:'flip'});
  assert.ok(s.lastAction.card<40);
  assert.equal(s.deal.consecutiveSummons,0);
  assert.equal(totalCards(s.deal),40);
});
test('the same Royal ordering is reused in all three gates of a journey',()=>{
  let run=startJourney(902,0,1,['J','Q','K']);
  const queue=run.encounter.engineState.deal.royalQueue.slice();
  const closeGate=run=>{
    const engine=run.encounter.engineState,d=engine.deal;
    const prepared={...run,encounter:{...run.encounter,
      engineState:{...engine,deal:{...d,pos:d.deck.length,hand:[],
        pot:[0],plays:2,T:10000}}}};
    return stepJourney(prepared,{type:'PLAY',action:{type:'bank'}});
  };
  run=closeGate(run);
  run=stepJourney(run,{type:'SKIP_RELIC'});
  assert.deepEqual(run.encounter.engineState.deal.royalQueue,queue);
  run=closeGate(run);
  run=stepJourney(run,{type:'SKIP_RELIC'});
  assert.deepEqual(run.encounter.engineState.deal.royalQueue,queue);
  assert.notEqual(startJourney(903,0,1,['J','Q','K']).royalSeed,run.royalSeed);
});
test('J is worth 11, crosses and reveals exactly the next FLIP card',()=>{
  let s=withRoyalInHand(newOverswing({seed:222,royals:[royalId('J',0)]}),royalId('J',0));
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
test('Scout preview follows automatic hand refill rather than revealing a card moved to the hand',()=>{
  const j=royalId('J',0);
  let s=withRoyalInHand(newOverswing({seed:13,royals:[j]}),j);
  s={...s,deal:{...s.deal,hand:[j],S:-5}};
  const before=s.deal.pos;
  s=stepOverswing(s,{type:'steer',index:0});
  assert.ok(s.lastRefill.length>0);
  assert.ok(s.deal.pos>before);
  assert.equal(s.deal.scoutNext,s.deal.deck[s.deal.pos]);
  assert.equal(s.lastAction.scouted,s.deal.scoutNext);
});
test('Q requires direction, adds 12 Pot on safe crossing and can SNAP',()=>{
  let s=withRoyalInHand(newOverswing({seed:222,royals:[royalId('Q',0)]}),royalId('Q',0));
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
  let s=withRoyalInHand(newOverswing({seed:555,royals:[k]}),k);
  assert.equal(s.deal.crownBonus,100);
  assert.equal(KING_INITIAL_BANK_BONUS,100);
  assert.equal(KING_DECAY_PER_MOVE,10);
  assert.match(ROYAL_RULES.K.description,/\+100%/);
  s={...s,deal:{...s.deal,S:-8}};
  const played=stepOverswing(s,{type:'steer',index:7});
  assert.equal(played.deal.S,5);assert.equal(played.lastAction.addedToPot,13);
  assert.equal(played.deal.crownBonus,0);
  let held=withRoyalInHand(newOverswing({seed:44,royals:[k]}),k);
  held={...held,deal:{...held.deal,S:0,plays:2,pot:[0,1]}};
  assert.equal(overswingPayout(held),6); // 3 * 2
  const bank=stepOverswing(held,{type:'bank'});
  assert.equal(bank.lastAction.points,6);
  assert.equal(bank.lastAction.crownBonus,100);
  assert.equal(bank.deal.hand.length,7); // K consumed covers the capacity drop
  assert.ok(bank.deal.discard.includes(k));
  let expiring=withRoyalInHand(newOverswing({seed:1,royals:[k]}),k);
  for(let i=0;i<10;i++){
    // A legal FLIP counts as a move even on SNAP.
    expiring=stepOverswing(expiring,{type:'flip'});
    assert.equal(expiring.deal.crownBonus,Math.max(0,100-(i+1)*10));
  }
  assert.equal(expiring.deal.crownBonus,0);
  assert.ok(!expiring.deal.hand.includes(k));
  assert.ok(expiring.deal.discard.includes(k));
});
test('King BANK discards the selected non-K card, not the shifted index',()=>{
  const k=royalId('K',0);
  let s=withRoyalInHand(newOverswing({seed:1,royals:[k]}),k);
  const hand=[k,...s.deal.hand.filter(c=>c!==k)];
  s={...s,deal:{...s.deal,hand,handCap:7,pot:[1],plays:2}};
  const actions=overswingActions(s).filter(a=>a.type==='bank');
  assert.ok(actions.every(a=>a.dropIndex!==0));
  const toDrop=hand[3];
  const bank=stepOverswing(s,{type:'bank',dropIndex:3});
  assert.equal(bank.lastAction.dropped,toDrop);
  assert.ok(!bank.deal.hand.includes(toDrop));
});
test('BANK adds provisional gate Gold but not Treasury or lifetime Royal progress',()=>{
  const run=startJourney(101,0);
  const bankState={...run.encounter.engineState,
    deal:{...run.encounter.engineState.deal,pot:[1],plays:2}};
  const base={...run,encounter:{...run.encounter,engineState:bankState}};
  const after=stepJourney(base,{type:'PLAY',action:{type:'bank',dropIndex:0}});
  assert.equal(after.encounter.engineState.lastAction.points,2);
  assert.equal(after.encounter.engineState.deal.T,2);
  assert.strictEqual(recordJourneyGold(EMPTY_JOURNEY_PROGRESS,after),EMPTY_JOURNEY_PROGRESS);
  assert.equal(recordJourneyGold(EMPTY_JOURNEY_PROGRESS,after).lifetimeGold,0);
});
test('full 40-card conservation and legal game termination with Royal combinations',()=>{
  for(const tier of [1,2,3])for(let seed=1;seed<=30;seed++){
    let s=newOverswing({seed,royals:pickRoyalCards(tier,seed,0)});
    for(let turn=0;turn<120&&s.status==='playing';turn++){
      const d=s.deal;
      assert.equal(totalCards(d),40);
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
    assert.equal(totalCards(s.deal),40);
  }
});
