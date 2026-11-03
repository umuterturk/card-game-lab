import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOverswingAudio} from '../src/external/overswingAudio.js';

function audioHost(){
  const contexts=[],timers=new Set(),sessionChanges=[];
  const session={_type:'playback',
    get type(){return this._type;},
    set type(value){this._type=value;sessionChanges.push(value);}};
  const param=()=>({value:0,
    setValueAtTime(value){this.value=value;},
    setTargetAtTime(value){this.value=value;},
    cancelScheduledValues(){},
    exponentialRampToValueAtTime(){},
    linearRampToValueAtTime(){}
  });
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},
    gain:param(),frequency:param(),threshold:param(),knee:param(),
    ratio:param(),attack:param(),release:param()});
  class AudioContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=8000;
      this.destination=node();contexts.push(this);}
    createGain(){return node();}
    createDynamicsCompressor(){return node();}
    createOscillator(){return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return node();}
    close(){this.state='closed';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
  }
  return {
    host:{AudioContext,navigator:{audioSession:session},
      setInterval(fn){timers.add(fn);return fn;},
      clearInterval(fn){timers.delete(fn);}},
    contexts,timers,session,sessionChanges
  };
}

test('fully muted audio never creates or restarts an audio context, even after sleep',()=>{
  const fake=audioHost(),audio=createOverswingAudio(fake.host);
  audio.setMusicVolume(0);
  audio.setSfxVolume(0);
  audio.setAtmosphere('cinematic');
  audio.setTension(.9);
  audio.setTrack(18);
  for(let i=0;i<10;i++){
    assert.equal(audio.unlock(),false);
    assert.equal(audio.restart(),false);
    audio.play({type:'flip',card:4});
  }
  audio.suspend();
  audio.resume();
  assert.equal(audio.unlock(),false);
  assert.equal(fake.contexts.length,0);
  assert.equal(fake.timers.size,0);
  assert.deepEqual(fake.sessionChanges,[]);
  assert.equal(fake.session.type,'playback','game must not touch the external session');
  audio.dispose();
  assert.equal(fake.contexts.length,0);
});

test('muting both channels closes an active graph and prevents touch reinitialization',()=>{
  const fake=audioHost(),audio=createOverswingAudio(fake.host);
  audio.setSfxVolume(30);
  audio.setMusicVolume(35);
  assert.equal(fake.contexts.length,1);
  assert.equal(fake.timers.size,1);
  audio.setMusicVolume(0);
  assert.equal(fake.contexts[0].state,'running','SFX remains usable');
  audio.setSfxVolume(0);
  assert.equal(fake.contexts[0].state,'closed','both muted releases the session');
  assert.equal(fake.timers.size,0);
  for(let i=0;i<4;i++){
    audio.unlock();audio.restart();
  }
  assert.equal(fake.contexts.length,1,'muted taps never replace the audio graph');
  // Restoring music works even if SFX stays muted.
  audio.setMusicVolume(25);
  assert.equal(fake.contexts.length,2);
  assert.equal(fake.timers.size,1);
  audio.setMusicVolume(0);
  assert.equal(fake.contexts[1].state,'closed');
  audio.dispose();
});

test('iOS session stays ambient across play, sleep and restart (never exclusive playback)',()=>{
  const fake=audioHost(),audio=createOverswingAudio(fake.host);
  audio.setMusicVolume(50);
  assert.deepEqual(fake.sessionChanges,['ambient']);
  assert.equal(fake.contexts.length,1);
  audio.unlock();
  assert.deepEqual(fake.sessionChanges,['ambient'],'repeated gestures do not reconfigure');
  audio.suspend();
  audio.resume();
  // Simulate WebKit resetting its session category while backgrounded.
  fake.session._type='playback';
  audio.unlock();
  assert.equal(fake.contexts.length,2);
  assert.equal(fake.session.type,'ambient');
  audio.restart();
  assert.equal(fake.contexts.length,3);
  assert.ok(fake.sessionChanges.length>=2);
  assert.ok(fake.sessionChanges.every(value=>value==='ambient'),
    'the game must never request an exclusive audio session');
  audio.dispose();
});

test('hook ignores game gestures and manual restart when both sliders are zero',()=>{
  const hook=readFileSync(
    new URL('../src/external/useOverswingSound.js',import.meta.url),'utf8');
  assert.match(hook,/if\(musicRef\.current===0&&sfxRef\.current===0\)return false/g);
  assert.match(hook,/musicRef\.current>0\|\|sfxRef\.current>0/);
  const engine=readFileSync(
    new URL('../src/external/overswingAudio.js',import.meta.url),'utf8');
  assert.doesNotMatch(engine,/session\.type='playback'/);
  assert.match(engine,/session\.type='ambient'/);
});
