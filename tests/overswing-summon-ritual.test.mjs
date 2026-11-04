import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,overswingActions,stepOverswing} from '../src/external/engines.js';
import {royalId,mirrorAutoDirection} from '../src/external/overswingRoyals.js';
import {audioCueForAction,AUDIO_CUES,createOverswingAudio} from '../src/external/overswingAudio.js';
import {summonFlightResult,summonFlightPoints} from '../src/external/overswingFlipFlight.js';

const source=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');

test('Royal SUMMON stays locked for the entire opening hand, even when slots are free',()=>{
  const j=royalId('J',0);
  let s=newOverswing({seed:314,initialHandSize:4,royals:[j]});
  assert.equal(s.deal.ordinaryRefills,0);
  for(let i=0;i<3;i++){
    assert.equal(overswingActions(s).some(a=>a.type==='summon'),false);
    s=stepOverswing(s,{type:'steer',index:0});
    assert.equal(s.deal.ordinaryRefills,0);
    assert.strictEqual(stepOverswing(s,{type:'summon'}),s);
  }
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(s.deal.ordinaryRefills,1);
  assert.equal(s.deal.hand.length,4);
  assert.equal(overswingActions(s).some(a=>a.type==='summon'),false,'requires an empty slot');
  s=stepOverswing(s,{type:'steer',index:0});
  assert.equal(overswingActions(s).some(a=>a.type==='summon'),true);
  s=stepOverswing(s,{type:'summon'});
  assert.equal(s.lastAction.card,j);
  assert.equal(s.deal.consecutiveSummons,1);
  assert.equal(s.deal.ordinaryRefills,1);
});

test('Mirror auto-selects its only safe direction or smallest failed overshoot',()=>{
  const red=royalId('Q',0),black=royalId('Q',2);
  assert.equal(mirrorAutoDirection(6,10,red),-1);
  assert.equal(mirrorAutoDirection(-6,10,black),1);
  assert.equal(mirrorAutoDirection(1,10,red),-1,'smaller negative overshoot');
  assert.equal(mirrorAutoDirection(-1,10,red),1,'smaller positive overshoot');
  assert.equal(mirrorAutoDirection(0,10,red),1,'tie follows red suit');
  assert.equal(mirrorAutoDirection(0,10,black),-1,'tie follows black suit');
  assert.equal(mirrorAutoDirection(2,8,red),-1,'level with ±8 still chooses closest');
  assert.throws(()=>mirrorAutoDirection(0,10,royalId('J',0)),TypeError);
});

test('Unavoidable Mirror STEER becomes a SNAP instead of asking for a direction',()=>{
  const q=royalId('Q',0);
  const start=newOverswing({seed:22,royals:[q]});
  const d=start.deal;
  const s={...start,deal:{...d,hand:[q],pot:[0],plays:2,S:0,
    discard:[...d.discard,...d.hand],royalQueue:[]}};
  const dirs=overswingActions(s).filter(a=>a.type==='steer');
  assert.deepEqual(dirs.map(a=>a.direction),[1,-1]);
  const result=stepOverswing(s,{type:'steer',index:0,
    direction:mirrorAutoDirection(s.deal.S,10,q)});
  assert.equal(result.lastAction.snap,true);
  assert.equal(result.lastAction.type,'steer');
  const ui=source('OverswingPlay.jsx');
  assert.match(ui,/safeDirections\.length===0/);
  assert.match(ui,/mirrorAutoDirection\(d\.S,limit,d\.hand\[index\]\)/);
  assert.match(ui,/snapRisk=royal==='Q'/);
});

test('SUMMON has its own cue on the existing muted-friendly sound engine',()=>{
  assert.ok(AUDIO_CUES.includes('summon'));
  assert.equal(audioCueForAction({type:'summon',card:royalId('K',0)}),'summon');
  assert.equal(audioCueForAction({type:'carry',card:royalId('K',0)}),null);
  const audio=createOverswingAudio(null);
  audio.setMusicVolume(0);
  audio.setSfxVolume(0);
  assert.equal(audio.play({type:'summon',card:royalId('J',0)}),undefined);
  assert.equal(audio.musicOn,false);
  assert.equal(audio.sfxOn,false);
  audio.dispose();
});

test('SUMMON flies from the button to the actual Royal hand slot',()=>{
  assert.equal(summonFlightResult(null),null);
  assert.equal(summonFlightResult({type:'flip',card:40}),null);
  assert.deepEqual(summonFlightResult({type:'summon',card:40}),
    {card:40,kind:'summon',destination:'hand'});
  const origin={left:90,top:510,width:80,height:60};
  const dest={left:25,top:350,width:48,height:82};
  const coords=summonFlightPoints(origin,dest,{width:375,height:800});
  assert.equal(coords['--flip-start-x'],'89px');
  assert.equal(coords['--flip-end-x'],'8px');
  assert.ok(coords['--flip-center-x']);
  assert.ok(coords['--flip-center-y']);
  const ui=source('OverswingPlay.jsx'),css=source('overswingVisualFix.css');
  assert.match(ui,/ref={summonButtonRef}/);
  assert.match(ui,/handContainerRef\.current\?\.querySelector/);
  assert.match(ui,/flightHidden={summonFlight\?\.card===id}/);
  assert.match(ui,/SummonFlight flight={summonFlight}/);
  assert.match(css,/@keyframes os8-summon-ritual/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
