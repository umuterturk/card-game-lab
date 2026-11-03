import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MUSIC_TRACKS,trackForGate} from '../src/external/overswingTracks.js';
import {THRILLER_TRACKS,THRILLER_START,GAMEPLAY_TRACKS,
  THRILLER_GROOVE_TEMPOS,thrillerNoteAt,thrillerTempoForGroove,
  thrillerTrackForClassic} from '../src/external/overswingThriller.js';
import {createOverswingAudio} from '../src/external/overswingAudio.js';
import {OVERSWING_THEME_KEY,readMusicThemePreferences,
  persistMusicThemePreferences} from '../src/external/overswingSoundPreferences.js';

test('three original thriller tracks, distinct from the original sixteen',()=>{
  assert.equal(MUSIC_TRACKS.length,16);
  assert.equal(THRILLER_TRACKS.length,3);
  assert.equal(GAMEPLAY_TRACKS.length,19);
  assert.equal(THRILLER_START,16);
  assert.deepEqual(THRILLER_TRACKS.map(t=>t.name),
    ['The Knock','Corridor Chase','Dead Frequency']);
  assert.equal(new Set(THRILLER_TRACKS.map(t=>JSON.stringify(t.riff))).size,3);
  for(const track of THRILLER_TRACKS){
    assert.equal(track.theme,'thriller');
    assert.equal(track.riff.length,4);
    assert.ok(track.riff.every(bar=>bar.length===16&&bar.some(Boolean)));
  }
  for(let id=16;id<19;id++)for(let step=0;step<64;step++)
    assert.equal(thrillerNoteAt(step,id),thrillerNoteAt(step+64,id));
  for(let index=0;index<16;index++)
    assert.equal(thrillerTrackForClassic(index),16+index%3);
  const classic=trackForGate(123,1,0);
  assert.equal(thrillerTrackForClassic(classic),
    thrillerTrackForClassic(trackForGate(123,1,0)));
  assert.deepEqual(THRILLER_GROOVE_TEMPOS,[92,112,136,158]);
  assert.ok(THRILLER_GROOVE_TEMPOS.every((bpm,i)=>bpm>=[60,82,108,132][i]));
  assert.equal(thrillerTempoForGroove(0),92);
  assert.equal(thrillerTempoForGroove(3),158);
  assert.throws(()=>thrillerTempoForGroove(4),RangeError);
});

test('theme setting and manual thriller track persist independently from legacy settings',()=>{
  const data=new Map(),storage={
    getItem:key=>data.get(key)||null,
    setItem:(key,value)=>data.set(key,value)
  };
  assert.deepEqual(readMusicThemePreferences(storage),
    {theme:'synthwave',trackChoice:null});
  assert.equal(persistMusicThemePreferences(storage,{theme:'thriller',trackChoice:17}),true);
  assert.ok(data.has(OVERSWING_THEME_KEY));
  assert.deepEqual(readMusicThemePreferences(storage),
    {theme:'thriller',trackChoice:17});
  assert.equal(persistMusicThemePreferences(storage,{theme:'synthwave',trackChoice:0}),true);
  assert.deepEqual(readMusicThemePreferences(storage),
    {theme:'synthwave',trackChoice:null});
  const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');
  const ui=read('OverswingSoundControls.jsx'),hook=read('useOverswingSound.js');
  assert.match(ui,/GAMEPLAY MUSIC THEME/);
  assert.match(ui,/HORROR \/ THRILLER/);
  assert.match(ui,/sound\.setTheme/);
  assert.match(hook,/readMusicThemePreferences/);
  assert.match(hook,/persistMusicThemePreferences/);
  assert.match(hook,/thrillerTrackForClassic/);
});

test('thriller tracks render and accelerate without extra schedulers or losing crossfades',()=>{
  let now=0,voices=0;
  const callbacks=new Set();
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},
    exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},
    cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}});
  const node=()=>({connect(){return this;},disconnect(){},
    start(){},stop(){},gain:param(),frequency:param(),threshold:param(),
    knee:param(),ratio:param(),attack:param(),release:param()});
  class FakeAudioContext{
    constructor(){this.state='running';this.sampleRate=8000;this.destination=node();}
    get currentTime(){return now;}
    createGain(){return node();}
    createOscillator(){voices++;return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return node();}
    createDynamicsCompressor(){return node();}
    close(){this.state='closed';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
  }
  const audio=createOverswingAudio({AudioContext:FakeAudioContext,
    setInterval(fn){callbacks.add(fn);return fn;},
    clearInterval(fn){callbacks.delete(fn);}});
  audio.setTrack(THRILLER_START);
  audio.setMusicVolume(40);
  assert.equal(audio.currentTempo,92);
  assert.equal(audio.trackName,'The Knock');
  assert.equal(callbacks.size,1);
  assert.ok(voices>0,'procedural thriller starts immediately');
  const advance=seconds=>{
    for(let i=0;i<Math.ceil(seconds/.08);i++){
      now+=.08;
      for(const fn of callbacks)fn();
    }
  };
  audio.setTension(.98);
  advance(5);
  assert.ok(audio.currentTempo>92,'rising tension accelerates the same composition');
  assert.notEqual(audio.grooveName,'DREAD');
  audio.setTrack(THRILLER_START+1);
  assert.equal(audio.crossfading,true);
  assert.equal(callbacks.size,1);
  advance(3);
  assert.equal(audio.crossfading,false);
  assert.equal(audio.trackName,'Corridor Chase');
  audio.setTension(.06,{goalMet:true});
  advance(8);
  assert.equal(audio.grooveName,'DREAD');
  assert.ok(audio.currentTempo<135,'gate completion reduces thriller tempo');
  audio.setAtmosphere('cinematic');
  advance(.3);
  assert.equal(audio.currentTempo,44);
  audio.setAtmosphere(null);
  assert.equal(callbacks.size,1);
  audio.dispose();
  assert.equal(callbacks.size,0);
});
