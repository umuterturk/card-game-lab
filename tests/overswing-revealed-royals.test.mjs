import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {royalRank,royalSuit,royalId,ROYAL_NAMES} from '../src/external/overswingRoyals.js';
import {suit,label,rank} from '../src/external/engines.js';

const source=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');
const SUITS=['♥','♦','♠','♣'];

test('all twelve J/Q/K combinations retain their authentic red or black suits',()=>{
  for(const royal of ROYAL_NAMES)for(let index=0;index<4;index++){
    const id=royalId(royal,index);
    assert.equal(royalRank(id),royal);
    assert.equal(royalSuit(id),index);
    assert.equal(suit(id),index);
    assert.equal(label(id),royal+SUITS[index]);
    assert.equal(rank(id),{J:11,Q:12,K:13}[royal]);
  }
});
test('character faces are absent, replaced with suit-aware engraved gold Royals',()=>{
  const play=source('OverswingPlay.jsx');
  const journey=source('OverswingJourney.jsx');
  const gallery=source('RevealedCards.jsx');
  for(const jsx of [play,journey,gallery])assert.doesNotMatch(jsx,/RoyalPortrait/);
  assert.match(journey,/oj-royal-insignia/);
  assert.match(journey,/oj-royal-large-insignia/);
  assert.match(play,/royalRank\(id\)\?' os8-royal'/);
  assert.match(play,/suit\(id\)<2\?'os8-red':'os8-black'/);
  const css=source('overswingVisualFix.css');
  assert.match(css,/\.os8-card\.os8-royal\.os8-red/);
  assert.match(css,/\.os8-card\.os8-royal\.os8-black/);
  assert.match(css,/\.oj-royal-symbol-j/);
  assert.match(css,/\.oj-royal-symbol-q/);
  assert.match(css,/\.oj-royal-symbol-k/);
  assert.match(css,/\.oj-royal-card/);
});
test('only one paid REVEAL ALL button shows sorted still-undrawn cards as mini playing cards',()=>{
  const gallery=source('RevealedCards.jsx');
  const play=source('OverswingPlay.jsx');
  assert.match(gallery,/function RevealedMiniCard/);
  assert.match(gallery,/REVEALED DECK/);
  assert.match(gallery,/remaining\.filter\(id=>paid\.has\(id\)\)\.sort\(sortDeckCards\)/);
  assert.match(gallery,/REVEAL ALL \{offer\.count\} CARDS/);
  assert.match(gallery,/revealOffer\(run\)/);
  assert.match(gallery,/onClick=\{\(\)=>onPurchase\?\.\(\)\}/);
  assert.doesNotMatch(gallery,/RoyalPortrait|CARD_RANKS|history\.groups|REVEAL 3|REVEAL 8/);
  assert.match(gallery,/os8-revealed-pip/);
  assert.match(gallery,/os8-revealed-corner/);
  assert.match(play,/aria-label="Reveal remaining deck for Gold"/);
  assert.match(play,/revealOffer\(journey\)/);
  const css=source('revealedCards.css');
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/os8-revealed-red/);
  assert.match(css,/os8-revealed-black/);
});
test('JACKPOT and ZERO/SNAP impacts are above the flying card but below Pot fracture',()=>{
  const feedback=source('OverswingFeedback.jsx');
  const block=feedback.slice(feedback.indexOf('export function MultiplierBurst'),
    feedback.indexOf('// Additional translucent glass fracture'));
  assert.match(block,/return createPortal\(/);
  assert.match(block,/document\.body\)/);
  const play=source('OverswingPlay.jsx');
  assert.match(play,/os8-impact-over-card/);
  assert.match(play,/return createPortal\(<div className=\{'os8-impact/);
  const css=source('overswingFeedback.css');
  const flightCss=source('overswing.css');
  const fix=source('overswingVisualFix.css');
  const z=(text,selector)=>{
    const idx=text.indexOf(selector);
    assert.ok(idx>=0,'No selector '+selector);
    const block=text.slice(idx,text.indexOf('}',idx));
    const result=block.match(/z-index:\s*(\d+)/);
    assert.ok(result,'No layer '+selector);
    return +result[1];
  };
  const flight=z(flightCss,'.os8-flip-flight{');
  const reward=z(css,'.os8-multiplier-burst{');
  const impact=z(fix,'.os8-impact.os8-impact-over-card{');
  const crack=z(css,'.os8-pot-crack{');
  assert.ok(flight<reward&&reward<impact&&impact<crack);
  assert.match(fix,/pointer-events:none/);
});
