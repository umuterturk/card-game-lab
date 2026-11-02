import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,stepOverswing} from '../src/external/engines.js';
import {
  multiplierFeedbackForAction,potCrackForAction
} from '../src/external/overswingFeedback.js';
import {
  audioCueForAction,bonusAudioCuesForAction,BONUS_AUDIO_CUES
} from '../src/external/overswingAudio.js';
import {
  DEFAULT_SOUND_PREFS,OVERSWING_SOUND_KEY,
  readSoundPreferences,persistSoundPreferences
} from '../src/external/overswingSoundPreferences.js';

const read=path=>readFileSync(new URL('../src/external/'+path,import.meta.url),'utf8');
const base=newOverswing({seed:903});
const deal=overrides=>({...base,deal:{...base.deal,
  deck:[4,...base.deal.deck.slice(1)],pos:0,hand:[4,8,12,16],
  pot:[1,2],plays:2,S:0,W:0,flipFactor:1,flipStreak:0,jackpotFactor:1,
  ...overrides}});

test('real JACKPOT FLIP crossing gets the biggest tier effect and fanfare',()=>{
  const result=stepOverswing(deal({S:-3}),{type:'flip'});
  const action=result.lastAction;
  assert.equal(action.swung,true);
  assert.equal(action.zeroBreak,false);
  assert.equal(action.jackpotTierGained,true);
  assert.equal(action.jackpotFactor,2);
  assert.equal(action.flipTierGained,true);
  assert.equal(action.swingTierGained,true);
  assert.deepEqual(multiplierFeedbackForAction(action),
    {kind:'jackpot',factor:2,gain:action.gain});
  assert.equal(audioCueForAction(action),'flip');
  assert.deepEqual(bonusAudioCuesForAction(action),['jackpot']);
  assert.ok(result.deal.pot.includes(4));
});
test('ordinary FLIP growth and STEER crossing use restrained distinct effects',()=>{
  const flip=stepOverswing(deal({S:0}),{type:'flip'});
  assert.equal(flip.lastAction.flipTierGained,true);
  assert.equal(flip.lastAction.jackpotTierGained,false);
  assert.deepEqual(multiplierFeedbackForAction(flip.lastAction),
    {kind:'flip',factor:2,gain:0});
  assert.deepEqual(bonusAudioCuesForAction(flip.lastAction),['flipTier']);

  const steer=stepOverswing(deal({S:-3}),{type:'steer',index:0});
  assert.equal(steer.lastAction.swingTierGained,true);
  assert.equal(steer.lastAction.jackpotTierGained,false);
  assert.equal(multiplierFeedbackForAction(steer.lastAction).kind,'swing');
  assert.deepEqual(bonusAudioCuesForAction(steer.lastAction),['swing']);
});
test('repeat FLIPs do not replay a tier celebration unless it actually rises',()=>{
  const result=stepOverswing(deal({S:0,flipFactor:5,flipStreak:0}),{type:'flip'});
  assert.equal(result.lastAction.flipFactor,5);
  assert.equal(result.lastAction.flipTierGained,false);
  assert.equal(multiplierFeedbackForAction(result.lastAction),null);
  assert.deepEqual(bonusAudioCuesForAction(result.lastAction),[]);
});
test('ZERO BREAK is negative: multiplier reset, no jackpot/positive bonus',()=>{
  const result=stepOverswing(deal({
    S:-5,W:3,flipFactor:4,flipStreak:3,jackpotFactor:3
  }),{type:'flip'});
  const action=result.lastAction;
  assert.equal(action.zeroBreak,true);
  assert.equal(action.resetFromMultiplier,4*4*3);
  assert.equal(result.deal.W,0);
  assert.equal(result.deal.flipFactor,1);
  assert.equal(result.deal.jackpotFactor,1);
  assert.equal(multiplierFeedbackForAction(action),null);
  assert.equal(audioCueForAction(action),'zero');
  assert.deepEqual(bonusAudioCuesForAction(action),[]);
  const audio=read('overswingAudio.js');
  const zero=audio.slice(audio.indexOf("case 'zero':"),audio.indexOf("case 'snap':"));
  assert.match(zero,/falling dissonance/);
  assert.match(zero,/sawtooth/);
  assert.match(zero,/blast/);
  assert.doesNotMatch(zero,/tone\(784/);
  const css=read('overswing.css');
  assert.match(css,/\.os8-impact-zero\{/);
  assert.match(css,/os8-zero-implosion/);
  assert.match(css,/os8-zero-ash/);
  assert.match(css,/os8-zero-rift/);
  assert.match(css,/os8-zero-glyph-fall/);
  const jsx=read('OverswingPlay.jsx');
  assert.match(jsx,/ALL MULTIPLIERS → ×1/);
  assert.match(jsx,/#8791b1/);
});
test('Pot loss cracks the screen, adds devilish sound and keeps prior SNAP effects',()=>{
  const result=stepOverswing(deal({S:9}),{type:'flip'});
  assert.equal(result.lastAction.snap,true);
  assert.equal(result.lastAction.lost,5);
  assert.equal(result.deal.pot.length,0);
  assert.deepEqual(potCrackForAction(result.lastAction),
    {potPointsLost:5,pointsLost:result.lastAction.lostPayout});
  assert.equal(audioCueForAction(result.lastAction),'snap');
  assert.deepEqual(bonusAudioCuesForAction(result.lastAction),['potCrack']);
  assert.ok(BONUS_AUDIO_CUES.includes('potCrack'));
  const jsx=read('OverswingPlay.jsx');
  assert.match(jsx,/SwingImpact key=\{impact\.serial\}/);
  assert.match(jsx,/FlipFlight flight=\{flight\}/);
  assert.match(jsx,/PotCrack key=\{potCrack\.serial\}/);
  assert.match(jsx,/os8-pot-breaking/);
  assert.match(jsx,/MultiplierBurst key=\{multiplierBurst\.serial\}/);
  const css=read('overswingFeedback.css');
  assert.match(css,/position:fixed;inset:0;z-index:1080/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/@keyframes os8-pot-crack-draw/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('Ember Shield SNAP keeps Pot, without screen crack or loss growl',()=>{
  const shield=stepOverswing(deal({S:9}),{type:'flip'},
    {shieldNextFlip:true});
  assert.equal(shield.lastAction.snap,true);
  assert.equal(shield.lastAction.shielded,true);
  assert.equal(shield.lastAction.lost,0);
  assert.deepEqual(shield.deal.pot,[1,2]);
  assert.equal(potCrackForAction(shield.lastAction),null);
  assert.equal(audioCueForAction(shield.lastAction),'snap');
  assert.deepEqual(bonusAudioCuesForAction(shield.lastAction),[]);
});
test('pure feedback model never generates celebrations for BANK, ZERO or invalid events',()=>{
  assert.equal(multiplierFeedbackForAction(null),null);
  assert.equal(multiplierFeedbackForAction({type:'bank',jackpotTierGained:true}),null);
  assert.equal(multiplierFeedbackForAction({type:'flip',snap:true,jackpotTierGained:true}),null);
  assert.equal(multiplierFeedbackForAction({type:'flip',zeroBreak:true,jackpotTierGained:true}),null);
  assert.equal(potCrackForAction({type:'steer',snap:true,shielded:true,lost:15}),null);
  assert.equal(potCrackForAction({type:'flip',snap:true,lost:0}),null);
  assert.equal(potCrackForAction({type:'bank',snap:true,lost:10}),null);
});
test('main menu and gameplay share sound controls, with explicit opt-in and persistence',()=>{
  const map=read('OverswingJourney.jsx');
  const play=read('OverswingPlay.jsx');
  const hook=read('useOverswingSound.js');
  const component=read('OverswingSoundControls.jsx');
  assert.match(map,/const sound=useOverswingSound\(\)/);
  assert.match(map,/OverswingSoundControls sound=\{sound\} className="oj-main-audio"/);
  assert.match(map,/fullView=\{fullView\} sound=\{sound\}/);
  assert.match(map,/sound=\{sound\}/);
  assert.match(play,/OverswingSoundControls sound=\{sound\}/);
  assert.match(play,/sound\?\.play\(s\.lastAction\)/);
  assert.match(hook,/const \[musicOn,setMusicOn\]=useState\(false\)/);
  assert.match(hook,/readSoundPreferences\(window\.localStorage\)/);
  assert.match(hook,/audioRef\.current\?\.dispose/);
  assert.match(component,/onClick=\{sound\.toggleMusic\}/);
  assert.match(component,/onClick=\{sound\.toggleSfx\}/);
  const css=read('overswingSoundControls.css');
  assert.match(css,/\.oj-home \.oj-main-audio/);
  assert.deepEqual(DEFAULT_SOUND_PREFS,{music:false,sfx:true});
  const stored=new Map();
  const storage={getItem:key=>stored.get(key)||null,
    setItem:(key,value)=>stored.set(key,value)};
  assert.deepEqual(readSoundPreferences(storage),{music:false,sfx:true});
  assert.equal(persistSoundPreferences(storage,{music:true,sfx:false}),true);
  assert.equal(JSON.parse(stored.get(OVERSWING_SOUND_KEY)).music,true);
  assert.deepEqual(readSoundPreferences(storage),{music:true,sfx:false});
  assert.deepEqual(readSoundPreferences({getItem:()=>'{broken'}),{music:false,sfx:true});
  assert.equal(persistSoundPreferences({setItem:()=>{throw new Error('denied');}},
    {music:true,sfx:false}),false);
});
