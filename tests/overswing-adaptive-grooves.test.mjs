import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GROOVE_NAMES,MUSIC_GROOVES,STEPS_PER_BAR,GROOVE_UP,GROOVE_DOWN,
  grooveForTension,nextGroove,grooveEvents,GROOVE_TEMPOS,
  tempoForGroove,approachTempo,synthwaveBassPitch
} from '../src/external/overswingGrooves.js';
import {overswingTension,musicLayerMix} from '../src/external/overswingTension.js';
import {MUSIC_TEMPO,MUSIC_RIFF,scoreNoteAt,createOverswingAudio}
  from '../src/external/overswingAudio.js';
import {newOverswing} from '../src/external/engines.js';

const file=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');
const hits=(tier,kind,bar=0)=>Array.from({length:16},(_,step)=>
  grooveEvents(tier,bar*16+step,bar)[kind]?step:null).filter(x=>x!==null);

test('Original synthwave pulse runs at 60 BPM; extra rhythmic layers appear at higher tension',()=>{
  assert.equal(STEPS_PER_BAR,16);
  assert.equal(MUSIC_TEMPO,132,'maximum tension tempo is unchanged');
  assert.deepEqual(GROOVE_TEMPOS,[60,82,108,132]);
  assert.equal(tempoForGroove(0),60);
  assert.equal(tempoForGroove(3),132);
  assert.throws(()=>tempoForGroove(4),RangeError);
  assert.equal(approachTempo(60,82),62);
  assert.equal(approachTempo(110,60),108);
  assert.equal(approachTempo(60,60),60);
  assert.deepEqual(GROOVE_NAMES,['DREAD','PULSE','PURSUIT','PANIC']);
  assert.deepEqual(MUSIC_GROOVES.map(g=>g.name),GROOVE_NAMES);
  assert.deepEqual(hits(0,'kick'),[0,4,8,12],'four-on-floor drum machine');
  assert.deepEqual(hits(0,'snare'),[4,12],'backbeat on two and four');
  assert.deepEqual(hits(0,'hat'),[2,6,10,14],'offbeat eighth-note hats');
  assert.deepEqual(hits(0,'bass'),[0,4,8,12]);
  assert.deepEqual(hits(1,'kick'),[0,4,8,12,14]);
  assert.deepEqual(hits(1,'snare'),[4,12]);
  assert.deepEqual(hits(2,'kick'),[0,3,4,6,8,11,12,14]);
  assert.deepEqual(hits(3,'kick'),[0,2,3,4,6,8,10,11,12,14]);
  assert.deepEqual([0,1,2,3].map(tier=>hits(tier,'bass').length),[4,6,8,10]);
  assert.equal(hits(0,'chug').length,0);
  assert.equal(hits(3,'chug').length,6);
  assert.deepEqual(hits(2,'snare',3),[4,12,13,15],
    'four-bar phrase ends with a drum fill');
  assert.deepEqual(hits(2,'snare',0),[4,12],'fills only at phrase end');
  const root=82.41;
  assert.equal(synthwaveBassPitch(root,0),root);
  assert.equal(synthwaveBassPitch(root,4),root);
  assert.equal(synthwaveBassPitch(root,8),root*1.498);
  assert.equal(synthwaveBassPitch(root,12),root*1.189);
  assert.equal(synthwaveBassPitch(root,16),root,'same looped bass sequence');
  assert.throws(()=>synthwaveBassPitch(root,-1),RangeError);
  for(let tier=0;tier<4;tier++)for(let step=0;step<64;step++){
    const event=grooveEvents(tier,step,Math.floor(step/16));
    assert.equal(typeof event.kick,'boolean');
    assert.equal(typeof event.bass,'boolean');
  }
});

test('Grooves use hysteresis and never jump more than one tier',()=>{
  assert.deepEqual(GROOVE_UP,[.24,.46,.69]);
  assert.deepEqual(GROOVE_DOWN,[.16,.36,.58]);
  assert.equal(grooveForTension(.01),0);
  assert.equal(grooveForTension(.26),1);
  assert.equal(grooveForTension(.50),2);
  assert.equal(grooveForTension(.93),3);
  assert.equal(nextGroove(0,1),1);
  assert.equal(nextGroove(1,1),2);
  assert.equal(nextGroove(2,1),3);
  assert.equal(nextGroove(3,.62),3);
  assert.equal(nextGroove(3,.57),2);
  assert.equal(nextGroove(2,.42),2);
  assert.equal(nextGroove(2,.35),1);
  assert.equal(nextGroove(1,.15),0);
  assert.throws(()=>nextGroove(-1,.3),RangeError);
  assert.throws(()=>grooveEvents(4,0),RangeError);
  assert.throws(()=>grooveEvents(0,-1),RangeError);
});

