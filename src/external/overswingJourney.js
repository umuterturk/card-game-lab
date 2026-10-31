import {newOverswing,overswingActions,stepOverswing,overswingFinal} from './engines.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';

export const JOURNEY_SCHEMA=1;
export const JOURNEY_PHASES=['playing','choosing_relic','won','lost','abandoned'];
const BASE_RELIC_RULES={steerNoncrossPenalty:1,flipCrossJackpotGain:1,
  bankCapacityLoss:1,steerCrossSwingBonus:0};

// Stable independent streams for decks and reward offers.
export function journeySeed(runSeed,index,stream){
  let h=2166136261>>>0;
  for(const c of String(runSeed)+'|'+index+'|'+stream){
    h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;
  }
  h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;
  h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;
  return (h^(h>>>16))>>>0;
}
function drawRandom(seed){
  let value=seed>>>0;
  return ()=>{
    value=(value+0x6D2B79F5)>>>0;
    let t=value;t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function dealFor(runSeed,index){
  const config=LAST_FLAME.encounters[index];
  return {encounterId:config.id,engineState:newOverswing({
    seed:journeySeed(runSeed,index,'deck'),mode:'short'
  }),effectiveTarget:config.target,snapCount:0,relicUses:{}};
}
export function offerJourneyRelics(run){
  const choices=LAST_FLAME.relics.filter(r=>!run.relicIds.includes(r.id)).map(r=>r.id);
  const random=drawRandom(journeySeed(run.runSeed,run.encounterIndex,'rewards'));
  for(let i=choices.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices.slice(0,LAST_FLAME.rewards.offerCount);
}
export function startJourney(runSeed=Date.now()){
  if(!Number.isSafeInteger(runSeed)||runSeed<0)throw new TypeError('Invalid run seed');
  const seed=runSeed;
  return {schemaVersion:JOURNEY_SCHEMA,contentPackId:LAST_FLAME.id,
    contentVersion:LAST_FLAME.version,runId:'last-flame-'+seed.toString(36),
    runSeed:seed,phase:'playing',encounterIndex:0,relicIds:[],
    offeredRelicIds:[],encounter:dealFor(seed,0),completedEncounters:[]};
}
export function isValidJourney(run){
  return !!run&&run.schemaVersion===JOURNEY_SCHEMA&&
    run.contentPackId===LAST_FLAME.id&&run.contentVersion===LAST_FLAME.version&&
    JOURNEY_PHASES.includes(run.phase)&&
    Number.isSafeInteger(run.runSeed)&&run.runSeed>=0&&
    Number.isInteger(run.encounterIndex)&&run.encounterIndex>=0&&
    run.encounterIndex<LAST_FLAME.encounters.length&&
    Array.isArray(run.relicIds)&&Array.isArray(run.offeredRelicIds)&&
    Array.isArray(run.completedEncounters)&&!!run.encounter&&
    run.encounter.encounterId===LAST_FLAME.encounters[run.encounterIndex].id&&
    run.encounter.engineState?.version===13;
}
export function journeyRules(run){
  const rules={...BASE_RELIC_RULES};
  const available=new Set(run.relicIds.filter(id=>!(run.encounter.relicUses[id]>0)));
  if(available.has('steady_hand'))rules.steerNoncrossPenalty=0;
  if(available.has('jackpot_spark'))rules.flipCrossJackpotGain=2;
  if(available.has('vault_seal'))rules.bankCapacityLoss=0;
  if(available.has('swing_coil'))rules.steerCrossSwingBonus=1;
  return rules;
}
export function journeyActions(run){
  if(run?.phase!=='playing')return [];
  return overswingActions(run.encounter.engineState,journeyRules(run));
}
export function journeyRunScore(run){
  return run.completedEncounters.reduce((v,e)=>v+e.finalScore,0);
}
export function stepJourney(run,command){
  if(!isValidJourney(run)||!command||typeof command!=='object')return run;
  if(command.type==='ABANDON'){
    if(run.phase==='won'||run.phase==='lost'||run.phase==='abandoned')return run;
    return {...run,phase:'abandoned',offeredRelicIds:[]};
  }
  if(run.phase==='choosing_relic'&&command.type==='CHOOSE_RELIC'){
    if(!run.offeredRelicIds.includes(command.relicId)||
       run.relicIds.includes(command.relicId)||
       run.relicIds.length>=LAST_FLAME.rewards.maxOwnedRelics||
       !LAST_FLAME_RELICS[command.relicId])return run;
    const nextIndex=run.encounterIndex+1;
    if(nextIndex>=LAST_FLAME.encounters.length)return run;
    return {...run,phase:'playing',encounterIndex:nextIndex,
      relicIds:[...run.relicIds,command.relicId],offeredRelicIds:[],
      encounter:dealFor(run.runSeed,nextIndex)};
  }
  if(run.phase!=='playing'||command.type!=='PLAY'||!command.action)return run;
  const old=run.encounter,engine=stepOverswing(old.engineState,command.action,journeyRules(run));
  if(engine===old.engineState)return run;
  const triggered=engine.lastAction?.modifiersApplied||[];
  const uses={...old.relicUses};
  for(const id of triggered)if(run.relicIds.includes(id))uses[id]=(uses[id]||0)+1;
  const snapCount=old.snapCount+(engine.lastAction?.snap?1:0);
  const content=LAST_FLAME.encounters[run.encounterIndex];
  const objective=content.objective;
  const effectiveTarget=content.target+(objective?.type==='snap_target_tax'?
    snapCount*objective.pointsPerSnap:0);
  const encounter={...old,engineState:engine,relicUses:uses,snapCount,effectiveTarget};
  if(engine.status!=='over')return {...run,encounter};
  const finalScore=overswingFinal(engine);
  const result={id:content.id,finalScore,target:effectiveTarget,
    snaps:snapCount,passed:finalScore>=effectiveTarget};
  const completedEncounters=[...run.completedEncounters,result];
  if(!result.passed)return {...run,encounter,phase:'lost',completedEncounters};
  if(run.encounterIndex===LAST_FLAME.encounters.length-1){
    return {...run,encounter,phase:'won',completedEncounters};
  }
  const draft={...run,encounter,phase:'choosing_relic',completedEncounters};
  return {...draft,offeredRelicIds:offerJourneyRelics(draft)};
}
export const EMPTY_JOURNEY_PROGRESS=Object.freeze({
  schemaVersion:JOURNEY_SCHEMA,totalRuns:0,wins:0,bestRunScore:0,
  discoveredRelicIds:[],unlockedStartingStyles:[],clearedChapterIds:[],
  recordedRunIds:[]
});
export function validJourneyProgress(value){
  return !!value&&value.schemaVersion===JOURNEY_SCHEMA&&
    Number.isInteger(value.totalRuns)&&Array.isArray(value.recordedRunIds)&&
    Array.isArray(value.discoveredRelicIds);
}
// Idempotent: a completed run may be observed repeatedly across React render or reload.
export function recordJourneyProgress(progress,run){
  if(!isValidJourney(run)||!['won','lost','abandoned'].includes(run.phase))return progress;
  const old=validJourneyProgress(progress)?progress:EMPTY_JOURNEY_PROGRESS;
  if(old.recordedRunIds.includes(run.runId))return old;
  return {...old,totalRuns:old.totalRuns+1,wins:old.wins+(run.phase==='won'?1:0),
    bestRunScore:Math.max(old.bestRunScore,journeyRunScore(run)),
    recordedRunIds:[...old.recordedRunIds,run.runId],
    discoveredRelicIds:[...new Set([...old.discoveredRelicIds,...run.relicIds])],
    clearedChapterIds:run.phase==='won'?
      [...new Set([...old.clearedChapterIds,LAST_FLAME.id])]:old.clearedChapterIds};
}
