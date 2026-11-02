import {newOverswing,overswingActions,stepOverswing,overswingFinal} from './engines.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {royalTier,targetScale,pickRoyalCards} from './overswingRoyals.js';
import {campaignLevel,campaignNextLevel,CAMPAIGN_LEVELS} from './overswingCampaign.js';

export const JOURNEY_SCHEMA=2;
export const JOURNEY_PHASES=['playing','choosing_relic','retry_offer','won','lost','abandoned'];
export const RELIC_PRICE_RATE=0.20; // price is 20% of the next gate's scaled target
export const RETRY_PRICE_RATES=Object.freeze([0.25,0.35,0.50]);
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
function dealFor(runSeed,index,tier=0,levelNumber=1,retryCount=0){
  const config=LAST_FLAME.encounters[index],level=campaignLevel(levelNumber);
  const royals=pickRoyalCards(tier,journeySeed(runSeed,index,'royals'),index);
  // First attempt remains unchanged; retries receive independent deterministic decks.
  const deckStream=retryCount===0?'deck':'deck:retry:'+retryCount;
  return {encounterId:config.id,engineState:newOverswing({
    seed:journeySeed(runSeed,index,deckStream),mode:'short',royals,
    initialHandSize:level.rules.maxHandSize||8
  }),effectiveTarget:Math.round(config.target*targetScale(tier)*level.targetScale),
  snapCount:0,relicUses:{}};
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
export function startJourney(runSeed=Date.now(),lifetimeGold=0,levelNumber=1,treasuryGold=0){
  if(!Number.isSafeInteger(runSeed)||runSeed<0)throw new TypeError('Invalid run seed');
  if(!campaignLevel(levelNumber))throw new RangeError('Invalid campaign level');
  if(!Number.isSafeInteger(treasuryGold)||treasuryGold<0)throw new RangeError('Invalid Treasury balance');
  const seed=runSeed,tier=royalTier(Math.max(0,lifetimeGold));
  return {schemaVersion:JOURNEY_SCHEMA,contentPackId:LAST_FLAME.id,
    contentVersion:LAST_FLAME.version,runId:'last-flame-'+seed.toString(36),
    runSeed:seed,royalTier:tier,levelNumber,goldSpent:0,retryGoldSpent:0,
    treasuryStart:treasuryGold,treasuryEvents:[],retryCount:0,
    phase:'playing',encounterIndex:0,relicIds:[],
    offeredRelicIds:[],encounter:dealFor(seed,0,tier,levelNumber),completedEncounters:[]};
}
export function isValidJourney(run){
  return !!run&&run.schemaVersion===JOURNEY_SCHEMA&&
    run.contentPackId===LAST_FLAME.id&&run.contentVersion===LAST_FLAME.version&&
    JOURNEY_PHASES.includes(run.phase)&&
    Number.isSafeInteger(run.runSeed)&&run.runSeed>=0&&
    !!campaignLevel(run.levelNumber??1)&&
    Number.isInteger(run.encounterIndex)&&run.encounterIndex>=0&&
    run.encounterIndex<LAST_FLAME.encounters.length&&
    Array.isArray(run.relicIds)&&Array.isArray(run.offeredRelicIds)&&
    Array.isArray(run.completedEncounters)&&
    Number.isSafeInteger(run.goldSpent)&&run.goldSpent>=0&&
    Number.isSafeInteger(run.retryGoldSpent)&&run.retryGoldSpent>=0&&
    Number.isSafeInteger(run.treasuryStart)&&run.treasuryStart>=0&&
    Array.isArray(run.treasuryEvents)&&
    Number.isInteger(run.retryCount)&&run.retryCount>=0&&run.retryCount<=RETRY_PRICE_RATES.length&&
    !!run.encounter&&
    run.encounter.encounterId===LAST_FLAME.encounters[run.encounterIndex].id&&
    run.encounter.engineState?.version===13;
}
export function journeyRules(run){
  const stage=campaignLevel(run.levelNumber||1);
  const rules={...BASE_RELIC_RULES,...(stage?.rules||{})};
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
// BANK earnings are provisional gate score. Only successful gates deposit Gold
// into the persistent Treasury and count toward lifetime Royal discovery.
export function journeyEarnedGold(run){
  return run.completedEncounters.filter(e=>e.passed)
    .reduce((sum,e)=>sum+e.finalScore,0);
}
export function journeyGoldBalance(run){
  return run.treasuryStart+run.treasuryEvents.reduce((sum,e)=>sum+e.amount,0);
}
export function journeyRunScore(run){
  return journeyEarnedGold(run)-run.goldSpent;
}
function gateBaseTarget(run){
  const gate=LAST_FLAME.encounters[run.encounterIndex];
  return Math.round(gate.target*targetScale(run.royalTier||0)*
    campaignLevel(run.levelNumber||1).targetScale);
}
export function journeyRetryPrice(run){
  if(run.retryCount>=RETRY_PRICE_RATES.length)return 0;
  const rate=RETRY_PRICE_RATES[run.retryCount];
  // Exclude encounter-specific boss SNAP penalties from the price.
  return Math.max(10,Math.round(gateBaseTarget(run)*rate/10)*10);
}
export function journeyCanRetry(run){
  return run?.phase==='retry_offer'&&run.retryCount<RETRY_PRICE_RATES.length&&
    journeyGoldBalance(run)>=journeyRetryPrice(run);
}
function treasuryEvent(run,id,amount,lifetimeDelta=0){
  return [...run.treasuryEvents,{id:run.runId+'|'+id,amount,lifetimeDelta}];
}
export function journeyRelicPrice(run){
  const next=LAST_FLAME.encounters[run.encounterIndex+1];
  if(!next)return 0;
  const target=Math.round(next.target*targetScale(run.royalTier||0)*campaignLevel(run.levelNumber||1).targetScale);
  return Math.max(10,Math.round(target*RELIC_PRICE_RATE/10)*10);
}
export function stepJourney(run,command){
  if(!isValidJourney(run)||!command||typeof command!=='object')return run;
  if(command.type==='ABANDON'){
    if(run.phase==='won'||run.phase==='lost'||run.phase==='abandoned')return run;
    return {...run,phase:'abandoned',offeredRelicIds:[]};
  }
  if(run.phase==='retry_offer'){
    if(command.type==='ACCEPT_DEFEAT')return {...run,phase:'lost'};
    if(command.type!=='BUY_RETRY'||!journeyCanRetry(run))return run;
    const price=journeyRetryPrice(run),retryCount=run.retryCount+1;
    return {...run,phase:'playing',retryCount,
      goldSpent:run.goldSpent+price,retryGoldSpent:run.retryGoldSpent+price,
      treasuryEvents:treasuryEvent(run,'retry:'+run.encounterIndex+':'+retryCount,-price),
      // Failed gate earnings are discarded, not counted toward Treasury or lifetime Gold.
      completedEncounters:run.completedEncounters.filter(e=>e.id!==run.encounter.encounterId),
      encounter:dealFor(run.runSeed,run.encounterIndex,run.royalTier,run.levelNumber,retryCount)};
  }
  if(run.phase==='choosing_relic'&&
     (command.type==='BUY_RELIC'||command.type==='SKIP_RELIC')){
    const nextIndex=run.encounterIndex+1;
    if(nextIndex>=LAST_FLAME.encounters.length)return run;
    const buying=command.type==='BUY_RELIC';
    const price=journeyRelicPrice(run);
    if(buying&&(!run.offeredRelicIds.includes(command.relicId)||
       run.relicIds.includes(command.relicId)||
       run.relicIds.length>=LAST_FLAME.rewards.maxOwnedRelics||
       !LAST_FLAME_RELICS[command.relicId]||
       journeyGoldBalance(run)<price))return run;
    return {...run,phase:'playing',encounterIndex:nextIndex,retryCount:0,
      goldSpent:run.goldSpent+(buying?price:0),
      treasuryEvents:buying?treasuryEvent(run,'relic:'+nextIndex,-price):run.treasuryEvents,
      relicIds:buying?[...run.relicIds,command.relicId]:run.relicIds,
      offeredRelicIds:[],
      encounter:dealFor(run.runSeed,nextIndex,run.royalTier||0,run.levelNumber||1)};
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
  const effectiveTarget=Math.round(content.target*targetScale(run.royalTier||0)*
    campaignLevel(run.levelNumber||1).targetScale)+
    (objective?.type==='snap_target_tax'?snapCount*objective.pointsPerSnap:0);
  const encounter={...old,engineState:engine,relicUses:uses,snapCount,effectiveTarget};
  if(engine.status!=='over')return {...run,encounter};
  const finalScore=overswingFinal(engine);
  const result={id:content.id,finalScore,target:effectiveTarget,
    snaps:snapCount,passed:finalScore>=effectiveTarget};
  const completedEncounters=[...run.completedEncounters,result];
  if(!result.passed)return {...run,encounter,phase:'retry_offer',completedEncounters};
  const credited={...run,encounter,completedEncounters,
    treasuryEvents:treasuryEvent(run,'gate:'+run.encounterIndex,finalScore,finalScore)};
  if(run.encounterIndex===LAST_FLAME.encounters.length-1){
    return {...credited,phase:'won'};
  }
  const draft={...credited,phase:'choosing_relic'};
  return {...draft,offeredRelicIds:offerJourneyRelics(draft)};
}
export const EMPTY_JOURNEY_PROGRESS=Object.freeze({
  schemaVersion:JOURNEY_SCHEMA,totalRuns:0,wins:0,bestRunScore:0,
  lifetimeGold:0,treasuryGold:0,creditedTreasuryEventIds:[],seenRoyalIds:[],
  discoveredRelicIds:[],unlockedStartingStyles:[],clearedChapterIds:[],
  recordedRunIds:[]
});
export function validJourneyProgress(value){
  return !!value&&value.schemaVersion===JOURNEY_SCHEMA&&
    Number.isInteger(value.totalRuns)&&Array.isArray(value.recordedRunIds)&&
    Array.isArray(value.discoveredRelicIds)&&
    Number.isSafeInteger(value.treasuryGold)&&value.treasuryGold>=0&&
    Array.isArray(value.creditedTreasuryEventIds);
}
// Old saves contain BANKed lifetime Gold, including failed gates. Grandfather
// those milestones; start the new Treasury at zero rather than minting Gold.
export function restoreJourneyProgress(value){
  if(validJourneyProgress(value))return value;
  if(!value||value.schemaVersion!==1||!Number.isInteger(value.totalRuns)||
     !Array.isArray(value.recordedRunIds)||!Array.isArray(value.discoveredRelicIds))
    return EMPTY_JOURNEY_PROGRESS;
  const {creditedBankIds,...old}=value;
  return {...EMPTY_JOURNEY_PROGRESS,...old,schemaVersion:JOURNEY_SCHEMA,
    treasuryGold:0,creditedTreasuryEventIds:[]};
}
export function restoreJourneyRun(value,treasuryGold=0){
  if(isValidJourney(value))return value;
  if(!value||value.schemaVersion!==1||!Number.isSafeInteger(value.runSeed)||
     !campaignLevel(value.levelNumber??1)||!Array.isArray(value.completedEncounters)||
     !Array.isArray(value.relicIds)||!value.encounter)return null;
  const earned=value.completedEncounters.filter(e=>e.passed)
    .reduce((sum,e)=>sum+e.finalScore,0);
  const net=Math.max(0,earned-(value.goldSpent||0));
  // Carry forward a legacy in-progress journey's net cleared-gate earnings,
  // without double-crediting them toward lifetime Royal progress.
  const migration={...value,schemaVersion:JOURNEY_SCHEMA,
    treasuryStart:treasuryGold,retryCount:0,retryGoldSpent:0,
    treasuryEvents:net?[{id:value.runId+'|legacy-gates',amount:net,lifetimeDelta:0}]:[]};
  return isValidJourney(migration)?migration:null;
}
// Apply all Treasury transactions at most once, including after browser reloads.
export function recordJourneyGold(progress,run){
  if(!isValidJourney(run))return progress;
  const old=restoreJourneyProgress(progress);
  const seen=new Set(old.creditedTreasuryEventIds);
  const pending=run.treasuryEvents.filter(e=>!seen.has(e.id));
  if(!pending.length)return old;
  return {...old,
    treasuryGold:old.treasuryGold+pending.reduce((sum,e)=>sum+e.amount,0),
    lifetimeGold:old.lifetimeGold+pending.reduce((sum,e)=>sum+(e.lifetimeDelta||0),0),
    creditedTreasuryEventIds:[...old.creditedTreasuryEventIds,...pending.map(e=>e.id)]};
}
// Idempotent: a completed run may be observed repeatedly across React render or reload.
export function recordJourneyProgress(progress,run){
  if(!isValidJourney(run)||!['won','lost','abandoned'].includes(run.phase))return progress;
  const old=restoreJourneyProgress(progress);
  if(old.recordedRunIds.includes(run.runId))return old;
  return {...old,totalRuns:old.totalRuns+1,wins:old.wins+(run.phase==='won'?1:0),
    bestRunScore:Math.max(old.bestRunScore,journeyRunScore(run)),
    recordedRunIds:[...old.recordedRunIds,run.runId],
    discoveredRelicIds:[...new Set([...old.discoveredRelicIds,...run.relicIds])],
    clearedChapterIds:run.phase==='won'?
      [...new Set([...old.clearedChapterIds,LAST_FLAME.id,
        campaignLevel(run.levelNumber||1).id])]:old.clearedChapterIds};
}
