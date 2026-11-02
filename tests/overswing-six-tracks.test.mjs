import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  MUSIC_TRACKS,MUSIC_RIFF,trackNoteAt,trackForGate,shuffledTrackBag
} from '../src/external/overswingTracks.js';
import {createOverswingAudio,scoreNoteAt} from '../src/external/overswingAudio.js';
import {overswingTension} from '../src/external/overswingTension.js';
import {newOverswing} from '../src/external/engines.js';

const read=file=>readFileSync(new URL('../src/external/'+file,import.meta.url),'utf8');

test('Fifteen additional fully written original tracks accompany the existing riff',()=>{
  assert.equal(MUSIC_TRACKS.length,16);
  assert.deepEqual(MUSIC_TRACKS.map(x=>x.name),[
    'Iron Pulse','Night Drive','Blackout','Violet Static','Ash Runner','Last Neon',
    'Ember Highway','Chrome Graves','Pulse Cathedral','Midnight Voltage',
    'Wraith Circuit','Crimson Lanes','Ghost Frequency','Neon Descent',
    'Ashen Horizon','Terminal Light'
  ]);
  assert.strictEqual(MUSIC_TRACKS[0].riff,MUSIC_RIFF);
  const signatures=new Set();
  for(const track of MUSIC_TRACKS){
    assert.equal(track.riff.length,4);
    for(const bar of track.riff){
      assert.equal(bar.length,16);
      assert.ok(bar.some(note=>note),'no empty bars');
    }
    assert.equal(track.roots.length,4);
    assert.equal(track.bass.length,4);
    assert.equal(track.chord.length,2);
    assert.ok(['square','sawtooth','triangle','sine'].includes(track.lead));
    signatures.add(JSON.stringify(track.riff));
  }
  assert.equal(signatures.size,16,'all tracks have distinct original melodies');
  assert.equal(scoreNoteAt(0,0),82.41,'the original riff is preserved');
  assert.equal(scoreNoteAt(0),scoreNoteAt(0,0));
  for(let id=0;id<MUSIC_TRACKS.length;id++)
    for(let step=0;step<64;step++)
      assert.equal(trackNoteAt(step,id),trackNoteAt(step+64,id));
  assert.throws(()=>trackNoteAt(0,16),RangeError);
});

test('Sixteen-track shuffle bag has no repeats until the full library plays',()=>{
  const seeds=[1,257,98765,1709999988777,4294967295];
  for(const seed of seeds){
    const sequence=[];
    for(let level=1;level<=12;level++)for(let gate=0;gate<3;gate++){
      const selected=trackForGate(seed,level,gate);
      sequence.push(selected);
      assert.equal(selected,trackForGate(seed,level,gate),
        'a save/retry must replay the same track');
      assert.ok(selected>=0&&selected<16);
    }
    assert.equal(sequence.length,36);
    for(let block=0;block<2;block++){
      const sixteen=sequence.slice(block*16,block*16+16);
      assert.equal(new Set(sixteen).size,16,
        'every 16-gate shuffle bag contains every track exactly once');
    }
    assert.equal(new Set(sequence.slice(32,36)).size,4);
    for(let i=1;i<sequence.length;i++)
      assert.notEqual(sequence[i],sequence[i-1],
        'no identical back-to-back themes across bags');
    assert.deepEqual(shuffledTrackBag(seed,0),sequence.slice(0,16));
  }
  assert.throws(()=>trackForGate(1,0,0),RangeError);
  assert.throws(()=>trackForGate(1,1,3),RangeError);
});

test('Achieving target resets tension to the calm baseline even in late gates',()=>{
  const d=newOverswing({seed:142}).deal;
  const tense=overswingTension({deal:{...d,T:799,pos:35,hand:[]},
    target:800,gateLevel:36});
  const cleared=overswingTension({deal:{...d,T:800,pos:35,hand:[]},
    target:800,gateLevel:36});
  assert.ok(tense>.6);
  assert.equal(cleared,.06);
  assert.equal(overswingTension({deal:{...d,T:1200,pos:40,hand:[]},
    target:800,gateLevel:36}),.06);
  const play=read('OverswingPlay.jsx');
  assert.match(play,/const goalMet=isJourney&&d\.T>=gateTarget/);
  assert.match(play,/sound\?\.setTension\(tension,\{goalMet\}\)/);
  const journey=read('OverswingJourney.jsx');
  assert.match(journey,/run\.phase!=='playing'\)sound\.setTension\(\.06,\{goalMet:true\}\)/);
});

