import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import OverswingPlay from './OverswingPlay.jsx';
import OverswingCampaignMap from './OverswingCampaignMap.jsx';
import OverswingMarket from './OverswingMarket.jsx';
import OverswingGateBriefing from './OverswingGateBriefing.jsx';
import OverswingEnemyIntro,{EnemyPortrait} from './OverswingEnemy.jsx';
import {opponentForLevel} from './overswingEnemies.js';
import DoomFire from './DoomFire.jsx';
import HellPendulum from './HellPendulum.jsx';
import {revealOffer} from './overswingReveal.js';
import useOverswingSound from './useOverswingSound.js';
import {trackForGate} from './overswingTracks.js';
import OverswingSoundControls from './OverswingSoundControls.jsx';
import {potCrackForAction} from './overswingFeedback.js';
import GoldAmount from './GoldCoin.jsx';
import OverswingPurchaseFlight from './OverswingPurchaseFlight.jsx';
import {purchaseFlightPoints} from './overswingPurchaseGeometry.js';
import {campaignNextLevel,campaignLevel,campaignRuleLabels} from './overswingCampaign.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {
  startJourney,stepJourney,isValidJourney,recordJourneyProgress,
  EMPTY_JOURNEY_PROGRESS,validJourneyProgress,journeyRunScore,recordJourneyGold,
  journeyGoldBalance,journeyRelicPrice,journeyEarnedGold,journeyRetryPrice,
  journeyCanRetry,RETRY_PRICE_RATES,restoreJourneyProgress,restoreJourneyRun,
  journeyWildBalance,buyRoyal,buyMarketWild,MARKET_WILD_PRICES,resetJourneyAtLevel
} from './overswingJourney.js';
import {ROYAL_RULES,ROYAL_NAMES,ROYAL_PRICES} from './overswingRoyals.js';
import {WILD_IDS,WILD_RULES} from './overswingWilds.js';
import './overswingJourney.css';
import './overswingVisualFix.css';

const RUN_KEY='card-game-lab.overswing.journey.v1';
const PROFILE_KEY='card-game-lab.overswing.journey-profile.v1';
const fmt=n=>Number(n).toLocaleString('en-US');
function GoldProgress({progress,compact=false}){
  return <section className={'oj-gold-progress'+(compact?' oj-gold-compact':'')}
    aria-label="Spendable Gold balance">
    <div><strong data-oj-treasury><GoldAmount value={progress.lifetimeGold||0} showLabel size={compact?'hero':'lg'}/></strong>
      {!compact&&<span>EARN AT CLEARED GATES</span>}</div>
  </section>;
}
function WildReward({run,onPick}){
  return <main className="oj-shell oj-reward"><section className="oj-panel oj-recap">
    <div className="oj-rune" aria-hidden="true">✦</div>
    <p className="oj-eyebrow">LOCATION {run.levelNumber} CONQUERED</p>
    <h2>CHOOSE A WILD CARD</h2>
    <p>First-clear reward: choose one Wild Card for your permanent inventory.
      It can be saved for a later journey. No bonus Gold is awarded.</p>
    <div className="oj-wild-reward-options">{WILD_IDS.map(id=>
      <button type="button" key={id} className="oj-wild-reward-option"
        onClick={()=>onPick(id)}>
        <span className="oj-wild-reward-symbol" aria-hidden="true">{WILD_RULES[id].symbol}</span>
        <strong>{WILD_RULES[id].name}</strong>
        <small>{WILD_RULES[id].description}</small>
        <b>CLAIM ×1</b>
      </button>)}</div>
  </section></main>;
}
function RoyalReveal({id,onContinue}){
  const royal=ROYAL_RULES[id];
  return createPortal(<div className="oj-royal-overlay" role="presentation">
    <section className="oj-royal-modal" role="dialog" aria-modal="true" aria-labelledby="oj-royal-name">
      <p className="oj-eyebrow">ROYAL CARD OWNED FOREVER</p>
      <div className={'oj-royal-card oj-royal-card-'+id.toLowerCase()} aria-hidden="true">
          <span className="oj-royal-large-insignia">♛</span>
          <span>{id}</span><strong>{royal.value}</strong><small>ROYAL</small>
        </div>
      <h2 id="oj-royal-name">{royal.title}</h2>
      <p>{royal.description}</p>
      <p className="oj-royal-note">Automatically active in future journeys. Appears at a random later hand refill, never on FLIP or in the opening hand.</p>
      <button type="button" className="oj-primary" onClick={onContinue} autoFocus>CONTINUE</button>
    </section>
  </div>,document.body);
}