test('Tension uses ONLY Gold left %, deck plus hand, and campaign gate level',()=>{
  const d=newOverswing({seed:987}).deal;
  const base=overswingTension({deal:d,target:800,gateLevel:1});
  assert.equal(base,.06);
  const unchanged=overswingTension({deal:{...d,S:9,W:30,flips:13,
    flipFactor:8,jackpotFactor:8,pot:[1,2,3],plays:22},
    target:800,gateLevel:1,limit:8,boss:true});
  assert.equal(unchanged,base,'no SNAP, Pot, multiplier or boss coupling');
  assert.ok(overswingTension({deal:{...d,T:400},target:800,gateLevel:1})>base);
  assert.ok(overswingTension({deal:{...d,pos:d.pos+1},target:800,gateLevel:1})>base);
  assert.ok(overswingTension({deal:d,target:800,gateLevel:36})>base);
  assert.ok(overswingTension({deal:{...d,T:400},target:800,gateLevel:1})<
    overswingTension({deal:{...d,T:600},target:800,gateLevel:1}));
  assert.ok(overswingTension({deal:d,target:800,gateLevel:1})<
    overswingTension({deal:d,target:800,gateLevel:18}));
  const a=musicLayerMix(0),b=musicLayerMix(1);
  assert.equal(a.melody,1);assert.equal(b.melody,1);
  for(const key of ['bass','percussion','menace'])assert.ok(a[key]<b[key]);
  assert.ok(b.bass/a.bass<1.13);
  assert.ok(b.percussion/a.percussion<1.13);
  assert.ok(b.menace/a.menace<1.17);
});

test('Original 64-step riff unchanged; synthwave bass and arrangement are generated locally',()=>{
  assert.equal(MUSIC_RIFF.length,4);
  assert.ok(MUSIC_RIFF.every(bar=>bar.length===16));
  for(let i=0;i<256;i++)assert.equal(scoreNoteAt(i),scoreNoteAt(i%64));
  const audio=file('overswingAudio.js');
  assert.match(audio,/const note=scoreNoteAt\(step\)/);
  assert.match(audio,/nextAt\+=60\/currentTempo\/4/);
  assert.match(audio,/currentTempo=approachTempo\(currentTempo,tempoForGroove\(activeGroove\),\.8\)/);
  assert.match(audio,/const beat=60\/currentTempo/);
  assert.match(audio,/smoothedTension\+=\.025\*\(targetTension-smoothedTension\)/);
  assert.match(audio,/if\(local===0&&bar%2===0\)/);
  assert.match(audio,/activeGroove=nextGroove\(activeGroove,smoothedTension\)/);
  assert.doesNotMatch(audio,/nextStep=0;nextAt=context.currentTime.*setTension/);
  assert.match(audio,/function synthBass\(/);
  assert.match(audio,/filter\.type='lowpass'/);
  assert.match(audio,/synthwaveBassPitch\(root,local\)/);
  assert.match(audio,/groove\.kick/);
  assert.match(audio,/groove\.snare/);
  assert.match(audio,/groove\.hat/);
  assert.match(audio,/groove\.bass/);
  assert.match(audio,/groove\.chug/);
});

test('A fast tension spike waits for 2-bar musical boundaries before changing groove',()=>{
  const intervals=new Map();
  let currentTime=0,contexts=0;
  const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},
    cancelScheduledValues(){},setTargetAtTime(){}});
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},
    gain:parameter(),frequency:parameter(),threshold:parameter(),knee:parameter(),
    ratio:parameter(),attack:parameter(),release:parameter()});
  class FakeAudioContext{
    constructor(){contexts++;this.state='running';this.sampleRate=8000;this.destination=node();}
    get currentTime(){return currentTime;}
    createGain(){return node();}
    createDynamicsCompressor(){return node();}
    createOscillator(){return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    close(){this.state='closed';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
  }
  const host={AudioContext:FakeAudioContext,
    setInterval(fn){intervals.set(fn,fn);return fn;},
    clearInterval(fn){intervals.delete(fn);}};
  const audio=createOverswingAudio(host);
  assert.equal(contexts,0);
  audio.setTension(.10);
  assert.equal(audio.setMusic(true),true);
  assert.equal(audio.grooveName,'DREAD');
  assert.equal(audio.currentTempo,60);
  const advance=seconds=>{
    for(let i=0;i<Math.ceil(seconds/.08);i++){
      currentTime+=.08;
      for(const fn of intervals.values())fn();
    }
  };
  const advanceTo=(expected,maxSeconds=35)=>{
    const start=currentTime;
    while(audio.grooveName!==expected&&currentTime-start<maxSeconds)advance(.08);
    assert.equal(audio.grooveName,expected);
    return currentTime-start;
  };
  audio.setTension(.98);
  advance(4.5);
  assert.equal(audio.grooveName,'DREAD','single bar does not force a transition');
  const firstChange=advanceTo('PULSE');
  assert.ok(firstChange>2.5,'DREAD lasts roughly two full slow bars');
  const pulseDuration=advanceTo('PURSUIT');
  const pursuitDuration=advanceTo('PANIC');
  assert.ok(pulseDuration>3.5);
  assert.ok(pursuitDuration>2.5);
  assert.equal(audio.setMusicLevel(2),2);
  assert.equal(intervals.size,1,'LOUD does not restart playback');
  audio.setTension(0);
  const highExit=advanceTo('PURSUIT');
  const midExit=advanceTo('PULSE');
  const lowExit=advanceTo('DREAD');
  assert.ok(highExit>2.5&&midExit>2.5&&lowExit>2.5);
  assert.equal(contexts,1);
  audio.setMusic(false);
  assert.equal(intervals.size,0);
  audio.dispose();
});
