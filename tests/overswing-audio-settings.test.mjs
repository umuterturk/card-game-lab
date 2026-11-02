import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createOverswingAudio,clampAudioVolume,musicGainForVolume,sfxGainForVolume
} from '../src/external/overswingAudio.js';
import {
  DEFAULT_SOUND_PREFS,OVERSWING_SOUND_KEY,LEGACY_SOUND_KEY,
  normalizeSoundPreferences,readSoundPreferences,persistSoundPreferences
} from '../src/external/overswingSoundPreferences.js';
import {MUSIC_TRACKS,trackForGate} from '../src/external/overswingTracks.js';
const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');

test('music and SFX sliders map 0..100 onto their independent gain buses',()=>{
  assert.equal(clampAudioVolume(-10),0);
  assert.equal(clampAudioVolume(0),0);
  assert.equal(clampAudioVolume(50.5),51);
  assert.equal(clampAudioVolume(109),100);
  assert.throws(()=>clampAudioVolume(NaN),RangeError);
  assert.equal(musicGainForVolume(0),0);
  assert.equal(musicGainForVolume(50),.8,'50% equals old ON gain');
  assert.equal(musicGainForVolume(100),3.2,'100% equals old LOUD gain');
  assert.equal(sfxGainForVolume(0),0);
  assert.equal(sfxGainForVolume(100),.85);
  for(let n=0;n<100;n++){
    assert.ok(musicGainForVolume(n)<=musicGainForVolume(n+1));
    assert.ok(sfxGainForVolume(n)<=sfxGainForVolume(n+1));
  }
});

test('preferences persist both independent volumes, Auto/manual track and migrate v1',()=>{
  assert.deepEqual(DEFAULT_SOUND_PREFS,{
    musicVolume:25,sfxVolume:50,trackChoice:null
  });
  const store=new Map(),storage={
    getItem:key=>store.get(key)||null,
    setItem:(key,value)=>store.set(key,value)
  };
  assert.deepEqual(readSoundPreferences(storage),DEFAULT_SOUND_PREFS);
  assert.equal(persistSoundPreferences(storage,{
    musicVolume:67,sfxVolume:22,trackChoice:15
  }),true);
  assert.deepEqual(readSoundPreferences(storage),{
    musicVolume:67,sfxVolume:22,trackChoice:15
  });
  assert.ok(store.has(OVERSWING_SOUND_KEY));
  assert.equal(persistSoundPreferences(storage,{
    musicVolume:0,sfxVolume:0,trackChoice:null
  }),true);
  assert.deepEqual(readSoundPreferences(storage),{
    musicVolume:0,sfxVolume:0,trackChoice:null
  });
  assert.deepEqual(normalizeSoundPreferences({
    musicVolume:-14,sfxVolume:345,trackChoice:16
  }),{musicVolume:0,sfxVolume:100,trackChoice:null});
  assert.deepEqual(normalizeSoundPreferences({
    musicVolume:95,sfxVolume:17,trackChoice:0
  }),{musicVolume:95,sfxVolume:17,trackChoice:0});
  store.delete(OVERSWING_SOUND_KEY);
  store.set(LEGACY_SOUND_KEY,JSON.stringify({music:true,sfx:false}));
  assert.deepEqual(readSoundPreferences(storage),{
    musicVolume:50,sfxVolume:0,trackChoice:null
  });
  store.set(LEGACY_SOUND_KEY,JSON.stringify({music:false,sfx:true}));
  assert.deepEqual(readSoundPreferences(storage),{
    musicVolume:0,sfxVolume:100,trackChoice:null
  },'explicit legacy mute remains muted despite new defaults');
  store.set(LEGACY_SOUND_KEY,'broken{');
  assert.deepEqual(readSoundPreferences(storage),DEFAULT_SOUND_PREFS);
});

