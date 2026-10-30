import React, {useEffect,useMemo,useState} from 'react';
import {createPrototype,prototypeActions,prototypeStep,prototypeView} from './engines.js';
import './prototype.css';

const riskTypes = new Set(['blind','pulse','seal','stoke','surge','overload','press','dare','fire','dive','risk','pledge']);
const STORE_PREFIX='card-game-lab.run.v2.';
function load(id){try{const saved=JSON.parse(localStorage.getItem(STORE_PREFIX+id));if(saved?.id===id&&typeof saved.finished==='boolean'&&Array.isArray(saved.deck)&&Array.isArray(saved.hand))return saved;}catch{}return createPrototype(id);}
function ActionButton({action,onClick,warning=false}){return <button className={`pg-action ${warning?'pg-risk':''}`} type="button" onClick={()=>onClick(action)}><span>{action.label}</span><span aria-hidden="true">↗</span></button>;}
function BoardZone({zone,index,valid,onClick}){return <button type="button" className={`pg-zone ${valid?'pg-zone-selectable':''}`} disabled={!valid} onClick={onClick}><span className="pg-zone-label">{zone.title}</span><div className="pg-zone-cards">{zone.values.length?zone.values.map((v,i)=><span key={i} className={`pg-tile ${String(v).includes('FATE')?'pg-tile-fate':''}`}>{v}</span>):<span className="pg-empty">Empty</span>}</div><span className="pg-zone-detail">{zone.detail}</span>{valid&&<span className="pg-zone-hint">Tap to place selected card</span>}</button>;}
export default function PrototypePlay({game}){
 const [s,setS]=useState(()=>load(game.id));
 const [selected,setSelected]=useState(null);
 const [confirm,setConfirm]=useState(null);
 const [showRules,setShowRules]=useState(false);
 const actions=useMemo(()=>prototypeActions(s),[s]);
 const view=useMemo(()=>prototypeView(s),[s]);
 useEffect(()=>{try{localStorage.setItem(STORE_PREFIX+game.id,JSON.stringify(s));}catch{}},[s,game.id]);
 const choices=actions.filter(a=>a.card===selected);
 const globalActions=actions.filter(a=>a.card===undefined);
 const onAction=action=>{if(riskTypes.has(action.type)){setConfirm(action);return;}apply(action);};
 const apply=action=>{setS(old=>prototypeStep(old,action));setConfirm(null);setSelected(null);};
 const restart=()=>{setS(createPrototype(game.id));setSelected(null);setConfirm(null);};
 const handleZone=(index)=>{const possible=choices.filter(a=>a.target===index);if(possible.length===1)onAction(possible[0]);};
 return <div className="pg-screen">
  <div className="pg-heading"><div><span className="eyebrow">PLAYABLE PROTOTYPE · {game.id}</span><h1>{game.name}</h1></div><button className="pg-restart" onClick={restart} type="button">↻ New run</button></div>
  <div className="pg-scoreboard"><div><span>BANKED</span><strong>{view.score.toLocaleString()}</strong></div><div><span>CURRENT POT</span><strong>{view.pot.toLocaleString()}</strong></div><div><span>DRAW PILE</span><strong>{view.deck}</strong></div></div>
  {view.stats.length>0&&<div className="pg-resources">{view.stats.map(x=><div key={x.key}><span>{x.key}</span><strong>{x.value}</strong></div>)}</div>}
  <p className="pg-intro">{game.loop}</p>
  <div className={`pg-board pg-board-${game.id}`} aria-label="Game board">{view.zones.map((zone,index)=>{const placements=choices.filter(a=>a.target===index);return <BoardZone key={index} zone={zone} index={index} valid={placements.length===1&&!s.finished} onClick={()=>handleZone(index)}/>;})}</div>
  <div className="pg-notice" role="status" aria-live="polite">{s.notice}</div>
  {!s.finished?<>
   <section className="pg-hand"><div className="pg-section-header"><h2>Choose a card</h2><span>{s.hand.length} in hand</span></div><div className="pg-hand-cards">{s.hand.map((v,i)=>{const value=typeof v==='object'?v.value:v;return <button key={i} type="button" aria-label={`Select card ${value}${v?.fate?' Fate':''}`} aria-pressed={selected===i} className={`pg-hand-card ${selected===i?'pg-selected':''} ${v?.fate?'pg-is-fate':''}`} onClick={()=>setSelected(x=>x===i?null:i)}><strong>{value}</strong>{v?.fate&&<small>FATE</small>}</button>;})}</div></section>
   {selected!==null&&<section className="pg-action-group"><div className="pg-section-header"><h2>Play card {typeof s.hand[selected]==='object'?s.hand[selected]?.value:s.hand[selected]}</h2><button type="button" className="pg-clear" onClick={()=>setSelected(null)}>Cancel</button></div><div className="pg-action-list">{choices.length?choices.map((a,i)=><ActionButton key={i} action={a} onClick={onAction} warning={riskTypes.has(a.type)}/>):<p className="pg-muted">No moves for this card. Select another card or use an available board action.</p>}</div></section>}
   {globalActions.length>0&&<section className="pg-action-group"><div className="pg-section-header"><h2>Board actions</h2><span>Bank or take a risk</span></div><div className="pg-action-list">{globalActions.map((a,i)=><ActionButton key={i} action={a} onClick={onAction} warning={riskTypes.has(a.type)}/>)}</div></section>}
   {selected===null&&!globalActions.length&&<p className="pg-muted">Select a card above to see its legal moves.</p>}
  </>:<section className="pg-finish"><span>RUN FINISHED</span><strong>{s.score.toLocaleString()} points</strong><p>All available cards have been used. Start a fresh run to try a different strategy.</p><button type="button" className="primary-btn" onClick={restart}>Play again ↻</button></section>}
  {confirm&&<div className="pg-dialog-backdrop" role="presentation"><div className="pg-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pg-confirm-title" aria-describedby="pg-confirm-description"><span className="eyebrow">VOLUNTARY RISK</span><h2 id="pg-confirm-title">Take this risk?</h2><p id="pg-confirm-description">{confirm.label}. A hidden draw can destroy your current load or unbanked score. Previously banked points remain safe.</p><div className="pg-dialog-actions"><button type="button" className="pg-cancel" onClick={()=>setConfirm(null)}>Keep planning</button><button type="button" className="pg-accept" onClick={()=>apply(confirm)}>Take the risk</button></div></div></div>}
  <details className="pg-rules" open={showRules} onToggle={e=>setShowRules(e.currentTarget.open)}><summary>Rules & scoring</summary><p><strong>The board:</strong> {game.components}</p><p><strong>How to play:</strong> {game.loop}</p><p><strong>Risk:</strong> {game.risk}</p><p>Use your finite deck and decide when to secure points. The rules and scores shown here follow the original experiment; the published simulated results are separate from this browser run.</p><a href={`${import.meta.env.BASE_URL}${game.report.replace(/^\//,'')}`} target="_blank" rel="noopener noreferrer">Read experiment report ↗</a></details>
  {s.history.length>0&&<details className="pg-history"><summary>Recent actions ({s.history.length})</summary><ol>{s.history.map((message,i)=><li key={i}>{message}</li>)}</ol></details>}
  <p className="play-disclaimer">Browser prototype · Your current run is saved on this device · No purchases or accounts</p>
 </div>;
}
