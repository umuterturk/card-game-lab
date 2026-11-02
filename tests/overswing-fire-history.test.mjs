import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDoomFire,stepDoomFire,paintDoomFire,DOOM_FIRE_PALETTE} from '../src/external/doomFire.js';
import {cardHistory} from '../src/external/overswingHistory.js';
import {pixelPendulumFrame,PENDULUM_FPS,PENDULUM_SNAP_MS} from '../src/external/overswingPendulum.js';
import {newOverswing,stepOverswing,signed} from '../src/external/engines.js';
import {royalId} from '../src/external/overswingRoyals.js';

const source=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');

test('Doom fire uses bounded, deterministic, tiny heat buffers and a transparent smoke-to-fire palette',()=>{
  assert.equal(DOOM_FIRE_PALETTE.length,37);
  assert.equal(DOOM_FIRE_PALETTE[0][3],0);
  assert.ok(DOOM_FIRE_PALETTE[4][3]>0&&DOOM_FIRE_PALETTE[4][3]<DOOM_FIRE_PALETTE[35][3]);
  assert.ok(DOOM_FIRE_PALETTE[4][0]<DOOM_FIRE_PALETTE[35][0]);
  assert.throws(()=>createDoomFire(5,12),RangeError);
  assert.throws(()=>createDoomFire(260,12),RangeError);
  let a=createDoomFire(32,28,718),b=createDoomFire(32,28,718);
  assert.equal(a.intensity.length,896);
  for(let i=0;i<125;i++){
    stepDoomFire(a);stepDoomFire(b);
  }
  assert.deepEqual(a.intensity,b.intensity,'identical seeds must produce identical flames');
  assert.ok(a.intensity.every(value=>value>=0&&value<=36));
  assert.ok(a.intensity.some(value=>value>=22),'bright fire must be present');
  assert.ok(a.intensity.some(value=>value>0&&value<13),'cooling produces smoke');
  const rgba=new Uint8ClampedArray(a.intensity.length*4);
  assert.strictEqual(paintDoomFire(a,rgba),rgba);
  assert.ok(rgba.some(x=>x>0));
  assert.throws(()=>paintDoomFire(a,new Uint8ClampedArray(3)),RangeError);
});

