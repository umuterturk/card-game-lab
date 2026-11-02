import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import OverswingPlay from './OverswingPlay.jsx';
import OverswingCampaignMap from './OverswingCampaignMap.jsx';
import {campaignNextLevel,campaignLevel} from './overswingCampaign.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {
  startJourney,stepJourney,isValidJourney,recordJourneyProgress,
  EMPTY_JOURNEY_PROGRESS,validJourneyProgress,journeyRunScore,recordJourneyGold,
  journeyGoldBalance,journeyRelicPrice,journeyEarnedGold,journeyRetryPrice,
  journeyCanRetry,RETRY_PRICE_RATES,restoreJourneyProgress,restoreJourneyRun
} from './overswingJourney.js';
import {ROYAL_RULES,ROYAL_THRESHOLDS,unlockedRoyals,nextRoyal,targetScale} from './overswingRoyals.js';
import './overswingJourney.css';

const RUN_KEY='card-game-lab.overswing.journey.v1';
const PROFILE_KEY='card-game-lab.overswing.journey-profile.v1';
const fmt=n=>Number(n).toLocaleString('en-US');
const fmtGold=n=>fmt(n)+' GOLD';
function GoldProgress({progress}){
  const gold=progress.lifetimeGold||0,next=nextRoyal(gold);
  const index=next?['J','Q','K'].indexOf(next):-1;
  const previous=index>0?ROYAL_THRESHOLDS[index-1]:0;
  const target=index>=0?ROYAL_THRESHOLDS[index]:ROYAL_THRESHOLDS.at(-1);
  const percent=Math.max(0,Math.min(100,100*(gold-previous)/(target-previous)));
  return <section className="oj-gold-progress" aria-label="Lifetime Gold and Royal progress">
    <div><strong>✦ TREASURY · {fmt(progress.treasuryGold||0)} G</strong><span>LIFETIME · {fmt(gold)} G</span></div>
    <div><small>{next?'NEXT ROYAL: '+next+' · '+fmtGold(target):'ALL ROYALS UNLOCKED'}</small></div>
    <div className="oj-gold-track"><span style={{width:percent+'%'}}/></div>
    <small>Royals: {unlockedRoyals(gold).join(' · ')||'LOCKED'} · Gate targets ×{targetScale(unlockedRoyals(gold).length).toFixed(2)}</small>
  </section>;
}
function RoyalReveal({id,onContinue}){
  const royal=ROYAL_RULES[id];
  return createPortal(<div className="oj-royal-overlay" role="presentation">
    <section className="oj-royal-modal" role="dialog" aria-modal="true" aria-labelledby="oj-royal-name">
      <p className="oj-eyebrow">ROYAL CARD DISCOVERED</p>
      <div className="oj-royal-card" aria-hidden="true"><span>{id}</span><strong>{royal.value}</strong><small>ROYAL</small></div>
      <h2 id="oj-royal-name">{royal.title}</h2>
      <p>{royal.description}</p>
      <p className="oj-royal-note">Hand-only. Never drawn by FLIP. A Royal replaces a normal card in future journeys.</p>
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
    {onClick&&<span className="oj-relic-pick">{affordable?'BUY':'NEED'}<strong>{fmt(price)} G</strong></span>}</>;
  return onClick?
    <button className={'oj-relic '+(selected?'oj-relic-selected':'')} type="button" onClick={onClick} disabled={!affordable} aria-label={'Buy '+r.title+' for '+fmt(price)+' Gold'}>{content}</button>:
    <div className={'oj-relic '+(used?'oj-relic-used':'')}>{content}</div>;
}
function Route({run,compact=false,tier=0}){
  const current=run?.encounterIndex??0;
  return <div className={'oj-route '+(compact?'oj-route-compact':'')} aria-label="Three-gate journey">
    {LAST_FLAME.encounters.map((e,index)=><React.Fragment key={e.id}>
      {index>0&&<div className="oj-route-line" aria-hidden="true"/>}
      <div className={'oj-route-node '+(index===current?'oj-route-current':'')+(index<current?' oj-route-done':'')}>
        <span className="oj-route-icon">{e.symbol}</span>
        {!compact&&<><strong>{e.title}</strong><small>{fmt(Math.round(e.target*targetScale(run?.royalTier??tier)*campaignLevel(run?.levelNumber||1).targetScale))}+ GOLD</small></>}
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
    <div className="oj-recap-total"><small>RUN GOLD · AFTER PURCHASES</small><strong>{fmt(journeyRunScore(run))}</strong></div>
    <p className="oj-gold-accounting">Cleared gates {fmt(journeyEarnedGold(run))} G · Relics {fmt(run.goldSpent-run.retryGoldSpent)} G · Retries {fmt(run.retryGoldSpent)} G</p>
    <p className="oj-gold-accounting">Treasury: {fmt(journeyGoldBalance(run))} G</p>
    <div className="oj-recap-rows">{run.completedEncounters.map(row=>
      <div key={row.id}><span>{LAST_FLAME.encounters.find(e=>e.id===row.id)?.title}</span>
        <strong className={row.passed?'oj-passed':'oj-failed'}>{fmt(row.finalScore)} / {fmt(row.target)}</strong></div>)}</div>
    {run.relicIds.length>0&&<><p className="oj-eyebrow">YOUR RELICS</p>
      <div className="oj-owned-relics">{run.relicIds.map(id=><Relic id={id} key={id}/>)}</div></>}
    <p className="oj-record">Your record · {progress.wins} victories · Best {fmt(Math.max(progress.bestRunScore,journeyRunScore(run)))}</p>
    <div className="oj-choices"><button className="oj-primary" onClick={onNew}>{won?'NEXT LEVEL · MAP':'RETRY · MAP'}</button>
      <button className="oj-secondary" onClick={onMenu}>MENU</button></div>
  </div>;
}
function RetryOffer({run,onRetry,onDecline}){
  const available=journeyCanRetry(run),remaining=RETRY_PRICE_RATES.length-run.retryCount;
  const last=run.completedEncounters.at(-1),price=journeyRetryPrice(run);
  return <main className="oj-shell oj-reward"><div className="oj-panel oj-recap">
    <div className="oj-rune">✕</div>
    <p className="oj-eyebrow">LEVEL {run.levelNumber} · GATE {run.encounterIndex+1} OF 3</p>
    <h2>THE FLAME FADES</h2>
    <p>{LAST_FLAME.encounters[run.encounterIndex].title}: {fmt(last.finalScore)} / {fmt(last.target)} Gold</p>
    <p>Gold BANKed in this failed gate is lost. Earlier cleared gates and relics remain yours.</p>
    <div className="oj-shop-wallet">
      <span>TREASURY <strong>{fmt(journeyGoldBalance(run))} G</strong></span>
      <span>RETRIES LEFT <strong>{remaining} / {RETRY_PRICE_RATES.length}</strong></span>
    </div>
    {remaining>0?<div className="oj-choices">
      <button className="oj-primary" type="button" onClick={onRetry} disabled={!available}>
        RETRY GATE · {fmt(price)} GOLD ({Math.round(RETRY_PRICE_RATES[run.retryCount]*100)}%)
      </button>
      {!available&&<p className="oj-hint">Not enough Treasury Gold for another attempt.</p>}
    </div>:<p className="oj-hint">All three retries for this gate have been used.</p>}
    <button className="oj-secondary" type="button" onClick={onDecline}>ACCEPT DEFEAT</button>
  </div></main>;
}
export default function OverswingJourney({quickState,quickAct,quickRestart,fullView=false}){
  const [view,setView]=useState('journey');
  const [progress,setProgress]=useState(()=>restoreJourneyProgress(readSaved(PROFILE_KEY)));
  const [run,setRun]=useState(()=>restoreJourneyRun(
    readSaved(RUN_KEY),restoreJourneyProgress(readSaved(PROFILE_KEY)).treasuryGold));
  const [selectedLevel,setSelectedLevel]=useState(()=>
    campaignNextLevel(readSaved(PROFILE_KEY)?.clearedChapterIds));
  useEffect(()=>setSelectedLevel(campaignNextLevel(progress.clearedChapterIds)),
    [progress.clearedChapterIds]);
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
    const settled=run?recordJourneyGold(progress,run):progress;
    const next=campaignNextLevel(settled.clearedChapterIds);
    if(level>next||!campaignLevel(level))return;
    setProgress(settled);
    setRun(startJourney(Date.now(),settled.lifetimeGold||0,level,settled.treasuryGold||0));
    setView('journey');
  };
  const play=action=>setRun(current=>current?stepJourney(current,{type:'PLAY',action}):current);
  const buy=relicId=>setRun(current=>current?stepJourney(current,{type:'BUY_RELIC',relicId}):current);
  const skip=()=>setRun(current=>current?stepJourney(current,{type:'SKIP_RELIC'}):current);
  const buyRetry=()=>setRun(current=>current?stepJourney(current,{type:'BUY_RETRY'}):current);
  const acceptDefeat=()=>setRun(current=>current?stepJourney(current,{type:'ACCEPT_DEFEAT'}):current);
  const newRoyal=unlockedRoyals(progress.lifetimeGold||0).find(id=>!(progress.seenRoyalIds||[]).includes(id));
  const reveal=newRoyal?<RoyalReveal id={newRoyal} onContinue={()=>setProgress(old=>({
    ...old,seenRoyalIds:[...(old.seenRoyalIds||[]),newRoyal]
  }))}/>:null;
  const screen=(()=>{
  if(view==='quick')return <div className="oj-shell oj-quick">
    <button type="button" className="oj-back" onClick={()=>setView('journey')}>‹ JOURNEY MENU</button>
    <OverswingPlay s={quickState} act={quickAct} restart={quickRestart} fullView={fullView}/>
  </div>;
  if(!run||view==='menu'||view==='map')return <main className="oj-shell oj-home oj-map-home">
    <header className="oj-title"><span className="oj-flame" aria-hidden="true">♨</span>
      <p className="oj-eyebrow">THE LAST FLAME · CAMPAIGN</p><h1>OVER<span>SWING</span></h1>
      <p className="oj-subtitle">FOLLOW THE FLAME TRAIL</p></header>
    <GoldProgress progress={progress}/>
    <OverswingCampaignMap progress={progress} selected={selectedLevel}
      onSelect={setSelectedLevel} onStart={()=>begin(selectedLevel)}
      onQuick={()=>setView('quick')}
      activeRun={run&&!['won','lost','abandoned'].includes(run.phase)?()=>setView('journey'):null}/>
    <p className="oj-record">Runs {progress.totalRuns} · Victories {progress.wins} · Best {fmt(progress.bestRunScore)}</p>
  </main>;
  if(run.phase==='playing')return <div className="oj-shell oj-playing">
    <OverswingPlay s={run.encounter.engineState} act={play} journey={run} fullView={fullView}
      onBack={()=>setView('menu')}/>
    <div className="oj-exit-row"><button type="button" onClick={()=>setView('menu')}>LEAVE BOARD</button></div>
  </div>;
  if(run.phase==='choosing_relic')return <main className="oj-shell oj-reward">
    <div className="oj-panel">
      <p className="oj-eyebrow">LEVEL {run.levelNumber||1} · GATE {run.encounterIndex+1} OF 3 CLEARED</p>
      <h2>FLAME RESTORED</h2>
      <p className="oj-gate-score">{fmt(run.completedEncounters.at(-1).finalScore)} <small>/ {fmt(run.completedEncounters.at(-1).target)} REQUIRED</small></p>
      <Route run={run}/>
      <h3>RELIC SHOP</h3>
      <div className="oj-shop-wallet">
        <span>AVAILABLE GOLD <strong>{fmt(journeyGoldBalance(run))} G</strong></span>
        <span>RELIC PRICE <strong>{fmt(journeyRelicPrice(run))} G</strong></span>
      </div>
      <p>Each relic costs 20% of the next gate's target. Buy one or save your Gold.</p>
      <div className="oj-relic-options">{run.offeredRelicIds.map(id=>
        <Relic id={id} key={id} price={journeyRelicPrice(run)}
          affordable={journeyGoldBalance(run)>=journeyRelicPrice(run)}
          onClick={()=>buy(id)}/>)}</div>
      <button className="oj-shop-skip oj-secondary" type="button" onClick={skip}>
        SKIP · SAVE GOLD
      </button>
      <p className="oj-hint">Relics cost Treasury Gold. Purchases lower net run score, but never undo a cleared gate or reduce lifetime Royal progress.</p>
    </div>
  </main>;
  if(run.phase==='retry_offer')return <RetryOffer run={run} onRetry={buyRetry} onDecline={acceptDefeat}/>;
  if(['won','lost','abandoned'].includes(run.phase))return <main className="oj-shell">
    <Recap run={run} progress={progress} onNew={()=>setView('map')} onMenu={()=>setView('map')}/>
  </main>;
  return null;
  })();
  return <>{screen}{reveal}</>;
}
