import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,stepOverswing} from '../src/external/engines.js';
import {
  flipFlightResult,steerFlightResult,cardFlightResult,
  flipFlightPoints,bankCoinCount,bankCoinBurst,bankBurstPoints
} from '../src/external/overswingFlipFlight.js';
import {
  AUDIO_CUES,MUSIC_TEMPO,MUSIC_RIFF,scoreNoteAt,
  audioCueForAction,createOverswingAudio
} from '../src/external/overswingAudio.js';

const read=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');

test('STEER flies from the chosen hand card to Pot, discard, or SNAP',()=>{
  const start=newOverswing({seed:706});
  const first=stepOverswing(start,{type:'steer',index:0});
  assert.equal(first.lastAction.type,'steer');
  assert.equal(first.lastAction.destination,'pot');
  assert.deepEqual(steerFlightResult(first.lastAction),{
    card:start.deal.hand[0],destination:'pot',shielded:false,
    zeroBreak:false,kind:'steer',reversed:false
  });
  assert.equal(cardFlightResult(first.lastAction).kind,'steer');
  assert.equal(cardFlightResult({type:'flip',card:3,snap:false}).kind,'flip');
  assert.equal(flipFlightResult(first.lastAction),null,
    'STEER is intentionally a separate origin from the FLIP button');

  // Red 3 from the right side doesn't cross zero: it is discarded.
  const discardReady={...start,deal:{...start.deal,
    hand:[12],S:3,plays:2,pot:[0]}};
  const discarded=stepOverswing(discardReady,{type:'steer',index:0});
  assert.equal(discarded.lastAction.destination,'discard');
  assert.equal(steerFlightResult(discarded.lastAction).destination,'discard');
  assert.ok(discarded.deal.discard.includes(12));

  // The same red card at +9 exceeds the SNAP boundary.
  const snapReady={...start,deal:{...start.deal,
    hand:[12],S:9,plays:2,pot:[0]}};
  const snapped=stepOverswing(snapReady,{type:'steer',index:0});
  assert.equal(snapped.lastAction.snap,true);
  assert.equal(steerFlightResult(snapped.lastAction).destination,'snap');
  assert.equal(cardFlightResult(null),null);
  assert.equal(steerFlightResult({type:'bank',card:12}),null);
  assert.equal(steerFlightResult({type:'steer'}),null);
  assert.deepEqual(steerFlightResult({type:'steer',card:12,destination:'pot',polarityReversed:true}),
    {card:12,destination:'pot',shielded:false,zeroBreak:false,kind:'steer',reversed:true});
});

test('BANK coin fountain grows granularly below 10K, reaches 50 at 10K and caps at 60',()=>{
  const amounts=[0,1,9,10,25,50,99,100,250,500,999,1000,
    2500,5000,5600,7500,9999,10000,15000,20000,30000,110000,1e12];
  const counts=amounts.map(bankCoinCount);
  assert.deepEqual(counts,[0,2,3,4,4,5,7,7,10,13,17,17,
    26,36,38,44,50,50,53,55,60,60,60]);
  assert.ok(counts.every(x=>x>=0&&x<=60));
  assert.ok(counts.every((x,i)=>i===0||x>=counts[i-1]),'particle counts are monotonic');
  for(let amount=1;amount<=100000;amount+=17){
    const next=bankCoinCount(amount);
    assert.ok(next>=2&&next<=60);
    assert.ok(next>=bankCoinCount(amount-1));
  }
  assert.equal(bankCoinCount(NaN),0);
  assert.equal(bankCoinCount(-50),0);
  assert.equal(bankCoinCount(Infinity),0);
  assert.deepEqual(bankCoinBurst({type:'bank',points:5600}),{amount:5600,count:38});
  assert.deepEqual(bankCoinBurst({type:'bank',points:10000}),{amount:10000,count:50});
  assert.deepEqual(bankCoinBurst({type:'bank',points:110000}),{amount:110000,count:60});
  assert.equal(bankCoinBurst({type:'bank',points:0}),null);
  assert.equal(bankCoinBurst({type:'flip',points:1000000}),null);
  assert.deepEqual(bankBurstPoints(
    {left:50,top:400,width:100,height:50},
    {left:0,top:80,width:100,height:40}
  ),{'--bank-start-x':'89px','--bank-start-y':'414px',
     '--bank-end-x':'39px','--bank-end-y':'89px'});
  assert.throws(()=>bankBurstPoints({},null),TypeError);
});

test('music is an original deterministic score and all requested cues are distinct',()=>{
  assert.equal(MUSIC_TEMPO,132);
  assert.deepEqual(AUDIO_CUES,['flip','steer','zero','snap','bank','summon']);
  assert.equal(MUSIC_RIFF.length,4);
  assert.ok(MUSIC_RIFF.every(bar=>bar.length===16));
  assert.equal(scoreNoteAt(0),82.41);
  assert.equal(scoreNoteAt(1),null);
  assert.equal(scoreNoteAt(64),scoreNoteAt(0),'four-bar loop repeats');
  assert.throws(()=>scoreNoteAt(-1),RangeError);
  assert.equal(audioCueForAction({type:'flip',card:0}),'flip');
  assert.equal(audioCueForAction({type:'steer',card:0}),'steer');
  assert.equal(audioCueForAction({type:'flip',zeroBreak:true}),'zero');
  assert.equal(audioCueForAction({type:'steer',zeroBreak:true}),'zero');
  assert.equal(audioCueForAction({type:'flip',snap:true}),'snap');
  assert.equal(audioCueForAction({type:'steer',snap:true}),'snap');
  assert.equal(audioCueForAction({type:'steer',snap:true,zeroBreak:true}),'snap');
  assert.equal(audioCueForAction({type:'bank',points:10000}),'bank');
  assert.equal(audioCueForAction({type:'summon',card:40}),'summon');
  assert.equal(audioCueForAction({type:'bank',points:0}),null);
  assert.equal(audioCueForAction({type:'wild',wildId:'shuffle'}),null);
});

