import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GROOVE_NAMES,MUSIC_GROOVES,STEPS_PER_BAR,GROOVE_UP,GROOVE_DOWN,
  grooveForTension,nextGroove,grooveEvents,GROOVE_TEMPOS,
  tempoForGroove,approachTempo
} from '../src/external/overswingGrooves.js';
import {overswingTension,musicLayerMix} from '../src/external/overswingTension.js';
import {MUSIC_TEMPO,MUSIC_RIFF,scoreNoteAt,createOverswingAudio}
  from '../src/external/overswingAudio.js';
import {newOverswing} from '../src/external/engines.js';

const file=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');
const hits=(tier,kind,bar=0)=>Array.from({length:16},(_,step)=>
  grooveEvents(tier,bar*16+step,bar)[kind]?step:null).filter(x=>x!==null);

test('Four unmistakably different beats run on the exact same rhythmic grid',()=>{
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
  assert.deepEqual(hits(0,'kick'),[0,10]);
  assert.deepEqual(hits(0,'snare'),[8]);
  assert.deepEqual(hits(1,'kick'),[0,6,8,14]);
  assert.deepEqual(hits(1,'snare'),[4,12]);
  assert.deepEqual(hits(2,'kick'),[0,3,6,8,11,14]);
  assert.deepEqual(hits(3,'kick'),[0,2,3,5,6,8,10,11,13,14]);
  assert.equal(hits(0,'hat').length,4);
  assert.equal(hits(1,'hat').length,8);
  assert.equal(hits(2,'hat').length,8);
  assert.equal(hits(3,'hat').length,16);
  assert.deepEqual([0,1,2,3].map(tier=>hits(tier,'bass').length),[2,4,8,10]);
  assert.equal(hits(0,'chug').length,0);
  assert.equal(hits(3,'chug').length,6);
  assert.deepEqual(hits(2,'snare',3),[4,12,13,15],
    'musical phrase ends with a drum fill in the third tier');
  assert.deepEqual(hits(2,'snare',0),[4,12],
    'fills are at the end of each four-bar phrase only');
  for(let tier=0;tier<4;tier++)for(let step=0;step<64;step++){
    const event=grooveEvents(tier,step,Math.floor(step/16));
    assert.equal(typeof event.kick,'boolean');
    assert.equal(typeof event.bass,'boolean');
  }
});

test('Grooves change by one tier per bar, with hysteresis against flapping',()=>{
  assert.deepEqual(GROOVE_UP,[.24,.46,.69]);
  assert.deepEqual(GROOVE_DOWN,[.16,.36,.58]);
  assert.equal(grooveForTension(.01),0);
  assert.equal(grooveForTension(.26),1);
  assert.equal(grooveForTension(.50),2);
  assert.equal(grooveForTension(.93),3);
  assert.equal(nextGroove(0,1),1,'do not jump three grooves in one bar');
  assert.equal(nextGroove(1,1),2);
  assert.equal(nextGroove(2,1),3);
  assert.equal(nextGroove(3,.62),3,'remain critical until below exit threshold');
  assert.equal(nextGroove(3,.57),2);
  assert.equal(nextGroove(2,.42),2,'hold pursuit until below its exit threshold');
  assert.equal(nextGroove(2,.35),1);
  assert.equal(nextGroove(1,.15),0);
  assert.throws(()=>nextGroove(-1,.3),RangeError);
  assert.throws(()=>grooveEvents(4,0),RangeError);
  assert.throws(()=>grooveEvents(0,-1),RangeError);
});

