import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOverswingAudio,nextMusicLevel,MUSIC_VOLUMES,
  lostCoinClinkCount} from '../src/external/overswingAudio.js';
import {GROOVE_TEMPOS,tempoForGroove,approachTempo}
  from '../src/external/overswingGrooves.js';

const read=file=>readFileSync(new URL('../src/external/'+file,import.meta.url),'utf8');

test('Settings replace two toggles with 0-100 volume controls and 16-track selector',()=>{
  assert.deepEqual([0,1,2,0].map(nextMusicLevel),[1,2,0,1],
    'legacy audio API remains compatible');
  assert.deepEqual(MUSIC_VOLUMES,[0,.80,3.20]);
  const controls=read('OverswingSoundControls.jsx');
  assert.match(controls,/Music and sound settings/);
  assert.match(controls,/MUSIC TRACK/);
  assert.match(controls,/MUSIC VOLUME/);
  assert.match(controls,/SOUND EFFECTS/);
  assert.match(controls,/MUSIC_TRACKS\.map/);
  assert.match(controls,/value="auto"/);
  assert.match(controls,/value=\{sound\.trackChoice===null\?'auto'/);
  assert.match(controls,/onChange=\{sound\.setMusicVolume\}/);
  assert.match(controls,/onChange=\{sound\.setSfxVolume\}/);
  assert.match(controls,/createPortal\(/);
  assert.match(controls,/aria-modal="true"/);
  assert.doesNotMatch(controls,/toggleMusic|toggleSfx/);
  const hook=read('useOverswingSound.js');
  assert.match(hook,/setMusicVolumeState/);
  assert.match(hook,/setSfxVolumeState/);
  assert.match(hook,/setTrackChoiceState/);
  assert.match(hook,/musicRef\.current/);
  assert.match(hook,/sfxRef\.current/);
  assert.match(hook,/trackChoice:choiceRef\.current/);
  const css=read('overswingSoundControls.css');
  assert.match(css,/\.os-audio-modal-backdrop/);
  assert.match(css,/\.os-audio-music-icon/);
  assert.match(css,/input\[type=range\]/);
});
test('Real tempo is slow at zero tension and smoothly rises across four grooves',()=>{
  assert.deepEqual(GROOVE_TEMPOS,[60,82,108,132]);
  assert.equal(tempoForGroove(0),60);
  assert.equal(tempoForGroove(3),132);
  assert.equal(approachTempo(60,82),62);
  assert.equal(approachTempo(62,82),64);
  assert.equal(approachTempo(132,108),130);
  assert.equal(approachTempo(60,60),60);
  assert.throws(()=>approachTempo(NaN,90),RangeError);
});

test('Changing ON to LOUD preserves the active AudioContext, riff and timer',()=>{
  const intervals=new Set(),gainRecords=[];
  let contextCount=0,createGainCount=0;
  const param=()=>({
    value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},
    cancelScheduledValues(){},setTargetAtTime(value){this.value=value;},
  });
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},
    frequency:param(),gain:param(),threshold:param(),knee:param(),ratio:param(),
    attack:param(),release:param()});
  class FakeAudioContext{
    constructor(){
      contextCount++;this.state='running';this.sampleRate=8000;
      this.currentTime=0;this.destination=node();
    }
    createGain(){
      const n=node();
      gainRecords.push(n.gain);
      createGainCount++;
      return n;
    }
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
    setInterval(fn){intervals.add(fn);return fn;},
    clearInterval(fn){intervals.delete(fn);}
  };
  const audio=createOverswingAudio(host);
  assert.equal(contextCount,0,'no autoplay before user gesture');
  assert.equal(audio.setMusicLevel(1),1);
  assert.equal(audio.musicLevel,1);
  assert.equal(audio.currentTempo,60,'first note is 60 BPM at low tension');
  assert.equal(gainRecords[1].value,.80);
  const groove=audio.grooveName;
  const timer=intervals.values().next().value;
  const countBefore=createGainCount;
  assert.equal(audio.setMusicLevel(2),2);
  assert.equal(gainRecords[1].value,3.20);
  assert.equal(contextCount,1);
  assert.equal(audio.grooveName,groove);
  assert.equal(audio.currentTempo,60);
  assert.equal(intervals.values().next().value,timer);
  assert.equal(intervals.size,1);
  assert.equal(createGainCount,countBefore,
    'changing volume should not allocate new music channels');
  assert.equal(audio.setMusicLevel(0),0);
  assert.equal(audio.musicLevel,0);
  assert.equal(intervals.size,0);
  assert.equal(audio.setMusicLevel(1),1);
  assert.equal(intervals.size,1);
  audio.dispose();
  assert.equal(intervals.size,0);
  assert.throws(()=>audio.setMusicLevel(5),RangeError);
});

test('SNAP Pot loss scatters bouncing coins on the ground, shielded SNAP does not',()=>{
  const loss=(lostPayout)=>({type:'flip',snap:true,shielded:false,lost:12,lostPayout});
  assert.equal(lostCoinClinkCount(loss(0)),4);
  assert.equal(lostCoinClinkCount(loss(9)),6);
  assert.equal(lostCoinClinkCount(loss(99)),8);
  assert.equal(lostCoinClinkCount(loss(999)),10);
  assert.equal(lostCoinClinkCount(loss(10000)),12);
  assert.equal(lostCoinClinkCount({...loss(100),shielded:true}),0);
  assert.equal(lostCoinClinkCount({...loss(100),lost:0}),0);
  assert.equal(lostCoinClinkCount({type:'bank',lost:20,lostPayout:1000}),0);
  const source=read('overswingAudio.js');
  const crack=source.slice(source.indexOf("case 'potCrack':"),
    source.indexOf("break;",source.indexOf("case 'potCrack':")));
  assert.match(crack,/lostCoinClinkCount\(action\)/);
  assert.match(crack,/Coins tumble out of the shattered Pot/);
  assert.match(crack,/tone\(pitch,at/);
  assert.match(crack,/blast\(at/);
  assert.match(crack,/Dissonant descending tritone/);
});
