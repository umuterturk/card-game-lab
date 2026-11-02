import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const get=file=>readFileSync(new URL('../src/external/'+file,import.meta.url),'utf8');

test('Gold uses one shared accessible pixel coin and one formatted Gold amount component',()=>{
  const icon=get('GoldCoin.jsx');
  assert.match(icon,/export function GoldCoin\(/);
  assert.match(icon,/export default function GoldAmount\(/);
  assert.match(icon,/viewBox="0 0 24 24"/);
  assert.match(icon,/shapeRendering="crispEdges"/);
  assert.match(icon,/os-gold-coin-shine/);
  assert.match(icon,/role="img" aria-label=\{spokenPrefix\+formatted\+' Gold'\}/);
  assert.match(icon,/Number\(value\)\.toLocaleString\('en-US'\)/);
  assert.match(icon,/aria-hidden="true"/);
  assert.doesNotMatch(icon,/setInterval|setTimeout|Date\.now|requestAnimationFrame/);
});

test('coin shines gently in stepped frames and respects reduced-motion settings',()=>{
  const css=get('goldCoin.css');
  assert.match(css,/\.os-gold-coin-shine::after/);
  assert.match(css,/animation:os-gold-glint 5\.6s steps\(12,end\) infinite/);
  assert.match(css,/@keyframes os-gold-glint/);
  assert.match(css,/0%,67%/);
  assert.match(css,/87%,100%/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important;opacity:0!important/);
  assert.match(css,/image-rendering:pixelated/);
});

test('main page, journey preparation, purchases, retries and results show the same Gold icon',()=>{
  const jsx=get('OverswingJourney.jsx');
  assert.match(jsx,/import GoldAmount(?:,\{GoldCoin\})? from '\.\/GoldCoin\.jsx';/);
  assert.match(jsx,/<GoldAmount value=\{progress\.lifetimeGold\|\|0\} showLabel/);
  assert.match(jsx,/<GoldProgress progress=\{progress\} compact\/>/);
  assert.match(jsx,/<GoldAmount value=\{price\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{journeyRelicPrice\(run\)\}\/>/);
  assert.match(jsx,/RETRY GATE · <GoldAmount value=\{price\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{journeyGoldBalance\(run\)\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{journeyRunScore\(run\)\} size="lg"\/>/);
  assert.match(jsx,/<GoldAmount value=\{row\.finalScore\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{run\.completedEncounters\.at\(-1\)\.finalScore\}/);
  assert.doesNotMatch(jsx,/✦ \{fmt\(progress\.lifetimeGold/);
  assert.doesNotMatch(jsx,/BUY \{fmt\(price\)\} G/);
  assert.doesNotMatch(jsx,/\{fmt\(journeyGoldBalance\(run\)\)\} G/);
});

test('gameplay Gold score, BANK button, gate goals and game-over results share the coin',()=>{
  const jsx=get('OverswingPlay.jsx');
  assert.match(jsx,/import GoldAmount(?:,\{GoldCoin\})? from '\.\/GoldCoin\.jsx';/);
  assert.match(jsx,/<GoldAmount value=\{d\.T\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{total\}\/>/);
  assert.match(jsx,/<GoldAmount value=\{payout\} prefix="\+"\/>/);
  assert.match(jsx,/<GoldAmount value=\{e\.points\} prefix="\+"\/>/);
  assert.match(jsx,/<GoldAmount value=\{e\.taxPaid\} prefix="−"\/>/);
  assert.match(jsx,/<GoldAmount value=\{s\.dealTotals\.reduce/);
  assert.doesNotMatch(jsx,/✦ \{isJourney\?'GATE GOLD'/);
  assert.doesNotMatch(jsx,/♛ BANK NOW/);
  assert.doesNotMatch(jsx,/>\+\{payout\.toLocaleString\('en-US'\)\} PTS</);
});

test('coin sizing handles compact phones without breaking shop layouts',()=>{
  const journey=get('overswingJourney.css');
  const play=get('overswing.css');
  assert.match(journey,/\.oj-shop-wallet > span\{/);
  assert.match(journey,/\.oj-shop-wallet > span > strong\{/);
  assert.match(journey,/\.oj-map-home \.oj-gold-compact \.os-gold-amount/);
  assert.match(journey,/\.oj-recap-rows \.os-gold-coin/);
  assert.match(play,/\.os8-scoreline \.os-gold-coin/);
  assert.match(play,/\.os8-actions-primary \.os-gold-coin/);
  assert.match(play,/@media\(max-width:390px\)/);
});