test('card history marks public discard, hand, and Pot without leaking unseen deck order',()=>{
  const ordinary=Array.from({length:38},(_,i)=>i+2);
  const deal={deck:ordinary,pos:8,discard:[6,16,40],pot:[5,7],
    hand:[2,12,royalId('J',0)]};
  const history=cardHistory(deal);
  assert.equal(history.discarded,3);
  assert.equal(history.potCount,2);
  assert.equal(history.handCount,3);
  assert.equal(history.unseen,30);
  assert.equal(history.states.length,40);
  assert.equal(history.states[6],'out');
  assert.equal(history.states[16],'out');
  assert.equal(history.states[5],'pot');
  assert.equal(history.states[2],'hand');
  assert.equal(history.states[0],'unknown',
    'excluded ordinary cards must not be falsely marked as remaining');
  assert.equal(history.states[29],'unknown');
  assert.deepEqual(history.royalsOut,[40]);
  assert.equal(Object.hasOwn(history,'deck'),false);
  assert.equal(Object.hasOwn(history,'remainingCards'),false);
  assert.equal(history.revealed,7,'duplicate mock card is counted once');
  assert.deepEqual(history.groups.discard,[6,16,40]);
  assert.deepEqual(history.groups.pot,[5,7]);
  assert.deepEqual(history.groups.hand,[2,12,royalId('J',0)]);
  assert.throws(()=>cardHistory(null),TypeError);
});
test('history tracks real engine after BANK and after SNAP',()=>{
  let s=newOverswing({seed:42});
  s={...s,deal:{...s.deal,pot:[0,1],plays:2,hand:s.deal.hand.slice(0,3),handCap:4}};
  const bank=stepOverswing(s,{type:'bank'});
  assert.notStrictEqual(bank,s);
  const firstHistory=cardHistory(bank.deal);
  assert.ok(firstHistory.discarded>=2);
  assert.equal(firstHistory.potCount,0);
  for(const id of s.deal.pot.filter(id=>id<40))
    assert.equal(firstHistory.states[id],'out');

  const fresh=newOverswing({seed:112}),nextCard=fresh.deal.deck[fresh.deal.pos];
  const potCard=nextCard===0?1:0;
  const snapReady={...fresh,deal:{...fresh.deal,
    S:signed(nextCard)>0?10:-10,plays:2,pot:[potCard]}};
  const snapped=stepOverswing(snapReady,{type:'flip'});
  assert.equal(snapped.lastAction.snap,true);
  const snapHistory=cardHistory(snapped.deal);
  assert.equal(snapHistory.states[nextCard],'out');
  assert.equal(snapHistory.states[potCard],'out');
});
test('gameplay has exactly two primary actions and the four secondary abilities',()=>{
  const jsx=source('OverswingPlay.jsx');
  const controls=jsx.split('const actionButtons=')[1].split('const multiplierDetails=')[0];
  assert.match(controls,/os8-actions-primary/);
  assert.match(controls,/os8-flip/);
  assert.match(controls,/os8-bank/);
  assert.doesNotMatch(controls,/os8-steer/);
  assert.match(controls,/os8-abilities-journey/);
  assert.match(controls,/WILD_IDS\.map/);
  assert.match(controls,/os8-history-button/);
  assert.ok(controls.indexOf('os8-actions-primary')<controls.indexOf('os8-abilities'));
  assert.match(jsx,/import RevealedCards from '\.\/RevealedCards\.jsx'/);
  assert.match(jsx,/<RevealedCards deal=\{d\}/);
  assert.match(jsx,/Reveal remaining deck for Gold/);
  assert.match(jsx,/<span>REVEALED<\/span>/);
  const gallery=source('RevealedCards.jsx');
  assert.match(gallery,/REVEALED DECK/);
  assert.match(gallery,/revealOffer\(run\)/);
  assert.match(gallery,/className="os8-revealed-gallery"/);
  assert.doesNotMatch(gallery,/RoyalPortrait|CARD_RANKS|os8-history-suits/);
  const galleryCss=source('revealedCards.css');
  assert.match(galleryCss,/aspect-ratio:0\.69/);
  assert.match(galleryCss,/os8-revealed-red/);
  assert.match(galleryCss,/os8-revealed-black/);
  const css=source('overswing.css');
  assert.match(css,/os8-actions-primary/);
  assert.match(css,/os8-abilities/);
  assert.match(css,/os8-history-overlay/);
});
test('Doom flames run at low FPS and pause for visibility and reduced motion',()=>{
  const component=source('DoomFire.jsx');
  assert.match(component,/requestAnimationFrame/);
  assert.match(component,/time-last>=66/);
  assert.match(component,/IntersectionObserver/);
  assert.match(component,/visibilitychange/);
  assert.match(component,/prefers-reduced-motion: reduce/);
  assert.match(component,/cancelAnimationFrame/);
  assert.match(component,/observer\?\.disconnect/);
  const jsx=source('OverswingPlay.jsx');
  const home=source('OverswingJourney.jsx');
  const map=source('OverswingCampaignMap.jsx');
  assert.match(jsx,/os8-meter-fire/);
  assert.match(home,/oj-title-doom-fire/);
  assert.match(map,/ocm-embers/);
});

test('pixel pendulum advances in discrete frames, with SNAP rebound and endpoint stability',()=>{
  assert.equal(PENDULUM_FPS,12);
  assert.equal(PENDULUM_SNAP_MS,750);
  assert.equal(pixelPendulumFrame(-6,8,0),-6);
  assert.equal(pixelPendulumFrame(-6,8,1),8);
  assert.equal(pixelPendulumFrame(-6,8,0.01),-6);
  assert.equal(pixelPendulumFrame(-6,8,0.20),-4);
  assert.equal(pixelPendulumFrame(8,0,0.5,10,14),10,
    'a SNAP should visibly hit the positive boundary first');
  assert.ok(pixelPendulumFrame(8,0,0.7,10,14)<10,
    'the needle must recoil from its impact');
  assert.equal(pixelPendulumFrame(8,0,1,10,14),0);
  assert.equal(pixelPendulumFrame(-6,0,0.5,10,-13),-10);
  assert.equal(pixelPendulumFrame(-6,0,1,10,-13),0);
  assert.throws(()=>pixelPendulumFrame(0,4,0.5,0),TypeError);
});
test('pixel needle is rendered in SVG and animation can be stopped for reduced motion',()=>{
  const jsx=source('OverswingPlay.jsx');
  assert.match(jsx,/pixelPendulumFrame\(/);
  assert.match(jsx,/PENDULUM_FPS/);
  assert.match(jsx,/PENDULUM_SNAP_MS/);
  assert.match(jsx,/requestAnimationFrame\(animate\)/);
  assert.match(jsx,/cancelAnimationFrame\(frame\)/);
  assert.match(jsx,/prefers-reduced-motion: reduce/);
  assert.match(jsx,/className="os8-pixel-pendulum"/);
  assert.match(jsx,/shapeRendering="crispEdges"/);
});