test('settings give all 16 tracks, Auto per gate and a single pixel-art gear',()=>{
  const ui=read('OverswingSoundControls.jsx'),hook=read('useOverswingSound.js');
  assert.equal(MUSIC_TRACKS.length,16);
  assert.match(ui,/MUSIC_TRACKS\.map/);
  assert.match(ui,/AUTO · RANDOM EACH GATE/);
  assert.match(ui,/value=\{sound\.trackChoice===null\?'auto'/);
  assert.match(ui,/aria-label="Music and sound settings"/);
  assert.match(ui,/aria-haspopup="dialog"/);
  assert.match(ui,/aria-modal="true"/);
  assert.match(ui,/createPortal\(/);
  assert.match(ui,/aria-valuetext=\{value===0\?'Off'/);
  assert.match(ui,/sound\.setTrackChoice/);
  assert.match(ui,/onChange=\{sound\.setMusicVolume\}/);
  assert.match(ui,/onChange=\{sound\.setSfxVolume\}/);
  assert.doesNotMatch(ui,/sound\.toggleMusic|sound\.toggleSfx/);
  assert.match(hook,/const effectiveTrack=trackChoice\?\?gateTrack/);
  assert.match(hook,/if\(choiceRef\.current===null\)audioRef\.current\?\.setTrack\(index\)/);
  assert.match(hook,/audioRef\.current\?\.setTrack\(index\)/);
  assert.match(hook,/const setTrackChoice=value=>/);
  assert.match(hook,/const setTrack=index=>/);
  assert.match(hook,/if\(musicRef\.current>0\)unlock\(\)/);
  assert.match(hook,/readSoundPreferences\(window\.localStorage\)/);
  const css=read('overswingSoundControls.css');
  assert.match(css,/\.os-audio-settings-trigger/);
  assert.match(css,/\.os-audio-modal-backdrop/);
  assert.match(css,/z-index:5000/);
  assert.match(css,/input\[type=range\]/);
  assert.ok(trackForGate(422,1,0)>=0);
  assert.notEqual(trackForGate(422,1,0),trackForGate(422,1,1));
});

test('live slider changes do not restart music, and muting SFX never mutes music',()=>{
  let contexts=0,oscillators=0;
  const gains=[],intervals=new Set();
  const param=()=>({value:0,
    setValueAtTime(v){this.value=v;},
    exponentialRampToValueAtTime(){},
    linearRampToValueAtTime(){},
    cancelScheduledValues(){},
    setTargetAtTime(v){this.value=v;}
  });
  const node=()=>({connect(){return this;},disconnect(){},
    start(){},stop(){},gain:param(),frequency:param(),
    threshold:param(),knee:param(),ratio:param(),
    attack:param(),release:param()});
  class FakeAudioContext{
    constructor(){contexts++;this.state='running';this.currentTime=0;
      this.sampleRate=8000;this.destination=node();}
    createGain(){const n=node();gains.push(n.gain);return n;}
    createDynamicsCompressor(){return node();}
    createOscillator(){oscillators++;return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    close(){this.state='closed';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
  }
  const host={AudioContext:FakeAudioContext,
    setInterval(fn){intervals.add(fn);return fn;},
    clearInterval(fn){intervals.delete(fn);}};
  const audio=createOverswingAudio(host);
  assert.equal(audio.setMusicVolume(0),0);
  assert.equal(contexts,0,'setting OFF never constructs or autoplays audio');
  assert.equal(audio.setSfxVolume(27),27);
  assert.equal(contexts,0);
  assert.equal(audio.setMusicVolume(50),50);
  assert.equal(contexts,1);
  assert.equal(intervals.size,1);
  assert.equal(gains[1].value,.8);
  assert.equal(gains[2].value,sfxGainForVolume(27));
  const timer=intervals.values().next().value;
  const currentTrack=audio.trackId;
  audio.setMusicVolume(73);
  assert.equal(audio.musicVolume,73);
  assert.equal(gains[1].value,musicGainForVolume(73));
  assert.equal(gains[2].value,sfxGainForVolume(27),'music never changes SFX gain');
  assert.equal(intervals.values().next().value,timer);
  assert.equal(audio.trackId,currentTrack);
  assert.equal(contexts,1);
  assert.equal(audio.setSfxVolume(0),0);
  assert.equal(audio.sfxOn,false);
  assert.equal(gains[2].value,0);
  assert.equal(audio.musicOn,true);
  assert.equal(gains[1].value,musicGainForVolume(73));
  const before=oscillators;
  audio.play({type:'flip',card:3});
  assert.equal(oscillators,before,'muted SFX schedules no voices');
  assert.equal(audio.setSfxVolume(100),100);
  assert.equal(gains[2].value,.85);
  audio.play({type:'flip',card:3});
  assert.ok(oscillators>before,'SFX resumes independently');
  audio.setTrack(5);
  assert.equal(audio.crossfading,true);
  assert.equal(intervals.values().next().value,timer);
  audio.setMusicVolume(100);
  assert.equal(gains[1].value,3.2);
  assert.equal(audio.setMusicVolume(0),0);
  assert.equal(intervals.size,0);
  assert.equal(audio.musicOn,false);
  assert.equal(audio.sfxOn,true);
  const after=oscillators;
  audio.play({type:'flip',card:3});
  assert.ok(oscillators>after,'SFX works while music is stopped');
  audio.dispose();
  assert.equal(intervals.size,0);
});