test('Gate track selection and crossfade are connected without creating audio on page load',()=>{
  const journey=read('OverswingJourney.jsx');
  assert.match(journey,/trackForGate\(run\.runSeed,run\.levelNumber,run\.encounterIndex\)/);
  const hook=read('useOverswingSound.js');
  assert.match(hook,/audioRef\.current\.setTrack\(trackRef\.current\)/);
  assert.match(hook,/audioRef\.current\?\.setTrack\(index\)/);
  const code=read('overswingAudio.js');
  assert.match(code,/TRACK_FADE_SECONDS=1\.8/);
  assert.match(code,/linearRampToValueAtTime\(0,end\)/);
  assert.match(code,/linearRampToValueAtTime\(1,end\)/);
  assert.match(code,/crossfade\?\[crossfade\.from,crossfade\.to\]/);
});

test('Crossfade actually schedules both melodies without restarting the clock',()=>{
  let currentTime=0,contexts=0,oscillators=0;
  const gains=[],intervals=new Map();
  const param=()=>({value:0,events:[],
    setValueAtTime(value,t){this.value=value;this.events.push(['set',value,t]);},
    linearRampToValueAtTime(value,t){this.events.push(['ramp',value,t]);},
    exponentialRampToValueAtTime(){},cancelScheduledValues(){},
    setTargetAtTime(value,t){this.value=value;this.events.push(['target',value,t]);}});
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},
    gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),
    attack:param(),release:param()});
  class FakeAudioContext{
    constructor(){contexts++;this.state='running';this.sampleRate=8000;this.destination=node();}
    get currentTime(){return currentTime;}
    createGain(){const n=node();gains.push(n.gain);return n;}
    createDynamicsCompressor(){return node();}
    createOscillator(){oscillators++;return node();}
    createBuffer(){return {getChannelData:()=>new Float32Array(4000)};}
    createBufferSource(){return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  }
  const host={AudioContext:FakeAudioContext,
    setInterval(fn){intervals.set(fn,fn);return fn;},
    clearInterval(fn){intervals.delete(fn);}};
  const audio=createOverswingAudio(host);
  const nextTrack=trackForGate(32121,1,0);
  assert.equal(audio.setTrack(nextTrack),nextTrack);
  assert.equal(contexts,0,'track selection must not autoplay or construct an AudioContext');
  assert.equal(audio.setMusicLevel(1),1);
  assert.equal(audio.trackId,nextTrack);
  assert.equal(audio.crossfading,false);
  assert.equal(audio.setMusicLevel(2),2);
  assert.equal(audio.trackId,nextTrack,'LOUD still does not restart the riff');
  assert.equal(intervals.size,1);
  const successor=trackForGate(32121,1,1);
  assert.notEqual(successor,nextTrack);
  assert.equal(audio.setTrack(successor),successor);
  assert.equal(audio.crossfading,true);
  assert.equal(contexts,1);
  assert.equal(intervals.size,1,'no new scheduler is created');
  // master, musicBus, sfxBus occupy gain indices 0..2, theme buses follow.
  const oldBus=gains[3+nextTrack],newBus=gains[3+successor];
  assert.ok(oldBus.events.some(e=>e[0]==='ramp'&&e[1]===0));
  assert.ok(newBus.events.some(e=>e[0]==='ramp'&&e[1]===1));
  const advance=seconds=>{
    for(let i=0;i<Math.ceil(seconds/.08);i++){
      currentTime+=.08;
      for(const fn of intervals.values())fn();
    }
  };
  const pre=oscillators;
  advance(.7);
  assert.ok(oscillators>pre,'both track arrangements are synthesized');
  advance(2.5);
  assert.equal(audio.crossfading,false);
  assert.equal(audio.trackId,successor);
  assert.equal(intervals.size,1,'the music loop survives the crossfade');
  audio.setTension(.95);
  advance(2.5);
  assert.notEqual(audio.grooveName,'DREAD',
    'groove adaptation must be audible within a few beats');
  assert.equal(audio.setTension(.06,{goalMet:true}),.06);
  advance(4);
  assert.equal(audio.grooveName,'DREAD',
    'gate completion returns to a calm groove without stopping the track');
  audio.dispose();
  assert.equal(intervals.size,0);
});
