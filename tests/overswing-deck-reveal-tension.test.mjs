import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startJourney,stepJourney,journeyGoldBalance,recordJourneyGold,
  EMPTY_JOURNEY_PROGRESS,isValidJourney} from '../src/external/overswingJourney.js';
import {revealOffer,revealDeckPrice,sortDeckCards} from '../src/external/overswingReveal.js';
import {overswingTension,musicLayerMix} from '../src/external/overswingTension.js';
import {newOverswing} from '../src/external/engines.js';
import {scoreNoteAt,createOverswingAudio} from '../src/external/overswingAudio.js';

const file=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');

test('Late-deck intelligence is priced MORE than early-deck information',()=>{
  const prices=[40,30,20,10,5,2,1].map(n=>revealDeckPrice(n,40));
  assert.deepEqual(prices,[720,810,955,1320,1655,1930,2040]);
  assert.ok(prices.every((price,i)=>i===0||price>prices[i-1]));
  for(let n=1;n<40;n++)
    assert.ok(revealDeckPrice(n,40)>=revealDeckPrice(n+1,40),
      'every fewer card must cost at least as much');
  assert.throws(()=>revealDeckPrice(0,40),RangeError);
  assert.throws(()=>revealDeckPrice(41,40),RangeError);
  assert.throws(()=>revealDeckPrice(10,0),RangeError);
  assert.ok(revealDeckPrice(5,40)>revealDeckPrice(20,40));
});
test('Single Reveal All buys sorted remaining deck cards, never their draw order',()=>{
  const run=startJourney(2354,10000,1);
  const deal=run.encounter.engineState.deal;
  const remaining=deal.deck.slice(deal.pos);
  const offer=revealOffer(run);
  assert.equal(offer.count,remaining.length);
  assert.equal(offer.price,revealDeckPrice(remaining.length,deal.deck.length));
  assert.deepEqual(offer.cards,remaining.slice().sort(sortDeckCards));
  const paid=stepJourney(run,{type:'BUY_REVEAL'});
  assert.notStrictEqual(paid,run);
  assert.equal(paid.revealPurchaseCount,1);
  assert.equal(paid.revealGoldSpent,offer.price);
  assert.equal(paid.goldSpent,offer.price);
  assert.equal(journeyGoldBalance(paid),10000-offer.price);
  assert.deepEqual(paid.revealedCardIds,offer.cards);
  assert.deepEqual(paid.encounter.engineState.deal.deck,deal.deck);
  assert.equal(paid.encounter.engineState.deal.pos,deal.pos);
  assert.equal(revealOffer(paid),null,'Reveal All cannot be purchased a second time');
  assert.strictEqual(stepJourney(paid,{type:'BUY_REVEAL'}),paid);
  assert.ok(isValidJourney(paid));
  const progress=recordJourneyGold({...EMPTY_JOURNEY_PROGRESS,lifetimeGold:10000},paid);
  assert.equal(progress.lifetimeGold,10000-offer.price);
  assert.strictEqual(recordJourneyGold(progress,paid),progress,'never double-charge');
});
test('Waiting until the deck shrinks increases its single Reveal All price',()=>{
  const run=startJourney(2742,10000,1);
  const before=revealOffer(run);
  const afterFlip=stepJourney(run,{type:'PLAY',action:{type:'flip'}});
  assert.ok(afterFlip.encounter.engineState.deal.pos>run.encounter.engineState.deal.pos);
  const after=revealOffer(afterFlip);
  assert.ok(after.count<before.count);
  assert.ok(after.price>=before.price);
  assert.equal(stepJourney(startJourney(2742,0),{type:'BUY_REVEAL'}).revealPurchaseCount,0,
    'cannot purchase without enough Gold');
});
test('Revealed deck UI is a single paid action and hides cards already drawn',()=>{
  const js=file('RevealedCards.jsx');
  const logic=file('overswingReveal.js');
  assert.match(js,/remaining\.filter\(id=>paid\.has\(id\)\)\.sort\(sortDeckCards\)/);
  assert.match(js,/REVEAL ALL \{offer\.count\} CARDS/);
  assert.doesNotMatch(js,/REVEAL 3|REVEAL 8|REVEAL_TIERS|options\.map/);
  assert.match(js,/onClick=\{e=>onPurchase\?\.\(e\.currentTarget\)\}/);
  assert.match(logic,/deal\.deck\.slice\(deal\.pos\)\.sort\(sortDeckCards\)/);
  const journey=file('OverswingJourney.jsx');
  assert.match(journey,/stepJourney\(current,\{type:'BUY_REVEAL'\}\)/);
  assert.match(journey,/revealGoldSpent/);
});
test('Tension builds from gate Gold progress, cards remaining and gate level only',()=>{
  const deal=newOverswing({seed:110}).deal;
  const first=overswingTension({deal,target:3000,gateLevel:1});
  const halfway=overswingTension({deal:{...deal,T:1500},target:3000,gateLevel:1});
  const fewCards=overswingTension({
    deal:{...deal,T:1500,pos:30,hand:[deal.hand[0]]},
    target:3000,gateLevel:1
  });
  const lateGate=overswingTension({
    deal:{...deal,T:1500,pos:30,hand:[deal.hand[0]]},
    target:3000,gateLevel:36
  });
  assert.equal(first,.06);
  assert.ok(first<halfway&&halfway<fewCards&&fewCards<lateGate);
  // Changes to volatile Pot or pendulum state must not change the soundtrack.
  assert.equal(overswingTension({
    deal:{...deal,S:9,W:9,pot:[2,5,8],flipFactor:9,jackpotFactor:9},
    target:3000,gateLevel:1
  }),first);
  const a=musicLayerMix(first),b=musicLayerMix(lateGate);
  for(const k of ['percussion','menace','bass'])assert.ok(a[k]<b[k]);
  assert.equal(a.melody,1);assert.equal(b.melody,1);
  assert.equal(scoreNoteAt(0),scoreNoteAt(64));
  assert.equal(scoreNoteAt(31),scoreNoteAt(95));
  const audio=createOverswingAudio(null);
  assert.equal(audio.setTension(.73),.73);
  assert.equal(audio.tension,.73);
  assert.equal(audio.setTension(3),1);
  audio.dispose();
  const src=file('overswingAudio.js');
  assert.match(src,/smoothedTension\+=rate\*\(targetTension-smoothedTension\)/);
  assert.match(src,/const note=scoreNoteAt\(step,trackId\)/);
  assert.match(src,/synthwaveBassPitch/);
  assert.match(src,/layers\.percussion/);
  assert.match(src,/layers\.menace/);
});
test('Success never displays GAME OVER on a campaign gate and ZERO is layered above cards',()=>{
  const game=file('OverswingPlay.jsx');
  assert.match(game,/!isJourney&&s\.status==='over'/);
  assert.match(game,/DEAL COMPLETE/);
  assert.match(game,/return createPortal\(<div className=\{'os8-impact/);
  const css=file('overswingVisualFix.css');
  assert.match(css,/\.os8-impact\.os8-impact-over-card/);
  assert.match(css,/z-index:1076/);
});
test('Secondary actions use pixel icons, Royals are gilded without portraits',()=>{
  const icon=file('OverswingAbilityIcon.jsx');
  for(const id of ['shuffle','polarity','shield','revealed'])
    assert.ok(icon.includes(id+':<>'));
  assert.match(icon,/shapeRendering="crispEdges"/);
  const game=file('OverswingPlay.jsx'),journey=file('OverswingJourney.jsx');
  assert.doesNotMatch(game,/RoyalPortrait/);
  assert.doesNotMatch(journey,/RoyalPortrait/);
  assert.match(journey,/oj-royal-large-insignia/);
  const css=file('overswingVisualFix.css');
  assert.match(css,/\.os8-ability-shuffle/);
  assert.match(css,/\.os8-ability-polarity/);
  assert.match(css,/\.os8-ability-shield/);
  assert.match(css,/\.os8-ability\.os8-history-button/);
  assert.match(css,/\.os8-card\.os8-royal\.os8-red/);
  assert.match(css,/\.os8-card\.os8-royal\.os8-black/);
});
