import React, {useMemo,useState} from 'react';
import {LEVELS, WAVE_NAMES, legalMoves, playMove, selectableMoves, solvePuzzle, statusOf} from './puzzle.js';
import './style.css';

const WAVE_LENGTH=5;
const saveKey='bee-hop.best-level.v2';
const readProgress=()=>{
  try {
    const raw=localStorage.getItem(saveKey) || localStorage.getItem('bee-hop.best-level.v1');
    const n=Number(raw);
    return Number.isInteger(n) && n>0 ? Math.min(LEVELS.length,n) : 1;
  } catch{return 1;}
};
const roundFor=l=>({bee:l.bee,pollen:[...l.pollen],history:[],turns:0});
const label=(cell,w)=>`row ${Math.floor(cell/w)+1}, column ${cell%w+1}`;
const num=n=>String(n).padStart(2,'0');

function Flower(){
 return <svg className="bh-flower" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="17" r="11" fill="#f6c94b"/>
  <circle cx="46" cy="24" r="11" fill="#ffdf71"/>
  <circle cx="43" cy="42" r="11" fill="#f6c94b"/>
  <circle cx="21" cy="42" r="11" fill="#ffd865"/>
  <circle cx="18" cy="24" r="11" fill="#ffeb8a"/>
  <circle cx="32" cy="32" r="11" fill="#ac6d31"/>
  <circle cx="29" cy="29" r="3" fill="#f1b252"/>
 </svg>;
}
function Bee(){
 return <svg className="bh-bee" viewBox="0 0 90 90" aria-hidden="true">
  <ellipse cx="35" cy="31" rx="19" ry="13" fill="#eefaff" fillOpacity=".95" transform="rotate(-34 35 31)"/>
  <ellipse cx="56" cy="29" rx="18" ry="12" fill="#e4faff" fillOpacity=".85" transform="rotate(28 56 29)"/>
  <ellipse cx="45" cy="52" rx="27" ry="23" fill="#ffc748" stroke="#774522" strokeWidth="3"/>
  <path d="M31 33Q39 51 32 71M51 31Q61 47 57 69" fill="none" stroke="#7c4b26" strokeWidth="10"/>
  <circle cx="37" cy="45" r="3" fill="#30261d"/><circle cx="57" cy="45" r="3" fill="#30261d"/>
  <path d="M42 55Q47 60 52 55" stroke="#66391c" fill="none" strokeWidth="2.5" strokeLinecap="round"/>
  <path d="M35 30L30 21M57 30L63 21" stroke="#754a24" strokeWidth="3" strokeLinecap="round"/>
 </svg>;
}
function formatCount(n){
  const v=BigInt(n);
  return v>9999999n?`${(Number(v)/1e6).toFixed(1)}m`:Number(v).toLocaleString('en-US');
}
export default function BeeHop(){
 const [index,setIndex]=useState(0);
 const level=LEVELS[index];
 const wave=Math.floor(index/WAVE_LENGTH),first=wave*WAVE_LENGTH;
 const [round,setRound]=useState(()=>roundFor(LEVELS[0]));
 const [hint,setHint]=useState(null);
 const [selectedPollen,setSelectedPollen]=useState(null);
 const [help,setHelp]=useState(false);
 const [analysis,setAnalysis]=useState(false);
 const [zoom,setZoom]=useState(false);
 const [unlocked,setUnlocked]=useState(readProgress);
 const state=useMemo(()=>({width:level.width,height:level.height,...round}),[level,round]);
 const moves=useMemo(()=>legalMoves(state),[state]);
 const targets=useMemo(()=>new Set(moves.map(m=>m.over)),[moves]);
 // Every legal landing is immediately usable. Pollen selection only filters.
 const destinations=useMemo(()=>new Map(selectableMoves(moves,selectedPollen).map(m=>[m.to,m])),[moves,selectedPollen]);
 const status=statusOf(state),collected=level.pollen.length-round.pollen.length;
 const boardWidth=level.width+.5;
 const boardHeight=1+(level.height-1)*.75;
 const boardAspect=boardWidth/(boardHeight*2/Math.sqrt(3));
 const boardStyle={aspectRatio:boardAspect,'--hex-w':`${100/boardWidth}%`,'--hex-h':`${100/boardHeight}%`,
   width:zoom?'max(100%, 690px)':'100%',maxWidth:zoom?'none':'550px'};
 const cellStyle=cell=>{
   const r=Math.floor(cell/level.width),c=cell%level.width;
   return {left:`${(c+(r%2)*.5)/boardWidth*100}%`,top:`${r*.75/boardHeight*100}%`};
 };
 function selectLevel(next){
  if(next<0||next>=LEVELS.length)return;
  setIndex(next);setRound(roundFor(LEVELS[next]));setHint(null);setSelectedPollen(null);setZoom(false);
 }
 function land(move){
  if(!move||status!=='playing')return;
  const next=playMove(state,move);if(next===state)return;
  setRound({bee:next.bee,pollen:next.pollen,history:[...round.history,{bee:round.bee,pollen:round.pollen}],turns:round.turns+1});
  setHint(null);setSelectedPollen(null);
  if(next.pollen.length===0&&index+2>unlocked){
   const progress=Math.min(LEVELS.length,index+2);
   setUnlocked(progress);
   try{localStorage.setItem(saveKey,String(progress));}catch{}
  }
 }
 function undo(){
  if(!round.history.length)return;
  const prev=round.history.at(-1);
  setRound({bee:prev.bee,pollen:prev.pollen,history:round.history.slice(0,-1),turns:Math.max(0,round.turns-1)});
  setHint(null);setSelectedPollen(null);
 }
 function askHint(){
  const result=solvePuzzle(state,{maxStates:100000});
  setHint(result.solvable?result.moves[0].to:'no-solution');
  setSelectedPollen(result.solvable?result.moves[0].over:null);
 }
 return <div className="bh-app"><div className="bh-shell">
   <header className="bh-topbar">
    <a className="bh-back" href="./index.html" aria-label="Back to Card Game Lab">‹</a>
    <div className="bh-brand"><span className="bh-brand-mark">✿</span> BEE HOP <span className="bh-proto">40 LEVELS</span></div>
    <button className="bh-icon-button" onClick={()=>setHelp(x=>!x)} type="button" aria-label="How to play">?</button>
   </header>
   <section className="bh-heading">
    <div><span className="bh-eyebrow">{wave===0?'ONBOARDING':`WAVE ${wave}`} · LEVEL {num(level.id)} {level.boss?'· BOSS':''}</span>
     <h1>{level.name}</h1><p>One bee. Every jump collects pollen.</p></div>
    <div className={`bh-level-badge ${level.boss?'bh-boss':''}`}><span>{level.boss?'BOSS':'LEVEL'}</span><strong>{num(level.id)}</strong></div>
   </section>
   <div className="bh-wave-navigation" aria-label="Wave navigation">
    <button type="button" disabled={wave===0} onClick={()=>selectLevel((wave-1)*WAVE_LENGTH)} aria-label="Previous wave">‹</button>
    <span><strong>{WAVE_NAMES[wave]}</strong><small>{wave===0?'Linear tutorial':`Wave ${wave} of 7 · Boss at level ${(wave+1)*5}`}</small></span>
    <button type="button" disabled={wave===7} onClick={()=>selectLevel((wave+1)*WAVE_LENGTH)} aria-label="Next wave">›</button>
   </div>
   <div className="bh-level-tabs" aria-label="Levels in this wave">
    {LEVELS.slice(first,first+5).map((record,i)=><button key={record.id} className={`${first+i===index?'active':''} ${record.boss?'boss':''}`} type="button" aria-label={`Level ${record.id}${record.boss?', boss':''}`} aria-pressed={first+i===index} onClick={()=>selectLevel(first+i)}>{record.boss?'◆ ':''}{record.id}</button>)}
   </div>
   <div className="bh-progress-card">
    <div className="bh-progress-copy"><div><span className="bh-progress-icon">✿</span><span>POLLEN COLLECTED</span></div><strong>{collected} <small>/ {level.pollen.length}</small></strong></div>
    <div className="bh-progress-track"><div style={{width:`${100*collected/level.pollen.length}%`}}/></div>
    <span className="bh-progress-sub">{level.boss?'Boss puzzle · Plan ahead before your first jump':'Collect every flower without getting stranded'}</span>
   </div>
   {help&&<section className="bh-help"><strong>How to play</strong><p>Jump in <b>six straight directions</b> along the honeycomb. Every move crosses exactly one pollen flower. Tap any <b>green landing hex</b> to jump. You can also select a pollen flower first to filter landing choices. You may pass over empty hexes before a flower, then land on any empty hex beyond it. Collect all pollen to win.</p></section>}
   <section className="bh-board-section">
    <div className="bh-board-top"><span>THE HONEYCOMB</span><span>{level.width} × {level.height} · SIX DIRECTIONS</span></div>
    <div className="bh-board-outer">
     <div className="bh-board-scroll"><div className="bh-board" style={boardStyle} role="group" aria-label={`${level.width} by ${level.height} honeycomb puzzle with six directions`}>
      {Array.from({length:level.width*level.height},(_,cell)=>{
       const move=destinations.get(cell),bee=state.bee===cell,pollen=state.pollen.includes(cell);
       const target=targets.has(cell)&&status==='playing',highlighted=move!=null&&status==='playing';
       const selected=selectedPollen===cell;
       return <button key={`${level.id}-${cell}`} type="button" style={cellStyle(cell)}
         className={`bh-cell ${bee?'is-bee':''} ${pollen?'is-pollen':''} ${target?'is-target':''} ${selected?'is-selected':''} ${highlighted?'is-landing':''} ${hint===cell&&highlighted?'is-hint':''}`}
         disabled={!target&&!highlighted&&!(bee&&status==='playing')}
         onClick={()=>target?(setSelectedPollen(selected?null:cell),setHint(null)):bee?(setSelectedPollen(null),setHint(null)):land(move)}
         aria-pressed={target?selected:undefined}
         aria-label={bee?`Bee at ${label(cell,level.width)}, tap to see all landings`:target?`Select pollen at ${label(cell,level.width)}`:pollen?`Pollen at ${label(cell,level.width)}`:highlighted?`Land at ${label(cell,level.width)}, capturing pollen`:`Empty ${label(cell,level.width)}`}>
         {bee?<Bee/>:pollen?<Flower/>:highlighted?<span className="bh-landing-dot"/>:null}
       </button>;
      })}
     </div></div>
     {level.width>=8&&<button className="bh-zoom-control" type="button" onClick={()=>setZoom(x=>!x)}>{zoom?'Fit board to screen':'Enlarge board for easier taps'}</button>}
    </div>
    <div className="bh-board-note">{status==='won'?'All pollen collected!':status==='stuck'?'No legal jumps remain. Undo or restart.':hint==='no-solution'?'No winning route from here. Undo a move.':hint!==null?'Golden landing shows one winning move.':selectedPollen!==null?'Choose a green landing, or tap the bee to reset the filter.':'Tap any green landing hex to fly.'}</div>
   </section>
   {status==='won'&&<div className="bh-result bh-win"><span>✦ PERFECT CLEAR ✦</span><strong>Sweet success!</strong><p>Every flower collected in {round.turns} jumps.</p><button type="button" onClick={()=>selectLevel(index===39?0:index+1)}>{index===39?'Play from the start':'Next level →'}</button></div>}
   {status==='stuck'&&<div className="bh-result bh-loss"><strong>No more jumps</strong><p>Try a different landing position.</p></div>}
   <div className="bh-controls">
    <button type="button" onClick={undo} disabled={!round.history.length}><span>↶</span> Undo</button>
    <button type="button" onClick={()=>{setRound(roundFor(level));setHint(null);setSelectedPollen(null)}}><span>↻</span> Restart</button>
    <button type="button" onClick={askHint} disabled={status!=='playing'} className="bh-hint-button"><span>✧</span> Hint</button>
   </div>
   <details className="bh-analysis" open={analysis} onToggle={e=>setAnalysis(e.currentTarget.open)}>
    <summary>Level design analysis</summary>
    <div className="bh-analysis-grid">
     <div><span>Meaningful paths</span><strong>{formatCount(level.metrics.realPaths)}</strong></div>
     <div><span>Winning routes</span><strong>{formatCount(level.metrics.winningPaths)}</strong></div>
     <div><span>Opening continuations</span><strong>{level.metrics.continuingFirst}</strong></div>
     <div><span>Decision forks</span><strong>{formatCount(level.metrics.forks)}</strong></div>
    </div>
    <p>Exact counts from the initial board. A meaningful path ignores landings with no next move (unless they finish the level). Winning routes count different complete sequences of bee landings. Difficulty index: {level.metrics.difficulty.toFixed(2)}. This number is a design proxy, not a human success prediction.</p>
   </details>
   <div className="bh-bottom-note">40 solver-verified levels · Boss after each wave · Six movement directions</div>
  </div></div>;
}