test('Music arrangement responds to genuine danger, not extra volume',()=>{
  const deal=newOverswing({seed:987}).deal;
  const calm=overswingTension({deal:{...deal,S:0,T:0,W:0,
    pot:[],flipFactor:1,jackpotFactor:1,pos:0},target:800});
  const nearSnap=overswingTension({deal:{...deal,S:9,T:0,W:0,
    pot:[0,1,2],flipFactor:1,jackpotFactor:1,pos:2},target:800});
  const danger=overswingTension({deal:{...deal,S:9,T:200,W:3,
    pot:[0,1,2,3,4,5],flipFactor:4,jackpotFactor:3,pos:23},
    target:800});
  assert.ok(calm<.24);
  assert.ok(nearSnap>=.46,'near SNAP should feel like danger even with a small Pot');
  assert.ok(danger>=.69,'high-stakes near SNAP should trigger PANIC');
  assert.ok(overswingTension({deal:{...deal,S:9,T:200,W:3,
    pot:[0,1,2,3,4,5],flipFactor:4,jackpotFactor:3,pos:23},
    target:800,boss:true})>danger);
  assert.equal(grooveForTension(calm),0);
  assert.ok(grooveForTension(danger)>grooveForTension(calm));
  const a=musicLayerMix(0),b=musicLayerMix(1);
  assert.equal(a.melody,1);assert.equal(b.melody,1);
  assert.ok(b.bass/a.bass<1.13);
  assert.ok(b.percussion/a.percussion<1.13);
  assert.ok(b.menace/a.menace<1.17);
});

test('Original riff stays unchanged while bar tempo changes smoothly with groove',()=>{
  assert.equal(MUSIC_RIFF.length,4);
  assert.ok(MUSIC_RIFF.every(bar=>bar.length===16));
  for(let i=0;i<256;i++)assert.equal(scoreNoteAt(i),scoreNoteAt(i%64));
  const audio=file('overswingAudio.js');
  assert.match(audio,/const note=scoreNoteAt\(step\)/);
  assert.match(audio,/nextAt\+=60\/currentTempo\/4/);
  assert.match(audio,/currentTempo=approachTempo\(currentTempo,tempoForGroove\(activeGroove\)\)/);
  assert.match(audio,/const beat=60\/currentTempo/);
  assert.match(audio,/smoothedTension\+=\.09\*\(targetTension-smoothedTension\)/);
  assert.match(audio,/if\(local===0\)activeGroove=nextGroove\(activeGroove,targetTension\)/);
  assert.doesNotMatch(audio,/nextStep=0;nextAt=context.currentTime.*setTension/);
  assert.match(audio,/groove\.kick/);
  assert.match(audio,/groove\.snare/);
  assert.match(audio,/groove\.hat/);
  assert.match(audio,/groove\.bass/);
  assert.match(audio,/groove\.chug/);
});

test('Audio actually changes grooves during playback, only at musical boundaries',async()=>{
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
  audio.setTension(.1);
  assert.equal(audio.setMusic(true),true);
  assert.equal(audio.grooveName,'DREAD');
  assert.equal(intervals.size,1);
  assert.equal(audio.currentTempo,60,'calm starts with a genuinely slow musical clock');
  const advanceTo=(expected,maxSeconds=12)=>{
    const start=currentTime;
    while(audio.grooveName!==expected&&currentTime-start<maxSeconds){
      currentTime+=.08;
      for(const fn of intervals.values())fn();
    }
    assert.equal(audio.grooveName,expected);
    return currentTime-start;
  };
  const firstStep=audio.currentTempo;
  audio.setTension(.98);
  const dreadDuration=advanceTo('PULSE');
  assert.ok(dreadDuration>3.4,
    'first DREAD bar must be much slower than an original 132 BPM bar');
  assert.ok(audio.currentTempo<=firstStep+2,
    'tempo begins ramping at the boundary, it does not jump to 82');
  const pulseDuration=advanceTo('PURSUIT');
  const pursuitDuration=advanceTo('PANIC');
  assert.ok(pulseDuration<dreadDuration);
  assert.ok(pursuitDuration<pulseDuration);
  // ON -> LOUD should not reset the timer, riff or groove state.
  const beforeLevel=audio.grooveName;
  const beforeCount=intervals.size;
  assert.equal(audio.setMusicLevel(2),2);
  assert.equal(audio.musicLevel,2);
  assert.equal(audio.grooveName,beforeLevel);
  assert.equal(intervals.size,beforeCount);
  audio.setTension(0);
  advanceTo('PURSUIT');
  advanceTo('PULSE');
  advanceTo('DREAD');
  assert.equal(audio.grooveLevel,0);
  assert.equal(contexts,1,'same AudioContext across every groove');
  audio.setMusic(false);
  assert.equal(intervals.size,0);
  audio.dispose();
});
