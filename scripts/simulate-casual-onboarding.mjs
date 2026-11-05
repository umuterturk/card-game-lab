import {pathToFileURL} from 'node:url';
import {
  ONBOARDING_COUNT,newOnboardingRound,onboardingActions,
  onboardingVictory,onboardingFinished,stepOnboarding
} from '../src/casual/onboardingLevels.js';

// Bounded state-space exploration through the production engine, not copied scoring.
function fingerprint(round){
  const d=round.game.deal;
  return JSON.stringify({
    levelId:round.levelId,turn:round.turn,snaps:round.snaps,
    flipCount:round.flipCount,zeroBreakCount:round.zeroBreakCount,
    status:round.game.status,
    T:d.T,S:d.S,W:d.W,flips:d.flips,plays:d.plays,
    flipFactor:d.flipFactor,jackpotFactor:d.jackpotFactor,
    flipStreak:d.flipStreak,bankCount:d.bankCount,handCap:d.handCap,
    pot:d.pot,hand:d.hand,discard:d.discard,pos:d.pos
  });
}
export function simulateOnboardingLevel(levelId,{maxStates=25000,maxDepth=16}={}){
  const nodes=[{round:newOnboardingRound(levelId),actions:[]}];
  const visited=new Set();
  const result={levelId,states:0,wins:0,failedEnds:0,deadEnds:0,
    truncated:false,shortestWin:null};
  for(let cursor=0;cursor<nodes.length;cursor++){
    if(visited.size>=maxStates){result.truncated=true;break;}
    const {round,actions}=nodes[cursor],key=fingerprint(round);
    if(visited.has(key))continue;
    visited.add(key);
    if(onboardingVictory(round)){
      result.wins++;
      result.shortestWin??=actions;
      continue;
    }
    if(onboardingFinished(round)){
      result.failedEnds++;
      continue;
    }
    if(actions.length>=maxDepth){result.truncated=true;continue;}
    const available=onboardingActions(round);
    if(available.length===0){result.deadEnds++;continue;}
    for(const action of available){
      const next=stepOnboarding(round,action);
      if(next===round)throw new Error('Engine rejected an available onboarding action');
      nodes.push({round:next,actions:[...actions,action]});
    }
  }
  result.states=visited.size;
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    const result=simulateOnboardingLevel(levelId);
    console.log(JSON.stringify(result));
    if(!result.shortestWin){
      console.error('Unwinnable onboarding level '+levelId);
      process.exitCode=1;
    }
  }
}
