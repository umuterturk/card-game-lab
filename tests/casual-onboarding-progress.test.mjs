import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY,clearOnboardingProgress
} from '../src/casual/onboardingProgress.js';
import {newOnboardingRound,onboardingActions} from '../src/casual/onboardingLevels.js';

function testStorage(entries){
  const items=new Map(Object.entries(entries));
  return {
    getItem:key=>items.get(key)??null,
    setItem:(key,value)=>items.set(key,String(value)),
    removeItem:key=>items.delete(key),
    has:key=>items.has(key)
  };
}

test('development reset clears current and legacy onboarding progress only',()=>{
  const storage=testStorage({
    [ONBOARDING_SESSION_KEY]:JSON.stringify(newOnboardingRound(8)),
    [ONBOARDING_PROGRESS_KEY]:'9',
    'swing-casual-onboarding-session-v1':'old-session',
    'music-volume':'55',
    'other-game-progress':'keep'
  });
  assert.equal(clearOnboardingProgress(storage),true);
  for(const key of [ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY,
    'swing-casual-onboarding-session-v1']){
    assert.equal(storage.has(key),false);
  }
  assert.equal(storage.getItem('music-volume'),'55');
  assert.equal(storage.getItem('other-game-progress'),'keep');
});

test('reset is repeatable and freshly starts the real Level 1 hand',()=>{
  const storage=testStorage({[ONBOARDING_PROGRESS_KEY]:'10'});
  for(let i=0;i<3;i++){
    assert.equal(clearOnboardingProgress(storage),true);
    const first=newOnboardingRound(1);
    storage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(first));
    assert.equal(first.levelId,1);
    assert.equal(first.turn,0);
    assert.equal(first.game.deal.T,0);
    assert.equal(first.game.deal.pot.length,0);
    assert.equal(onboardingActions(first).filter(a=>a.type==='steer').length,3);
  }
  assert.equal(storage.has(ONBOARDING_PROGRESS_KEY),false);
});

test('storage failure does not throw or block the interactive reset',()=>{
  assert.equal(clearOnboardingProgress(null),false);
  assert.equal(clearOnboardingProgress({removeItem(){throw new Error('blocked');}}),false);
});

test('header always displays a reset button; win modal has an accessible fallback',async()=>{
  const source=await readFile(new URL('../src/casual/SimplifiedGame.jsx',import.meta.url),'utf8');
  const header=source.slice(source.indexOf('<header className="sgv-hud sgv-tutorial-hud">'),
    source.indexOf('</header>'));
  assert.match(header,/className="sgv-reset-progress"/);
  assert.match(header,/onClick=\{resetProgress\}/);
  assert.match(header,/aria-label="Reset onboarding progress and restart Level 1"/);
  assert.ok(header.indexOf('sgv-reset-progress')<header.indexOf('level.id>=5'),
    'Reset must not be gated behind onboarding level five');
  assert.match(source,/className="sgv-end-reset" onClick=\{resetProgress\}/);
  const reset=source.slice(source.indexOf('function resetProgress(){'),
    source.indexOf('function nextLevel(){'));
  assert.match(reset,/clearOnboardingProgress\(window\.localStorage\)/);
  assert.match(reset,/startLevel\(1\)/);
  assert.match(source,/setDevMenuOpen\(false\)/);
});