function readSaved(key){
  try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}
}
function Relic({id,selected=false,used=false,onClick,price=0,affordable=true}){
  const r=LAST_FLAME_RELICS[id];
  if(!r)return null;
  const content=<><span className="oj-relic-symbol" aria-hidden="true">{r.symbol}</span>
    <span className="oj-relic-copy"><strong>{r.title}</strong>
      <small>{r.description}</small>{used&&<em>USED THIS GATE</em>}</span>
    {onClick&&<span className="oj-relic-pick">{affordable?'BUY':'NEED'}<strong><GoldAmount value={price}/></strong></span>}</>;
  return onClick?
    <button className={'oj-relic '+(selected?'oj-relic-selected':'')} type="button" onClick={onClick} disabled={!affordable} aria-label={'Buy '+r.title+' for '+fmt(price)+' Gold'}>{content}</button>:
    <div className={'oj-relic '+(used?'oj-relic-used':'')}>{content}</div>;
}
function Route({run,compact=false}){
  const current=run?.encounterIndex??0;
  return <div className={'oj-route '+(compact?'oj-route-compact':'')} aria-label="Three-gate journey">
    {LAST_FLAME.encounters.map((e,index)=><React.Fragment key={e.id}>
      {index>0&&<div className="oj-route-line" aria-hidden="true"/>}
      <div className={'oj-route-node '+(index===current?'oj-route-current':'')+(index<current?' oj-route-done':'')}>
        <span className="oj-route-icon">{e.symbol}</span>
        {!compact&&<><strong>{e.title}</strong><small><GoldAmount value={Math.round(e.target*campaignLevel(run?.levelNumber||1).targetScale)}/>+</small></>}
      </div>
    </React.Fragment>)}
  </div>;
}
function Recap({run,onNew,onMenu,progress}){
  const won=run.phase==='won';
  return <div className="oj-panel oj-recap">
    <div className="oj-rune">{won?'♛':'✕'}</div>
    <p className="oj-eyebrow">{won?'THE FLAME ENDURES':'THE FLAME FADES'}</p>
    <h2>{won?'RUN COMPLETE':'RUN ENDED'}</h2>
    <p>{won?'Level '+(run.levelNumber||1)+' cleared! The next path is open.':
      run.phase==='abandoned'?'You left the furnace. Your collected knowledge remains.':
      'The gate demanded more fire than you could bank.'}</p>
    <div className="oj-recap-total"><small>RUN GOLD · AFTER PURCHASES</small><strong><GoldAmount value={journeyRunScore(run)} size="lg"/></strong></div>
    <p className="oj-gold-accounting">Cleared gates <GoldAmount value={journeyEarnedGold(run)}/> · Relics <GoldAmount value={run.goldSpent-run.retryGoldSpent-(run.revealGoldSpent||0)}/> · Deck reveal <GoldAmount value={run.revealGoldSpent||0}/> · Retries <GoldAmount value={run.retryGoldSpent}/></p>
    <p className="oj-gold-accounting">Gold balance: <GoldAmount value={journeyGoldBalance(run)}/></p>
    <div className="oj-recap-rows">{run.completedEncounters.map(row=>
      <div key={row.id}><span>{LAST_FLAME.encounters.find(e=>e.id===row.id)?.title}</span>
        <strong className={row.passed?'oj-passed':'oj-failed'}><GoldAmount value={row.finalScore}/> / <GoldAmount value={row.target}/></strong></div>)}</div>
    {(run.purchasedRelicIds||run.relicIds).length>0&&<><p className="oj-eyebrow">RELICS PURCHASED · EXPIRED AFTER EACH GATE</p>
      <div className="oj-owned-relics">{(run.purchasedRelicIds||run.relicIds).map((id,index)=>
        <Relic id={id} key={id+'-'+index}/>)}</div></>}
    <p className="oj-record">Your record · {progress.wins} victories · Best <GoldAmount value={Math.max(progress.bestRunScore,journeyRunScore(run))}/></p>
    <div className="oj-choices"><button className="oj-primary" onClick={onNew}>{won?'NEXT LEVEL · MAP':'RETRY · MAP'}</button>
      <button className="oj-secondary" onClick={onMenu}>MENU</button></div>
  </div>;
}
function RetryOffer({run,onRetry,onDecline,pendingPurchase=null}){
  const available=journeyCanRetry(run),remaining=RETRY_PRICE_RATES.length-run.retryCount;
  const last=run.completedEncounters.at(-1),price=journeyRetryPrice(run);
  return <main className="oj-shell oj-reward"><div className="oj-panel oj-recap">
    <div className="oj-rune">✕</div>
    <p className="oj-eyebrow">LEVEL {run.levelNumber} · GATE {run.encounterIndex+1} OF 3</p>
    <h2>THE FLAME FADES</h2>
    <p>{LAST_FLAME.encounters[run.encounterIndex].title}: <GoldAmount value={last.finalScore}/> / <GoldAmount value={last.target}/></p>
    <p>Gold BANKed in this failed gate is lost. Earlier cleared gates remain credited. A relic purchased for this gate also remains active for its retries.</p>
    <div className="oj-shop-wallet">
      <span>AVAILABLE GOLD <strong data-oj-treasury><GoldAmount value={journeyGoldBalance(run)}/></strong></span>
      <span>RETRIES LEFT <strong>{remaining} / {RETRY_PRICE_RATES.length}</strong></span>
    </div>
    {remaining>0?<div className="oj-choices">
      <button className="oj-primary" type="button" onClick={e=>onRetry(e.currentTarget)} disabled={!available||!!pendingPurchase}>
        RETRY GATE · <GoldAmount value={price}/> ({Math.round(RETRY_PRICE_RATES[run.retryCount]*100)}%)
      </button>
      {!available&&<p className="oj-hint">Not enough Gold for another attempt.</p>}
    </div>:<p className="oj-hint">All three retries for this gate have been used.</p>}
    <button className="oj-secondary" type="button" onClick={onDecline} disabled={!!pendingPurchase}>ACCEPT DEFEAT</button>
  </div></main>;
}
export default function OverswingJourney({quickState,quickAct,quickRestart,fullView=false}){
  const [view,setView]=useState('journey');
  const [introVisible,setIntroVisible]=useState(false);
  const [introClosing,setIntroClosing]=useState(false);
  const [briefingReady,setBriefingReady]=useState(true);
  const [bankTransition,setBankTransition]=useState(false);
  const [lossTransition,setLossTransition]=useState(false);
  const [purchaseFlight,setPurchaseFlight]=useState(null);
  const [pendingPurchase,setPendingPurchase]=useState(null);
  const purchaseLock=useRef(false),purchaseTimers=useRef([]);
  const launchPurchase=(target,price,label,key,commit)=>{
    if(purchaseLock.current)return;
    const points=purchaseFlightPoints(target,document);
    if(!points){commit();return;}
    purchaseLock.current=true;
    setPendingPurchase(key);
    setPurchaseFlight({...points,price,label,serial:Date.now()});
    purchaseTimers.current.forEach(window.clearTimeout);
    purchaseTimers.current=[
      window.setTimeout(()=>{
        commit();
        purchaseLock.current=false;
        setPendingPurchase(null);
      },1180),
      window.setTimeout(()=>setPurchaseFlight(null),1450)
    ];
  };
  useEffect(()=>()=>purchaseTimers.current.forEach(window.clearTimeout),[]);
  const sound=useOverswingSound();
  // The cinematic image remains mounted in exactly the same position while
  // PREPARE fades away and the gate rules/relic controls fade in below it.
  const [progress,setProgress]=useState(()=>
    restoreJourneyProgress(readSaved(PROFILE_KEY),readSaved(RUN_KEY)));
  const [run,setRun]=useState(()=>restoreJourneyRun(
    readSaved(RUN_KEY),restoreJourneyProgress(readSaved(PROFILE_KEY),readSaved(RUN_KEY))));
  // Menu/briefing have their own longer horror loop, cinematic intro stays
  // slower, and gameplay restores the selected gate track with a smooth fade.
  useEffect(()=>{
    if(introVisible){sound.setAtmosphere('cinematic');return;}
    if(view==='quick'||(view==='journey'&&run?.phase==='playing')){
      sound.setAtmosphere(null);return;
    }
    sound.setAtmosphere('menu');
  },[view,introVisible,run?.phase]);

  const [selectedLevel,setSelectedLevel]=useState(()=>
    campaignNextLevel(readSaved(PROFILE_KEY)?.clearedChapterIds));
  useEffect(()=>setSelectedLevel(campaignNextLevel(progress.clearedChapterIds)),
    [progress.clearedChapterIds]);
  // Choose one original track for each gate (including restored runs).
  // Same run/level/gate -> same selection; the six-track shuffle bag avoids
  // adjacent repeats without touching any gameplay RNG.
  useEffect(()=>{
    if(run){
      sound.setTrack(trackForGate(run.runSeed,run.levelNumber,run.encounterIndex));
    }else{
      sound.setTrack(0);
    }
  },[run?.runSeed,run?.levelNumber,run?.encounterIndex]);
  // Keep the music calm on reward screens and after successful gates. The
  // action SFX and BANK coin celebration are independent from this reset.
  useEffect(()=>{
    if(!run||run.phase!=='playing')sound.setTension(.06,{goalMet:true});
  },[run?.phase,run?.runSeed]);
  // Keep the board visible for the coin fountain before entering a gate shop
  // or final result. It doesn't delay scoring, persistence, or game rules.
  useEffect(()=>{
    if(!bankTransition)return;
    const timer=window.setTimeout(()=>setBankTransition(false),1450);
    return ()=>window.clearTimeout(timer);
  },[bankTransition,run?.encounter?.engineState?.lastAction]);
  // Keep the board visible until the glass fracture animation completes.
  useEffect(()=>{
    if(!lossTransition)return;
    const timer=window.setTimeout(()=>setLossTransition(false),1450);
    return ()=>window.clearTimeout(timer);
  },[lossTransition,run?.encounter?.engineState?.lastAction]);
  useEffect(()=>{try{
    if(run)localStorage.setItem(RUN_KEY,JSON.stringify(run));
    else localStorage.removeItem(RUN_KEY);
  }catch{}},[run]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(progress));}catch{}},[progress]);
  useEffect(()=>{
    if(run)setProgress(current=>recordJourneyGold(current,run));
  },[run]);
  useEffect(()=>{
    if(run&&['won','lost','abandoned'].includes(run.phase)){
      setProgress(current=>recordJourneyProgress(current,run));
    }
  },[run?.phase,run?.runId]);
  const begin=(level=selectedLevel)=>{
    const restarted=resetJourneyAtLevel(progress,run,level,Date.now());
    if(!restarted)return false;
    setProgress(restarted.progress);
    setRun(restarted.run);
    setBankTransition(false);
    setLossTransition(false);
    setView('journey');
    return true;
  };
  const play=action=>{
    if(action?.type==='bank')setBankTransition(true);
    if(run&&action?.type!=='bank'){
      const next=stepJourney(run,{type:'PLAY',action});
      if(next!==run&&potCrackForAction(next.encounter?.engineState?.lastAction))
        setLossTransition(true);
    }
    setRun(current=>current?stepJourney(current,{type:'PLAY',action}):current);
  };
  const useWild=(wildId,index)=>setRun(current=>current?
    stepJourney(current,{type:'USE_WILD',wildId,index}):current);
  const purchaseReveal=target=>{
    if(run?.phase!=='playing')return;
    const offer=revealOffer(run);
    if(!offer||journeyGoldBalance(run)<offer.price)return;
    launchPurchase(target,offer.price,'DECK REVEALED','reveal',
      ()=>setRun(current=>current?stepJourney(current,{type:'BUY_REVEAL'}):current));
  };
  const claimWild=wildId=>setRun(current=>current?
    stepJourney(current,{type:'CHOOSE_WILD',wildId}):current);
  const buy=(relicId,target)=>{
    if(run?.phase!=='choosing_relic'||!run.offeredRelicIds.includes(relicId))return;
    const price=journeyRelicPrice(run);
    if(journeyGoldBalance(run)<price)return;
    launchPurchase(target,price,'RELIC SECURED','relic:'+relicId,
      ()=>{setIntroVisible(false);setRun(current=>current?stepJourney(current,{type:'BUY_RELIC',relicId}):current);});
  };
  const skip=()=>{
    if(purchaseLock.current)return;
    setIntroVisible(false);
    setRun(current=>current?stepJourney(current,{type:'SKIP_RELIC'}):current);
  };
  const buyRetry=target=>{
    if(!journeyCanRetry(run))return;
    launchPurchase(target,journeyRetryPrice(run),'GATE REPLAY','retry',
      ()=>setRun(current=>current?stepJourney(current,{type:'BUY_RETRY'}):current));
  };
  const acceptDefeat=()=>{
    if(purchaseLock.current)return;
    setRun(current=>current?stepJourney(current,{type:'ACCEPT_DEFEAT'}):current);
  };
  const purchaseRoyal=(id,target)=>{
    const price=ROYAL_PRICES[id];
    if(!price||progress.ownedRoyalIds.includes(id)||progress.lifetimeGold<price||activeJourney)return;
    launchPurchase(target,price,'ROYAL ACQUIRED','royal:'+id,
      ()=>setProgress(current=>buyRoyal(current,id)));
  };
  const purchaseWild=(id,target)=>{
    const price=MARKET_WILD_PRICES[id];
    if(!price||progress.lifetimeGold<price||activeJourney)return;
    launchPurchase(target,price,'WILD +1','wild:'+id,
      ()=>setProgress(current=>buyMarketWild(current,id)));
  };
  const activeJourney=!!run&&!['won','lost','abandoned'].includes(run.phase);
  const newRoyal=(progress.ownedRoyalIds||[]).find(id=>!(progress.seenRoyalIds||[]).includes(id));
  const reveal=newRoyal?<RoyalReveal id={newRoyal} onContinue={()=>setProgress(old=>({
    ...old,seenRoyalIds:[...(old.seenRoyalIds||[]),newRoyal]
  }))}/>:null;
  const screen=(()=>{
  if(view==='quick')return <div className="oj-shell oj-quick">
    <button type="button" className="oj-back" onClick={()=>setView('journey')}>‹ JOURNEY MENU</button>
    <OverswingPlay s={quickState} act={quickAct} restart={quickRestart}
      fullView={fullView} sound={sound}/>
  </div>;
  if(view==='market')return <OverswingMarket progress={progress}
    disabled={activeJourney} pendingPurchase={pendingPurchase} onRoyal={purchaseRoyal} onWild={purchaseWild}
    onBack={()=>setView('map')}/>;
  if(!run||view==='menu'||view==='map')return <main className="oj-shell oj-home oj-map-home" onPointerDown={sound.unlock}>
    <header className="oj-title">
      <OverswingSoundControls sound={sound} className="oj-main-audio"/>
      <DoomFire className="oj-title-doom-fire" width={62} height={34}/>
      <HellPendulum/>
      <h1>OVER<span>SWING</span></h1>
      <p className="oj-subtitle">THE LAST FLAME</p></header>
    <div className="oj-home-purse"><GoldProgress progress={progress} compact/>
      <button type="button" className="oj-market-button" onClick={()=>{
        sound.unlock();setView('market');
      }} aria-label="Open Market to buy Royal and Wild cards">
        <svg className="oj-market-emblem" viewBox="0 0 32 30" shapeRendering="crispEdges" aria-hidden="true">
          <path d="M7 14H25V27H7Z" fill="#6f3929"/>
          <path d="M10 20H22V27H10Z" fill="#d3954e"/>
          <path d="M13 22H19V27H13Z" fill="#34212a"/>
          <path d="M3 9H29V15H3Z" fill="#a34f30"/>
          <path d="M5 5H27V9H5Z" fill="#e9a45a"/>
          <path d="M8 2H24V5H8Z" fill="#ffdc88"/>
          <path d="M9 10H13V14H9ZM19 10H23V14H19Z" fill="#ffd68c"/>
        </svg>
        <span className="oj-market-copy"><strong>MARKET</strong><small>CARDS · WILDS</small></span>
      </button></div>
    <OverswingCampaignMap progress={progress} selected={selectedLevel}
      onSelect={setSelectedLevel} onStart={()=>{
        if(!begin(selectedLevel))return;
        sound.setAtmosphere('cinematic');
        sound.unlock();
        // Each PREPARE press starts a fresh intro and a fresh gate briefing.
        setBriefingReady(false);
        setIntroClosing(false);
        setIntroVisible(true);
      }}
      onQuick={()=>{sound.unlock();setView('quick');}}
      activeRun={run&&!['won','lost','abandoned'].includes(run.phase)?()=>setView('journey'):null}/>
  </main>;
  if(run.phase==='playing'||(bankTransition&&
     ['choosing_relic','choosing_wild','won'].includes(run.phase)&&
     run.encounter?.engineState?.lastAction?.type==='bank')||
    (lossTransition&&run.phase==='retry_offer'&&
     potCrackForAction(run.encounter?.engineState?.lastAction)))
    return <div className="oj-shell oj-playing">
    <OverswingPlay s={run.encounter.engineState} act={play} onWild={useWild}
      onReveal={purchaseReveal} purchasePending={!!pendingPurchase}
      journey={run} fullView={fullView} onBack={()=>setView('menu')}
      sound={sound}/>
    <div className="oj-exit-row"><button type="button" onClick={()=>setView('menu')}>LEAVE BOARD</button></div>
  </div>;
  if(run.phase==='choosing_relic'&&introVisible)return null;
  if(run.phase==='choosing_relic')return <OverswingGateBriefing
    run={run} ready={briefingReady} pendingPurchase={pendingPurchase} onBuy={buy} onSkip={skip}
    onBack={()=>setView('map')}/>;
  if(run.phase==='choosing_wild')return <WildReward run={run} onPick={claimWild}/>;
  if(run.phase==='retry_offer')return <RetryOffer run={run} pendingPurchase={pendingPurchase} onRetry={buyRetry} onDecline={acceptDefeat}/>;
  if(['won','lost','abandoned'].includes(run.phase))return <main className="oj-shell">
    <Recap run={run} progress={progress} onNew={()=>setView('map')} onMenu={()=>setView('map')}/>
  </main>;
  return null;
  })();
  return <>{screen}{reveal}<OverswingPurchaseFlight purchase={purchaseFlight}/>{introVisible&&run?.phase==='choosing_relic'&&<OverswingEnemyIntro
      level={run.levelNumber} prepared={briefingReady}
      onContinue={()=>{sound.setAtmosphere('menu');setBriefingReady(true);}}>
      <OverswingGateBriefing run={run} embedded ready={briefingReady}
        pendingPurchase={pendingPurchase} onBuy={buy} onSkip={skip}
        onBack={()=>{setIntroVisible(false);setView('map');}}/>
    </OverswingEnemyIntro>}</>;
}
