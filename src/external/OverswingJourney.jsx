import React,{useEffect,useState} from 'react';
import OverswingPlay from './OverswingPlay.jsx';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {
  startJourney,stepJourney,isValidJourney,recordJourneyProgress,
  EMPTY_JOURNEY_PROGRESS,validJourneyProgress,journeyRunScore
} from './overswingJourney.js';
import './overswingJourney.css';

const RUN_KEY='card-game-lab.overswing.journey.v1';
const PROFILE_KEY='card-game-lab.overswing.journey-profile.v1';
const fmt=n=>Number(n).toLocaleString('en-US');

function readSaved(key){
  try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}
}
function Relic({id,selected=false,used=false,onClick}){
  const r=LAST_FLAME_RELICS[id];
  if(!r)return null;
  const content=<><span className="oj-relic-symbol" aria-hidden="true">{r.symbol}</span>
    <span className="oj-relic-copy"><strong>{r.title}</strong>
      <small>{r.description}</small>{used&&<em>USED THIS GATE</em>}</span>
    {onClick&&<span className="oj-relic-pick">TAKE</span>}</>;
  return onClick?
    <button className={'oj-relic '+(selected?'oj-relic-selected':'')} type="button" onClick={onClick}>{content}</button>:
    <div className={'oj-relic '+(used?'oj-relic-used':'')}>{content}</div>;
}
function Route({run,compact=false}){
  const current=run?.encounterIndex??0;
  return <div className={'oj-route '+(compact?'oj-route-compact':'')} aria-label="Three-gate journey">
    {LAST_FLAME.encounters.map((e,index)=><React.Fragment key={e.id}>
      {index>0&&<div className="oj-route-line" aria-hidden="true"/>}
      <div className={'oj-route-node '+(index===current?'oj-route-current':'')+(index<current?' oj-route-done':'')}>
        <span className="oj-route-icon">{e.symbol}</span>
        {!compact&&<><strong>{e.title}</strong><small>{fmt(e.target)}+ POINTS</small></>}
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
    <p>{won?'The Ember Keeper has fallen. The furnace burns again.':
      run.phase==='abandoned'?'You left the furnace. Your collected knowledge remains.':
      'The gate demanded more fire than you could bank.'}</p>
    <div className="oj-recap-total"><small>RUN SCORE</small><strong>{fmt(journeyRunScore(run))}</strong></div>
    <div className="oj-recap-rows">{run.completedEncounters.map(row=>
      <div key={row.id}><span>{LAST_FLAME.encounters.find(e=>e.id===row.id)?.title}</span>
        <strong className={row.passed?'oj-passed':'oj-failed'}>{fmt(row.finalScore)} / {fmt(row.target)}</strong></div>)}</div>
    {run.relicIds.length>0&&<><p className="oj-eyebrow">YOUR RELICS</p>
      <div className="oj-owned-relics">{run.relicIds.map(id=><Relic id={id} key={id}/>)}</div></>}
    <p className="oj-record">Your record · {progress.wins} victories · Best {fmt(Math.max(progress.bestRunScore,journeyRunScore(run)))}</p>
    <div className="oj-choices"><button className="oj-primary" onClick={onNew}>TRY AGAIN</button>
      <button className="oj-secondary" onClick={onMenu}>MENU</button></div>
  </div>;
}
export default function OverswingJourney({quickState,quickAct,quickRestart,fullView=false}){
  const [view,setView]=useState('journey');
  const [run,setRun]=useState(()=>{
    const candidate=readSaved(RUN_KEY);return isValidJourney(candidate)?candidate:null;
  });
  const [progress,setProgress]=useState(()=>{
    const data=readSaved(PROFILE_KEY);
    return validJourneyProgress(data)?data:EMPTY_JOURNEY_PROGRESS;
  });
  useEffect(()=>{try{
    if(run)localStorage.setItem(RUN_KEY,JSON.stringify(run));
    else localStorage.removeItem(RUN_KEY);
  }catch{}},[run]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(progress));}catch{}},[progress]);
  useEffect(()=>{
    if(run&&['won','lost','abandoned'].includes(run.phase)){
      setProgress(current=>recordJourneyProgress(current,run));
    }
  },[run?.phase,run?.runId]);
  const begin=()=>{setRun(startJourney(Date.now()));setView('journey');};
  const play=action=>setRun(current=>current?stepJourney(current,{type:'PLAY',action}):current);
  const choose=relicId=>setRun(current=>current?stepJourney(current,{type:'CHOOSE_RELIC',relicId}):current);
  const abandon=()=>setRun(current=>current?stepJourney(current,{type:'ABANDON'}):current);
  if(view==='quick')return <div className="oj-shell oj-quick">
    <button type="button" className="oj-back" onClick={()=>setView('journey')}>‹ JOURNEY MENU</button>
    <OverswingPlay s={quickState} act={quickAct} restart={quickRestart} fullView={fullView}/>
  </div>;
  if(!run)return <main className="oj-shell oj-home">
    <header className="oj-title"><span className="oj-flame" aria-hidden="true">♨</span>
      <p className="oj-eyebrow">A FLAMEBOUND CARD ROGUELITE</p><h1>OVER<span>SWING</span></h1>
      <p className="oj-subtitle">THE LAST FLAME</p></header>
    <div className="oj-home-illustration" aria-hidden="true"><span>♨</span><i/><i/><i/></div>
    <Route/>
    <p className="oj-home-copy">Three gates. Two relics. One last flame.<br/>Risk your Pot, master the swing, and survive the Keeper.</p>
    <div className="oj-choices"><button className="oj-primary" onClick={begin}>IGNITE THE JOURNEY</button>
      <button className="oj-secondary" onClick={()=>setView('quick')}>QUICK PLAY · TUTORIAL</button></div>
    <p className="oj-record">Runs {progress.totalRuns} · Victories {progress.wins} · Best {fmt(progress.bestRunScore)}</p>
  </main>;
  if(view==='menu')return <main className="oj-shell oj-home">
    <header className="oj-title"><span className="oj-flame" aria-hidden="true">♨</span>
      <p className="oj-eyebrow">THE LAST FLAME</p><h1>OVER<span>SWING</span></h1>
      <p className="oj-subtitle">YOUR JOURNEY</p></header>
    <Route run={run}/>
    <div className="oj-choices">
      {!['won','lost','abandoned'].includes(run.phase)&&
        <button className="oj-primary" onClick={()=>setView('journey')}>RESUME JOURNEY</button>}
      <button className="oj-secondary" onClick={begin}>NEW JOURNEY</button>
      <button className="oj-secondary" onClick={()=>setView('quick')}>QUICK PLAY · TUTORIAL</button>
      {(run.phase==='playing'||run.phase==='choosing_relic')&&
        <button className="oj-secondary oj-abandon" onClick={abandon}>ABANDON CURRENT RUN</button>}
      {['won','lost','abandoned'].includes(run.phase)&&
        <button className="oj-secondary" onClick={()=>setView('journey')}>VIEW LAST RESULT</button>}
    </div>
    <p className="oj-record">Runs {progress.totalRuns} · Victories {progress.wins} · Best {fmt(progress.bestRunScore)}</p>
  </main>;
  if(run.phase==='playing')return <div className="oj-shell oj-playing">
    <OverswingPlay s={run.encounter.engineState} act={play} journey={run} fullView={fullView}
      onBack={()=>setView('menu')}/>
    <div className="oj-exit-row"><button type="button" onClick={()=>setView('menu')}>LEAVE BOARD</button></div>
  </div>;
  if(run.phase==='choosing_relic')return <main className="oj-shell oj-reward">
    <div className="oj-panel">
      <p className="oj-eyebrow">GATE {run.encounterIndex+1} OF 3 CLEARED</p>
      <h2>FLAME RESTORED</h2>
      <p className="oj-gate-score">{fmt(run.completedEncounters.at(-1).finalScore)} <small>/ {fmt(run.completedEncounters.at(-1).target)} REQUIRED</small></p>
      <Route run={run}/>
      <h3>CHOOSE YOUR RELIC</h3>
      <p>Carry one power into the remaining gates. This choice lasts for this run.</p>
      <div className="oj-relic-options">{run.offeredRelicIds.map(id=><Relic id={id} key={id} onClick={()=>choose(id)}/>)}</div>
      <p className="oj-hint">One choice. No reroll. Relics recharge at the start of each gate.</p>
    </div>
  </main>;
  if(['won','lost','abandoned'].includes(run.phase))return <main className="oj-shell">
    <Recap run={run} progress={progress} onNew={begin} onMenu={()=>setView('menu')}/>
  </main>;
  return null;
}
