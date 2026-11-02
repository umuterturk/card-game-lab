import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOverswingAudio} from '../src/external/overswingAudio.js';
import {OVERSWING_ENEMIES,opponentForLevel} from '../src/external/overswingEnemies.js';

function fakeAudioHost(){
  const contexts=[],timers=new Set();
  let oscillators=0;
  const param=()=>({
    value:0,setValueAtTime(v){this.value=v;},
    setTargetAtTime(v){this.value=v;},
    cancelScheduledValues(){},exponentialRampToValueAtTime(){},
    linearRampToValueAtTime(){}
  });
  const node=()=>({
    connect(){return this;},disconnect(){},start(){},stop(){},
    gain:param(),frequency:param(),threshold:param(),knee:param(),
    ratio:param(),attack:param(),release:param()
  });
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;
      this.destination=node();this.gains=[];contexts.push(this);}
    createGain(){const n=node();this.gains.push(n.gain);return n;}
    createOscillator(){oscillators++;return node();}
    createDynamicsCompressor(){return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    close(){this.state='closed';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
  }
  return {
    host:{AudioContext,setInterval(fn){timers.add(fn);return fn;},
      clearInterval(fn){timers.delete(fn);}},
    contexts,timers,get oscillators(){return oscillators;}
  };
}

test('cinematic horror is an independent, slow 44 BPM score and respects music volume',()=>{
  const fake=fakeAudioHost(),audio=createOverswingAudio(fake.host);
  assert.equal(audio.cinematic,false);
  audio.setCinematic(true);
  assert.equal(fake.contexts.length,0,'cinema must never autoplay without a gesture');
  audio.setMusicVolume(50);
  assert.equal(fake.contexts.length,1);
  assert.equal(audio.cinematic,true);
  assert.equal(audio.currentTempo,44);
  assert.equal(fake.timers.size,1,'one shared scheduler, not a second interval');
  const gains=fake.contexts[0].gains;
  // master, music, sfx, 16 game tracks, 1 dedicated cinematic bus.
  assert.ok(gains.length>=20,'initial synthesized notes allocate additional gain envelopes');
  assert.equal(gains[1].value,.8);
  assert.equal(gains[19].value,1,'horror bus active');
  assert.equal(gains[3].value,0,'normal music bus silent');
  assert.ok(fake.oscillators>0,'cinema synthesized notes without external samples');
  audio.setTrack(4);
  assert.equal(gains[7].value,0,'selecting a track during cinema never leaks gameplay music');
  audio.setCinematic(false);
  assert.equal(audio.cinematic,false);
  assert.equal(gains[19].value,0);
  assert.equal(gains[7].value,1,'selected theme returns on exit');
  assert.equal(fake.timers.size,1);
  audio.setMusicVolume(0);
  assert.equal(fake.timers.size,0);
  audio.dispose();
});

test('cinematic mode persists through iOS interruption until the player exits',()=>{
  const fake=fakeAudioHost(),audio=createOverswingAudio(fake.host);
  audio.setMusicVolume(25);
  audio.setCinematic(true);
  audio.suspend();
  audio.resume();
  audio.unlock();
  assert.equal(audio.cinematic,true);
  assert.equal(fake.contexts.length,2);
  assert.equal(fake.contexts[1].gains[19].value,1);
  audio.setCinematic(false);
  assert.equal(fake.contexts[1].gains[19].value,0);
  audio.dispose();
});

test('the 12 portraits map to two deterministic sprite sheets with unique cells',()=>{
  assert.equal(OVERSWING_ENEMIES.length,12);
  assert.equal(new Set(OVERSWING_ENEMIES.map(e=>e.name)).size,12);
  assert.equal(new Set(OVERSWING_ENEMIES.map(e=>e.art+e.slot)).size,12);
  assert.equal(opponentForLevel(6).slot,5);
  assert.equal(opponentForLevel(7).slot,0);
});

test('cinematic UI enters from the side with stepped blur and exits gradually',()=>{
  const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');
  const jsx=read('OverswingJourney.jsx');
  const intro=read('OverswingEnemy.jsx');
  const css=read('overswingEnemy.css');
  assert.match(jsx,/sound\.setAtmosphere\('cinematic'\)/);
  assert.match(jsx,/sound\.setAtmosphere\('menu'\)/);
  assert.match(jsx,/1850/);
  assert.match(intro,/oe-intro-image-shell/);
  assert.match(css,/@keyframes oe-side-arrive/);
  assert.match(css,/@keyframes oe-side-depart/);
  assert.match(css,/filter:blur\(9px\)/);
  assert.match(css,/steps\(18,end\)/);
  assert.match(css,/oe-pixel-haze/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
