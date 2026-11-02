import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createOverswingAudio,musicGainForVolume,sfxGainForVolume
} from '../src/external/overswingAudio.js';

function fakeAudioHost(){
  const contexts=[],timers=new Set();
  let oscillators=0;
  const param=()=>({
    value:0,
    setValueAtTime(value){this.value=value;},
    setTargetAtTime(value){this.value=value;},
    cancelScheduledValues(){},
    exponentialRampToValueAtTime(){},
    linearRampToValueAtTime(){}
  });
  const node=()=>({
    connect(){return this;},disconnect(){},start(){},stop(){},
    gain:param(),frequency:param(),threshold:param(),knee:param(),
    ratio:param(),attack:param(),release:param()
  });
  class FakeAudioContext{
    constructor(){
      this.state='running';this.currentTime=0;this.sampleRate=8000;
      this.destination=node();this.gains=[];
      contexts.push(this);
    }
    createGain(){
      const n=node();this.gains.push(n.gain);return n;
    }
    createOscillator(){oscillators++;return node();}
    createDynamicsCompressor(){return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    suspend(){
      this.state='suspended';this.onstatechange?.();return Promise.resolve();
    }
    resume(){
      this.state='running';this.onstatechange?.();return Promise.resolve();
    }
    close(){
      this.state='closed';this.onstatechange?.();return Promise.resolve();
    }
  }
  return {
    host:{AudioContext:FakeAudioContext,
      setInterval(fn){timers.add(fn);return fn;},
      clearInterval(fn){timers.delete(fn);}},
    contexts,timers,get oscillators(){return oscillators;}
  };
}

test('sleep, iOS interruption, closed context and repeated wake gestures restore audio',async()=>{
  const fake=fakeAudioHost();
  const audio=createOverswingAudio(fake.host);
  audio.resume();
  assert.equal(fake.contexts.length,0,'wake must not autoplay before a gesture');
  audio.setTrack(3);
  audio.setSfxVolume(50);
  audio.setMusicVolume(25);
  assert.equal(fake.contexts.length,1);
  assert.equal(fake.timers.size,1);
  assert.equal(audio.musicVolume,25);
  assert.equal(audio.sfxVolume,50);
  const first=fake.contexts[0];
  assert.equal(first.gains[1].value,musicGainForVolume(25));
  assert.equal(first.gains[2].value,sfxGainForVolume(50));

  audio.suspend();
  assert.equal(fake.timers.size,0,'no background music scheduler');
  assert.equal(first.state,'suspended');
  audio.resume();
  await Promise.resolve();
  assert.equal(first.state,'running');
  assert.equal(fake.timers.size,1,'wake restarts the music clock');

  audio.suspend();
  audio.unlock(); // First tap after screen unlock, without touching the slider.
  await Promise.resolve();
  assert.equal(fake.timers.size,1);
  audio.unlock();audio.resume();audio.unlock();
  assert.equal(fake.timers.size,1,'repeated gestures cannot duplicate timers');
  assert.equal(fake.contexts.length,1,'ordinary wake keeps the same context');
  assert.equal(audio.musicVolume,25);
  assert.equal(audio.trackId,3);

  first.state='interrupted';
  first.onstatechange?.();
  assert.equal(fake.timers.size,0);
  audio.unlock();
  await Promise.resolve();
  assert.equal(fake.timers.size,1,'iOS interrupted state is recoverable');
  first.state='interrupted';
  first.onstatechange?.();
  first.state='running';
  first.onstatechange?.();
  assert.equal(fake.timers.size,1,'auto-recovered iOS audio restarts the clock');

  first.state='closed';
  first.onstatechange?.();
  assert.equal(fake.timers.size,0);
  audio.unlock();
  await Promise.resolve();
  assert.equal(fake.contexts.length,2,'closed context is replaced on a gesture');
  assert.equal(fake.timers.size,1);
  const replacement=fake.contexts[1];
  assert.equal(replacement.gains[1].value,musicGainForVolume(25));
  assert.equal(replacement.gains[2].value,sfxGainForVolume(50));
  assert.equal(replacement.gains[3+3].value,1,'chosen track remains active');
  const before=fake.oscillators;
  audio.play({type:'flip',card:3});
  assert.ok(fake.oscillators>before,'SFX play after closed-context recovery');

  audio.setMusicVolume(0);
  assert.equal(fake.timers.size,0);
  audio.suspend();
  audio.resume();
  audio.unlock();
  await Promise.resolve();
  assert.equal(fake.timers.size,0,'explicitly muted music never restarts');
  assert.equal(audio.musicVolume,0);
  audio.dispose();
  assert.equal(fake.timers.size,0);
});

test('mobile page restoration and fresh gestures are both wired for Safari',()=>{
  const hook=readFileSync(
    new URL('../src/external/useOverswingSound.js',import.meta.url),'utf8');
  assert.match(hook,/addEventListener\('visibilitychange'/);
  assert.match(hook,/addEventListener\('pageshow'/);
  assert.match(hook,/addEventListener\('pagehide'/);
  assert.match(hook,/addEventListener\('focus'/);
  assert.match(hook,/addEventListener\('pointerdown'/);
  assert.match(hook,/addEventListener\('touchstart'/);
  assert.match(hook,/audioRef\.current\?\.unlock\(\)/);
  assert.match(hook,/audioRef\.current\?\.resume\(\)/);
  assert.match(hook,/audioRef\.current\?\.suspend\(\)/);
});
