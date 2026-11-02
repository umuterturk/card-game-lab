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

test('sleep, interrupted output, stale running contexts and retries rebuild safely',async()=>{
  const fake=fakeAudioHost();
  const audio=createOverswingAudio(fake.host);
  audio.resume();
  assert.equal(fake.contexts.length,0,'wake must not autoplay before a gesture');
  audio.setTrack(3);
  audio.setSfxVolume(50);
  audio.setMusicVolume(25);
  assert.equal(fake.contexts.length,1);
  assert.equal(fake.timers.size,1);
  const first=fake.contexts[0];
  assert.equal(first.gains[1].value,musicGainForVolume(25));
  assert.equal(first.gains[2].value,sfxGainForVolume(50));

  audio.suspend();
  assert.equal(fake.timers.size,0,'sleep stops the scheduler');
  assert.equal(first.state,'closed','sleep retires the potentially stuck context');
  audio.resume();
  assert.equal(fake.contexts.length,1,'focus alone never creates new audio');
  assert.equal(fake.timers.size,0,'the next gesture must reactivate audio');

  audio.unlock(); // First tap after screen unlock, without touching settings.
  await Promise.resolve();
  assert.equal(fake.contexts.length,2);
  assert.equal(fake.timers.size,1);
  audio.unlock();audio.resume();audio.unlock();
  assert.equal(fake.timers.size,1,'repeated gestures do not duplicate timers');
  assert.equal(fake.contexts.length,2);
  assert.equal(audio.musicVolume,25);
  assert.equal(audio.trackId,3);

  const second=fake.contexts[1];
  second.state='interrupted';
  second.onstatechange?.();
  assert.equal(fake.timers.size,0,'WebKit interruption invalidates the context');
  assert.equal(second.state,'closed');
  audio.unlock();
  assert.equal(fake.contexts.length,3);
  assert.equal(fake.timers.size,1,'next gesture rebuilds after interruption');

  const third=fake.contexts[2];
  // Some WebKit versions say running even while sending silent samples.
  assert.equal(third.state,'running');
  audio.restart(); // Explicit RECOVER button forces a new graph.
  assert.equal(fake.contexts.length,4,'restart replaces even a running context');
  assert.equal(fake.timers.size,1);
  assert.equal(third.state,'closed');
  const fourth=fake.contexts[3];
  assert.equal(fourth.gains[1].value,musicGainForVolume(25));
  assert.equal(fourth.gains[2].value,sfxGainForVolume(50));
  assert.equal(fourth.gains[3+3].value,1,'selected theme survives');
  const before=fake.oscillators;
  audio.play({type:'flip',card:3});
  assert.ok(fake.oscillators>before,'sound effects work after recreation');

  fourth.state='closed';
  fourth.onstatechange?.();
  assert.equal(fake.timers.size,0);
  audio.unlock();
  assert.equal(fake.contexts.length,5,'closed context recovers on gesture');
  assert.equal(fake.timers.size,1);

  audio.setMusicVolume(0);
  assert.equal(fake.timers.size,0);
  audio.suspend();
  audio.resume();
  audio.unlock();
  assert.equal(fake.timers.size,0,'muted music never autoplays');
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
