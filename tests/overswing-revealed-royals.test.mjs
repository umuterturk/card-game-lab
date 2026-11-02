import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardHistory} from '../src/external/overswingHistory.js';
import {royalRank,royalSuit,royalId,ROYAL_NAMES} from '../src/external/overswingRoyals.js';
import {suit,label,rank} from '../src/external/engines.js';

const source=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');
const SUITS=['♥','♦','♠','♣'];

test('J/Q/K retain true red/black suit and rank in all twelve royal variants',()=>{
  for(const royal of ROYAL_NAMES){
    for(let index=0;index<4;index++){
      const id=royalId(royal,index);
      assert.equal(royalRank(id),royal);
      assert.equal(royalSuit(id),index);
      assert.equal(suit(id),index);
      assert.equal(label(id),royal+SUITS[index]);
      assert.equal(rank(id),{J:11,Q:12,K:13}[royal]);
    }
  }
});
test('three distinct illustrated SVG portraits exist for Scout, Mirror and Crown',()=>{
  const art=source('RoyalPortrait.jsx');
  for(const identity of ["royal==='J'","royal==='Q'","royal==='K'"]){
    assert.ok(art.includes(identity));
  }
  assert.match(art,/48×60 pixel-art/);
  assert.match(art,/viewBox="0 0 48 60"/);
  assert.match(art,/shapeRendering="crispEdges"/);
  assert.match(art,/royalSuit\(id\)/);
  assert.match(art,/os-royal-portrait-red/);
  assert.match(art,/os-royal-portrait-black/);
  assert.match(art,/The Scout/);
  assert.match(art,/The Mirror/);
  assert.match(art,/The Melting Crown/);
  assert.match(art,/role="img"/);
});
test('playable, animated, shop and Royal reveal cards share illustrated characters',()=>{
  const game=source('OverswingPlay.jsx');
  assert.match(game,/<RoyalPortrait id=\{id\} size="card"\/>/);
  assert.match(game,/<RoyalPortrait id=\{flight\.card\} size="flight"\/>/);
  const shop=source('OverswingJourney.jsx');
  assert.match(shop,/<RoyalPortrait rank=\{id\} size="workshop"\/>/);
  assert.match(shop,/<RoyalPortrait rank=\{id\} size="reveal"\/>/);
  const css=source('overswing.css');
  assert.match(css,/\.os8-card\.os8-royal\.os8-red\{/);
  assert.match(css,/\.os8-card\.os8-royal\.os8-black\{/);
  assert.match(css,/\.os8-hand \.os8-card\.os8-royal \.os-royal-portrait-card/);
  assert.match(css,/\.os8-flip-flight \.os-royal-portrait-flight/);
  const shopCss=source('overswingJourney.css');
  assert.match(shopCss,/\.oj-royal-symbol-j/);
  assert.match(shopCss,/\.oj-royal-symbol-q/);
  assert.match(shopCss,/\.oj-royal-symbol-k/);
});
test('Revealed Cards groups only visible cards and never exposes hidden deck order',()=>{
  const deal={
    deck:Array.from({length:40},(_,i)=>i),pos:7,
    discard:[31,13,royalId('Q',3),19],
    pot:[2,22,royalId('J',0)],
    hand:[5,royalId('K',1),1]
  };
  const h=cardHistory(deal);
  assert.equal(h.revealed,10);
  assert.deepEqual(h.groups.discard,[13,19,31,royalId('Q',3)]);
  assert.deepEqual(h.groups.pot,[2,22,royalId('J',0)]);
  assert.deepEqual(h.groups.hand,[1,5,royalId('K',1)]);
  assert.equal(h.unseen,33);
  assert.equal(h.states[0],'unknown');
  assert.equal(Object.hasOwn(h,'deck'),false);
  assert.equal(Object.hasOwn(h,'remainingCards'),false);
  assert.equal(Object.hasOwn(h,'drawOrder'),false);
});
test('Revealed Cards screen presents mini playing cards, not a dull 40-cell matrix',()=>{
  const gallery=source('RevealedCards.jsx');
  assert.match(gallery,/function RevealedMiniCard/);
  assert.match(gallery,/REVEALED CARDS/);
  assert.match(gallery,/history\.groups\[group\.id\]\.map/);
  assert.match(gallery,/os8-revealed-pip/);
  assert.match(gallery,/os8-revealed-corner/);
  assert.match(gallery,/RoyalPortrait id=\{id\} size="history"/);
  assert.doesNotMatch(gallery,/CARD_RANKS|40\.map|UNKNOWN/);
  assert.match(gallery,/not reveal the next FLIP/);
  const css=source('revealedCards.css');
  assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css,/os8-revealed-royal/);
  assert.match(css,/@media\(max-width:370px\)/);
});
test('JACKPOT and other multiplier effects portal above flying card and coins',()=>{
  const feedback=source('OverswingFeedback.jsx');
  const block=feedback.slice(feedback.indexOf('export function MultiplierBurst'),
    feedback.indexOf('// Additional translucent glass fracture'));
  assert.match(block,/return createPortal\(/);
  assert.match(block,/document\.body\)/);
  const css=source('overswingFeedback.css'),gameCss=source('overswing.css');
  const z=(str,selector)=>{
    const i=str.indexOf(selector);
    assert.ok(i>=0,'Missing '+selector);
    const block=str.slice(i,str.indexOf('}',i));
    const m=block.match(/z-index:\s*(\d+)/);
    assert.ok(m,'Missing layer for '+selector);
    return Number(m[1]);
  };
  const flight=z(gameCss,'.os8-flip-flight{');
  const coins=z(gameCss,'.os8-bank-burst{');
  const bonus=z(css,'.os8-multiplier-burst{');
  const pot=z(css,'.os8-pot-crack{');
  const dialogs=z(gameCss,'.os8-wild-overlay{');
  assert.ok(flight<coins&&coins<bonus&&bonus<pot&&pot<dialogs,
    'reward must be above card and coins, beneath fracture and dialogs');
  assert.match(css,/position:fixed;left:50%;top:44%/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