test('audio is lazy, gesture-unlocked, opt-out, and closes cleanly',async()=>{
  let contexts=0,oscillators=0,noiseSources=0,closeCount=0;
  const timers=new Set();
  const param=()=>({
    value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},
    cancelScheduledValues(){},setTargetAtTime(){}
  });
  const node=()=>({connect(){return this;},disconnect(){},start(){},stop(){},
    gain:param(),frequency:param(),threshold:param(),knee:param(),ratio:param(),
    attack:param(),release:param()});
  class FakeAudioContext{
    constructor(){contexts++;this.state='suspended';this.sampleRate=24000;
      this.currentTime=0;this.destination=node();}
    createGain(){return node();}
    createDynamicsCompressor(){return node();}
    createOscillator(){oscillators++;return node();}
    createBuffer(){const data=new Float32Array(12000);return {getChannelData(){return data;}};}
    createBufferSource(){noiseSources++;return {...node(),buffer:null};}
    createBiquadFilter(){return {...node(),type:'lowpass'};}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    close(){this.state='closed';closeCount++;return Promise.resolve();}
  }
  const fakeHost={AudioContext:FakeAudioContext,
    setInterval(fn){timers.add(fn);return fn;},
    clearInterval(fn){timers.delete(fn);}};
  const audio=createOverswingAudio(fakeHost);
  assert.equal(contexts,0,'no autoplay or eager AudioContext');
  assert.equal(audio.musicOn,false);
  assert.equal(audio.sfxOn,true);
  assert.equal(audio.unlock(),true);
  assert.equal(contexts,1);
  const before=oscillators;
  audio.play({type:'flip',card:1});
  assert.ok(oscillators>before);
  const after=oscillators;
  audio.setSfx(false);
  assert.equal(closeCount,1,'muting both channels releases the first context');
  audio.play({type:'steer',card:2});
  assert.equal(oscillators,after,'muted SFX does not schedule voices');
  audio.setSfx(true);
  audio.play({type:'steer',card:2,snap:true});
  assert.ok(noiseSources>0);
  assert.equal(audio.setMusic(true),true);
  assert.equal(audio.musicOn,true);
  assert.equal(timers.size,1);
  assert.ok(oscillators>after,'music riff schedules synth tones');
  audio.setMusic(false);
  assert.equal(timers.size,0);
  audio.suspend();
  audio.dispose();
  await Promise.resolve();
  assert.equal(closeCount,2,'the restored SFX context closes on sleep');
  assert.equal(timers.size,0);
  const unsupported=createOverswingAudio(null);
  assert.equal(unsupported.unlock(),false);
  assert.equal(unsupported.setMusic(true),false);
  unsupported.play({type:'flip',card:1});
  unsupported.dispose();
});

test('STEER source, retro SFX controls, Bank fountain and gate-clear timing are wired',()=>{
  const jsx=read('OverswingPlay.jsx');
  const journey=read('OverswingJourney.jsx');
  const css=read('overswing.css');
  assert.match(jsx,/data-hand-card=\{handCard\?id:undefined\}/);
  assert.match(jsx,/saveSteerSource\(index,element\)/);
  assert.match(jsx,/handContainerRef\.current\?\.querySelector/);
  assert.match(jsx,/steerSourceRef\.current\?\.card===event\.card/);
  assert.match(jsx,/event\.destination==='discard'\?discardTargetRef/);
  assert.match(jsx,/cardFlightResult\(action\)/);
  assert.match(jsx,/ref=\{bankButtonRef\}/);
  assert.match(jsx,/ref=\{goldTargetRef\}/);
  assert.match(jsx,/bankCoinBurst\(action\)/);
  assert.match(jsx,/function BankCoinBurst\(/);
  const controls=read('OverswingSoundControls.jsx');
  const hook=read('useOverswingSound.js');
  assert.match(jsx,/OverswingSoundControls sound=\{sound\}/);
  assert.match(controls,/aria-label="Music and sound settings"/);
  assert.match(controls,/role="dialog"/);
  assert.match(controls,/sound\.setTrackChoice/);
  assert.match(controls,/onChange=\{sound\.setMusicVolume\}/);
  assert.match(controls,/onChange=\{sound\.setSfxVolume\}/);
  assert.doesNotMatch(controls,/sound\.toggleMusic|sound\.toggleSfx/);
  assert.match(hook,/createOverswingAudio\(/);
  assert.match(hook,/audioRef\.current\?\.dispose\(\)/);
  assert.match(journey,/setBankTransition\(true\)/);
  assert.match(journey,/window\.setTimeout\(\(\)=>setBankTransition\(false\),1450\)/);
  assert.match(journey,/bankTransition&&/);
  assert.match(css,/os8-steer-to-pot/);
  assert.match(css,/os8-steer-to-discard/);
  assert.match(css,/os8-steer-to-snap/);
  assert.match(css,/os8-bank-coin-flight 910ms steps\(13,end\)/);
  assert.match(css,/os8-bank-burst-lifetime 1400ms/);
  assert.match(read('overswingSoundControls.css'),/os-audio-settings-trigger/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
