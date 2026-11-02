import {newOverswing,overswingActions,stepOverswing,overswingFinal} from './engines.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {ROYAL_NAMES,royalCardsForLoadout,ROYAL_PRICES} from './overswingRoyals.js';
import {campaignLevel,campaignNextLevel,CAMPAIGN_LEVELS} from './overswingCampaign.js';
import {WILD_IDS,wildInventory,wildBalance,shuffleWildHand} from './overswingWilds.js';
import {revealOffer} from './overswingReveal.js';

export const JOURNEY_SCHEMA=4;
export const JOURNEY_PHASES=['playing','choosing_relic','choosing_wild','retry_offer','won','lost','abandoned'];
export const RELIC_PRICE_RATE=0.20; // price is 20% of the gate being entered
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
function dealFor(runSeed,index,equippedRoyals=[],levelNumber=1,retryCount=0){
  const config=LAST_FLAME.encounters[index],level=campaignLevel(levelNumber);
  const royals=royalCardsForLoadout(equippedRoyals,journeySeed(runSeed,index,'royals'),index);
  // First attempt remains unchanged; retries receive independent deterministic decks.
  const deckStream=retryCount===0?'deck':'deck:retry:'+retryCount;
  return {encounterId:config.id,engineState:newOverswing({
    seed:journeySeed(runSeed,index,deckStream),mode:'short',royals,
    initialHandSize:level.rules.maxHandSize||8
  }),effectiveTarget:Math.round(config.target*level.targetScale),
  snapCount:0,relicUses:{}};
}
export function offerJourneyRelics(run){
  // Each gate is a fresh purchase: a relic used in an earlier gate can appear
  // again, and the offer RNG is independent of card draw RNG.
  const choices=LAST_FLAME.relics.map(r=>r.id);
  const gateIndex=run.shopForGate??run.encounterIndex+1;
  const random=drawRandom(journeySeed(run.runSeed,gateIndex,'rewards'));
  for(let i=choices.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices.slice(0,LAST_FLAME.rewards.offerCount);
}
export function startJourney(runSeed=Date.now(),goldBalance=0,levelNumber=1,equippedRoyals=[],options={}){
  if(!Number.isSafeInteger(runSeed)||runSeed<0)throw new TypeError('Invalid run seed');
  if(!campaignLevel(levelNumber))throw new RangeError('Invalid campaign level');
  if(!Number.isSafeInteger(goldBalance)||goldBalance<0)throw new RangeError('Invalid Gold balance');
  if(!Array.isArray(equippedRoyals)||equippedRoyals.length>2||
     new Set(equippedRoyals).size!==equippedRoyals.length||
     equippedRoyals.some(id=>!ROYAL_NAMES.includes(id)))
    throw new TypeError('Invalid Royal loadout');
  const seed=runSeed,loadout=equippedRoyals.slice();
  const inventory=wildInventory(options.wildInventory);
  const initialShop=options.shopBeforeFirstGate===true;
  const draft={schemaVersion:JOURNEY_SCHEMA,contentPackId:LAST_FLAME.id,
    contentVersion:LAST_FLAME.version,runId:'last-flame-'+seed.toString(36),
    runSeed:seed,equippedRoyals:loadout,levelNumber,goldSpent:0,retryGoldSpent:0,
    goldStart:goldBalance,treasuryEvents:[],retryCount:0,
    revealedCardIds:[],revealPurchaseCount:0,revealGoldSpent:0,
    wildInventoryStart:inventory,wildEvents:[],wildUsedGate:false,wildShieldArmed:false,
    wildRewardAvailable:options.rewardAvailable===true,wildRewardId:null,
    phase:initialShop?'choosing_relic':'playing',
    encounterIndex:0,relicIds:[],purchasedRelicIds:[],
    shopForGate:initialShop?0:null,
    offeredRelicIds:[],encounter:dealFor(seed,0,loadout,levelNumber),
    completedEncounters:[]};
  return initialShop?{...draft,offeredRelicIds:offerJourneyRelics(draft)}:draft;
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
    (run.purchasedRelicIds===undefined||Array.isArray(run.purchasedRelicIds))&&
    (run.shopForGate===undefined||run.shopForGate===null||
      Number.isInteger(run.shopForGate)&&run.shopForGate>=0&&
      run.shopForGate<LAST_FLAME.encounters.length)&&
    Array.isArray(run.completedEncounters)&&
    Number.isSafeInteger(run.goldSpent)&&run.goldSpent>=0&&
    Number.isSafeInteger(run.retryGoldSpent)&&run.retryGoldSpent>=0&&
    Number.isSafeInteger(run.goldStart)&&run.goldStart>=0&&
    Array.isArray(run.treasuryEvents)&&
    (run.revealedCardIds===undefined||
      Array.isArray(run.revealedCardIds)&&
      run.revealedCardIds.every(id=>Number.isInteger(id)&&id>=0&&id<52))&&
    (run.revealPurchaseCount===undefined||
      Number.isSafeInteger(run.revealPurchaseCount)&&run.revealPurchaseCount>=0)&&
    (run.revealGoldSpent===undefined||
      Number.isSafeInteger(run.revealGoldSpent)&&run.revealGoldSpent>=0)&&
    Array.isArray(run.wildEvents)&&run.wildEvents.every(e=>WILD_IDS.includes(e.wildId)&&
      (e.amount===1||e.amount===-1)&&typeof e.id==='string')&&
    WILD_IDS.every(id=>Number.isSafeInteger(run.wildInventoryStart?.[id])&&
      run.wildInventoryStart[id]>=0)&&
    typeof run.wildUsedGate==='boolean'&&typeof run.wildShieldArmed==='boolean'&&
    typeof run.wildRewardAvailable==='boolean'&&
    (run.wildRewardId===null||WILD_IDS.includes(run.wildRewardId))&&
    Array.isArray(run.equippedRoyals)&&run.equippedRoyals.length<=2&&
    new Set(run.equippedRoyals).size===run.equippedRoyals.length&&
    run.equippedRoyals.every(id=>ROYAL_NAMES.includes(id))&&
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
// BANK earnings are provisional gate score. Only successful gates deposit
// into the one persistent spendable Gold balance.
export function journeyEarnedGold(run){
  return run.completedEncounters.filter(e=>e.passed)
    .reduce((sum,e)=>sum+e.finalScore,0);
}
export function journeyGoldBalance(run){
  return run.goldStart+run.treasuryEvents.reduce((sum,e)=>sum+e.amount,0);
}
export function journeyRunScore(run){
  return journeyEarnedGold(run)-run.goldSpent;
}
export function journeyWildBalance(run){
  return wildBalance(run.wildInventoryStart,run.wildEvents);
}
export function journeyCanUseWild(run,id){
  if(!isValidJourney(run)||run.phase!=='playing'||run.wildUsedGate||
     !WILD_IDS.includes(id)||journeyWildBalance(run)[id]<1)return false;
  const d=run.encounter.engineState.deal;
  if(id==='shuffle')return d.hand.some(card=>card<40)&&d.pos<d.deck.length;
  if(id==='polarity')return d.hand.some(card=>card<40);
  return journeyActions(run).some(action=>action.type==='flip');
}
function wildEvent(run,id,amount,source){
  return [...run.wildEvents,{id:run.runId+'|wild:'+source,wildId:id,amount}];
}
function gateBaseTarget(run){
  const gate=LAST_FLAME.encounters[run.encounterIndex];
  return Math.round(gate.target*campaignLevel(run.levelNumber||1).targetScale);
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
  const gateIndex=run.shopForGate??run.encounterIndex+1;
  const gate=LAST_FLAME.encounters[gateIndex];
  if(!gate)return 0;
  const target=Math.round(gate.target*campaignLevel(run.levelNumber||1).targetScale);
  return Math.max(10,Math.round(target*RELIC_PRICE_RATE/10)*10);
}
export function stepJourney(run,command){
  if(!isValidJourney(run)||!command||typeof command!=='object')return run;
  if(command.type==='ABANDON'){
    if(run.phase==='won'||run.phase==='lost'||run.phase==='abandoned')return run;
    return {...run,phase:'abandoned',offeredRelicIds:[]};
  }
  if(run.phase==='choosing_wild'){
    if(command.type!=='CHOOSE_WILD'||!run.wildRewardAvailable||
       !WILD_IDS.includes(command.wildId))return run;
    return {...run,phase:'won',wildRewardId:command.wildId,
      wildEvents:wildEvent(run,command.wildId,1,'reward:'+run.levelNumber)};
  }
  if(run.phase==='retry_offer'){
    if(command.type==='ACCEPT_DEFEAT')return {...run,phase:'lost'};
    if(command.type!=='BUY_RETRY'||!journeyCanRetry(run))return run;
    const price=journeyRetryPrice(run),retryCount=run.retryCount+1;
    return {...run,phase:'playing',retryCount,
      revealedCardIds:[],revealPurchaseCount:0,
      goldSpent:run.goldSpent+price,retryGoldSpent:run.retryGoldSpent+price,
      treasuryEvents:treasuryEvent(run,'retry:'+run.encounterIndex+':'+retryCount,-price),
      // Failed gate earnings are discarded, not counted toward Treasury or lifetime Gold.
      completedEncounters:run.completedEncounters.filter(e=>e.id!==run.encounter.encounterId),
      wildShieldArmed:false,
      // The one-Wild-per-gate limit survives retries.
      encounter:dealFor(run.runSeed,run.encounterIndex,run.equippedRoyals,run.levelNumber,retryCount)};
  }
  if(run.phase==='choosing_relic'&&
     (command.type==='BUY_RELIC'||command.type==='SKIP_RELIC')){
    const nextIndex=run.shopForGate??run.encounterIndex+1;
    if(nextIndex>=LAST_FLAME.encounters.length)return run;
    const buying=command.type==='BUY_RELIC';
    const price=journeyRelicPrice(run);
    if(buying&&(!run.offeredRelicIds.includes(command.relicId)||
       !LAST_FLAME_RELICS[command.relicId]||
       journeyGoldBalance(run)<price))return run;
    return {...run,phase:'playing',encounterIndex:nextIndex,retryCount:0,
      revealedCardIds:[],revealPurchaseCount:0,
      wildUsedGate:false,wildShieldArmed:false,
      goldSpent:run.goldSpent+(buying?price:0),
      treasuryEvents:buying?treasuryEvent(run,'relic:'+nextIndex,-price):run.treasuryEvents,
      // One purchased relic is usable only in this gate, never the next one.
      relicIds:buying?[command.relicId]:[],
      purchasedRelicIds:buying?[...(run.purchasedRelicIds||run.relicIds),command.relicId]:
        (run.purchasedRelicIds||run.relicIds),
      shopForGate:null,offeredRelicIds:[],
      encounter:dealFor(run.runSeed,nextIndex,run.equippedRoyals,run.levelNumber||1)};
  }
  if(run.phase!=='playing')return run;
  if(command.type==='BUY_REVEAL'){
    const offer=revealOffer(run);
    if(!offer||journeyGoldBalance(run)<offer.price)return run;
    return {...run,revealPurchaseCount:1,
      revealedCardIds:offer.cards,
      revealGoldSpent:(run.revealGoldSpent||0)+offer.price,
      goldSpent:run.goldSpent+offer.price,
      treasuryEvents:treasuryEvent(run,
        'reveal:'+run.encounterIndex+':'+run.retryCount,-offer.price)};
  }
  if(command.type==='USE_WILD'&&command.wildId!=='polarity'){
    const id=command.wildId;
    if(!journeyCanUseWild(run,id))return run;
    const events=wildEvent(run,id,-1,'use:'+run.encounterIndex);
    if(id==='shield')return {...run,wildEvents:events,wildUsedGate:true,
      wildShieldArmed:true};
    if(id==='shuffle'){
      const seed=journeySeed(run.runSeed,run.encounterIndex,
        'wild-shuffle:'+run.retryCount+':'+run.encounter.engineState.deal.pos);
      const engine=shuffleWildHand(run.encounter.engineState,seed);
      if(engine===run.encounter.engineState)return run;
      return {...run,wildEvents:events,wildUsedGate:true,
        encounter:{...run.encounter,engineState:engine}};
    }
    return run;
  }
  const polarity=command.type==='USE_WILD'&&command.wildId==='polarity';
  if(polarity&&(!journeyCanUseWild(run,'polarity')||
      !Number.isInteger(command.index)||
      !(run.encounter.engineState.deal.hand[command.index]<40)))return run;
  if(!polarity&&(command.type!=='PLAY'||!command.action))return run;
  const action=polarity?{type:'steer',index:command.index}:command.action;
  const old=run.encounter;
  const engine=stepOverswing(old.engineState,action,{
    ...journeyRules(run),polarityReverse:polarity,
    shieldNextFlip:run.wildShieldArmed&&action.type==='flip'});
  if(engine===old.engineState)return run;
  const nextWildEvents=polarity?
    wildEvent(run,'polarity',-1,'use:'+run.encounterIndex):run.wildEvents;
  const pendingShield=run.wildShieldArmed&&action.type!=='flip';
  const triggered=engine.lastAction?.modifiersApplied||[];
  const uses={...old.relicUses};
  for(const id of triggered)if(run.relicIds.includes(id))uses[id]=(uses[id]||0)+1;
  const snapCount=old.snapCount+(engine.lastAction?.snap?1:0);
  const content=LAST_FLAME.encounters[run.encounterIndex];
  const objective=content.objective;
  const effectiveTarget=Math.round(content.target*
    campaignLevel(run.levelNumber||1).targetScale)+
    (objective?.type==='snap_target_tax'?snapCount*objective.pointsPerSnap:0);
  const encounter={...old,engineState:engine,relicUses:uses,snapCount,effectiveTarget};
  const advanced={...run,encounter,wildEvents:nextWildEvents,
    wildUsedGate:run.wildUsedGate||polarity,wildShieldArmed:pendingShield};
  if(engine.status!=='over')return advanced;
  const finalScore=overswingFinal(engine);
  const result={id:content.id,finalScore,target:effectiveTarget,
    snaps:snapCount,passed:finalScore>=effectiveTarget};
  const completedEncounters=[...run.completedEncounters,result];
  if(!result.passed)return {...advanced,phase:'retry_offer',completedEncounters};
  const credited={...advanced,completedEncounters,
    treasuryEvents:treasuryEvent(run,'gate:'+run.encounterIndex,finalScore,finalScore)};
  if(run.encounterIndex===LAST_FLAME.encounters.length-1){
    return {...credited,phase:run.wildRewardAvailable?'choosing_wild':'won'};
  }
  const draft={...credited,phase:'choosing_relic',
    // An expired relic must not remain active while choosing for a new gate.
    relicIds:[],shopForGate:run.encounterIndex+1};
  return {...draft,offeredRelicIds:offerJourneyRelics(draft)};
}
export const EMPTY_JOURNEY_PROGRESS=Object.freeze({
  schemaVersion:JOURNEY_SCHEMA,totalRuns:0,wins:0,bestRunScore:0,
  lifetimeGold:0,ownedRoyalIds:[],equippedRoyalIds:[],
  wildInventory:{shuffle:0,polarity:0,shield:0},creditedWildEventIds:[],
  creditedTreasuryEventIds:[],seenRoyalIds:[],
  discoveredRelicIds:[],unlockedStartingStyles:[],clearedChapterIds:[],
  recordedRunIds:[]
});
export function validJourneyProgress(value){
  return !!value&&value.schemaVersion===JOURNEY_SCHEMA&&
    Number.isInteger(value.totalRuns)&&Array.isArray(value.recordedRunIds)&&
    Array.isArray(value.discoveredRelicIds)&&
    Number.isSafeInteger(value.lifetimeGold)&&value.lifetimeGold>=0&&
    Array.isArray(value.creditedTreasuryEventIds)&&
    Array.isArray(value.creditedWildEventIds)&&
    WILD_IDS.every(id=>Number.isSafeInteger(value.wildInventory?.[id])&&
      value.wildInventory[id]>=0)&&
    Array.isArray(value.ownedRoyalIds)&&Array.isArray(value.equippedRoyalIds);
}
// Upgrade both legacy save formats. Historical lifetimeGold is THE starting
// spendable Gold balance; old Treasury is dropped, never summed into it.
// Royals previously gained through milestones remain permanently owned.
export function restoreJourneyProgress(value,oldRun=null){
  if(validJourneyProgress(value))return value;
  if(!value||![1,2,3].includes(value.schemaVersion)||
     !Number.isInteger(value.totalRuns)||
     !Array.isArray(value.recordedRunIds)||!Array.isArray(value.discoveredRelicIds))
    return EMPTY_JOURNEY_PROGRESS;
  if(value.schemaVersion===3)return {...EMPTY_JOURNEY_PROGRESS,...value,
    schemaVersion:JOURNEY_SCHEMA,wildInventory:wildInventory(value.wildInventory),
    creditedWildEventIds:[]};
  const oldGold=Math.max(0,value.lifetimeGold||0);
  const owned=ROYAL_NAMES.filter((_,i)=>oldGold>=[40000,100000,180000][i]);
  // V2 credits successful gates but did not charge relics and retries against
  // lifetimeGold. Deduct expenditures from the current run exactly once.
  const outstanding=oldRun?.schemaVersion===2&&oldRun.runId&&!value.recordedRunIds.includes(oldRun.runId)
    ?Math.max(0,oldRun.goldSpent||0):0;
  const {treasuryGold,creditedBankIds,...old}=value;
  const oldSpendIds=outstanding&&Array.isArray(oldRun.treasuryEvents)
    ?oldRun.treasuryEvents.filter(e=>e.amount<0).map(e=>e.id):[];
  return {...EMPTY_JOURNEY_PROGRESS,...old,schemaVersion:JOURNEY_SCHEMA,
    lifetimeGold:Math.max(0,oldGold-outstanding),
    ownedRoyalIds:owned,equippedRoyalIds:owned.slice(0,2),
    creditedTreasuryEventIds:[...new Set([...(value.creditedTreasuryEventIds||[]),...oldSpendIds])]};
}
// Current-schema runs saved before the per-gate relic change had a cumulative
// relicIds list. Keep it as purchase history, but only retain the relic paid
// for in the *current* gate. No extra charge is applied on migration.
function restoreGateRelicState(run){
  if(Array.isArray(run.purchasedRelicIds))return run;
  const purchasedRelicIds=run.relicIds.slice();
  const activePhase=run.phase==='playing'||run.phase==='retry_offer';
  const boughtForCurrentGate=run.treasuryEvents.some(e=>
    typeof e.id==='string'&&e.id.endsWith('|relic:'+run.encounterIndex));
  const shopForGate=run.phase==='choosing_relic'?run.encounterIndex+1:null;
  const migrated={...run,purchasedRelicIds,
    relicIds:activePhase&&boughtForCurrentGate?purchasedRelicIds.slice(-1):[],
    shopForGate};
  if(shopForGate!==null)
    migrated.offeredRelicIds=offerJourneyRelics(migrated);
  return migrated;
}
export function restoreJourneyRun(value,progress=EMPTY_JOURNEY_PROGRESS){
  if(isValidJourney(value))return restoreGateRelicState(value);
  if(!value||![1,2,3].includes(value.schemaVersion)||
     !Number.isSafeInteger(value.runSeed)||!campaignLevel(value.levelNumber??1)||
     !Array.isArray(value.completedEncounters)||!Array.isArray(value.relicIds)||
     !value.encounter)return null;
  const owned=(progress.ownedRoyalIds||[]).filter(id=>ROYAL_NAMES.includes(id));
  const legacyTier=value.royalTier||0;
  const selected=ROYAL_NAMES.slice(0,legacyTier).filter(id=>owned.includes(id)).slice(0,2);
  const oldEvents=value.schemaVersion===2&&Array.isArray(value.treasuryEvents)
    ?value.treasuryEvents:[];
  const seen=new Set(progress.creditedTreasuryEventIds||[]);
  const settledSum=oldEvents.filter(e=>seen.has(e.id))
    .reduce((sum,e)=>sum+e.amount,0);
  const goldStart=Math.max(0,progress.lifetimeGold-settledSum);
  const migration={...value,schemaVersion:JOURNEY_SCHEMA,
    goldStart:value.schemaVersion===3?value.goldStart:goldStart,
    equippedRoyals:value.schemaVersion===3?value.equippedRoyals:selected,
    retryCount:value.retryCount||0,retryGoldSpent:value.retryGoldSpent||0,
    treasuryEvents:value.schemaVersion===3?value.treasuryEvents:oldEvents,
    goldSpent:value.goldSpent||0,
    wildInventoryStart:wildInventory(progress.wildInventory),
    wildEvents:[],wildUsedGate:false,wildShieldArmed:false,
    wildRewardAvailable:false,wildRewardId:null};
  delete migration.treasuryStart;
  return isValidJourney(migration)?restoreGateRelicState(migration):null;
}
export function buyRoyal(progress,id){
  const old=restoreJourneyProgress(progress),price=ROYAL_PRICES[id];
  if(!ROYAL_NAMES.includes(id)||old.ownedRoyalIds.includes(id)||old.lifetimeGold<price)return old;
  const owned=[...old.ownedRoyalIds,id];
  const equipped=old.equippedRoyalIds.length<2
    ?[...old.equippedRoyalIds,id]:old.equippedRoyalIds;
  return {...old,lifetimeGold:old.lifetimeGold-price,
    ownedRoyalIds:owned,equippedRoyalIds:equipped};
}
export function toggleRoyalEquipped(progress,id){
  const old=restoreJourneyProgress(progress);
  if(!old.ownedRoyalIds.includes(id))return old;
  const equipped=old.equippedRoyalIds.includes(id)
    ?old.equippedRoyalIds.filter(x=>x!==id)
    :old.equippedRoyalIds.length<2
      ?[...old.equippedRoyalIds,id]:[old.equippedRoyalIds[1],id];
  return {...old,equippedRoyalIds:equipped};
}
// Settle each purchase or successful gate once, including after a reload.
// The same lifetimeGold field is credited on victory and debited on purchases.
export function recordJourneyGold(progress,run){
  if(!isValidJourney(run))return progress;
  const old=restoreJourneyProgress(progress);
  const seenGold=new Set(old.creditedTreasuryEventIds);
  const seenWild=new Set(old.creditedWildEventIds);
  const pendingGold=run.treasuryEvents.filter(e=>!seenGold.has(e.id));
  const pendingWild=run.wildEvents.filter(e=>!seenWild.has(e.id));
  if(!pendingGold.length&&!pendingWild.length)return old;
  return {...old,
    lifetimeGold:Math.max(0,old.lifetimeGold+
      pendingGold.reduce((sum,e)=>sum+e.amount,0)),
    creditedTreasuryEventIds:[...old.creditedTreasuryEventIds,...pendingGold.map(e=>e.id)],
    wildInventory:wildBalance(old.wildInventory,pendingWild),
    creditedWildEventIds:[...old.creditedWildEventIds,...pendingWild.map(e=>e.id)]};
}
// Idempotent: a completed run may be observed repeatedly across React render or reload.
export function recordJourneyProgress(progress,run){
  if(!isValidJourney(run)||!['won','lost','abandoned'].includes(run.phase))return progress;
  const old=restoreJourneyProgress(progress);
  if(old.recordedRunIds.includes(run.runId))return old;
  return {...old,totalRuns:old.totalRuns+1,wins:old.wins+(run.phase==='won'?1:0),
    bestRunScore:Math.max(old.bestRunScore,journeyRunScore(run)),
    recordedRunIds:[...old.recordedRunIds,run.runId],
    discoveredRelicIds:[...new Set([...old.discoveredRelicIds,
      ...(run.purchasedRelicIds||run.relicIds)])],
    clearedChapterIds:run.phase==='won'?
      [...new Set([...old.clearedChapterIds,LAST_FLAME.id,
        campaignLevel(run.levelNumber||1).id])]:old.clearedChapterIds};
}
