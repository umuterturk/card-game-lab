import React,{useEffect,useState} from 'react';
import {CAMPAIGN_LEVELS,campaignNextLevel,campaignRuleLabels} from './overswingCampaign.js';
import './overswingCampaignMap.css';
import DoomFire from './DoomFire.jsx';

// Six visible stops per page: a compact portrait winding path, not a scrolling list.
const PAGE_SIZE=6;
export default function OverswingCampaignMap({progress,selected,onSelect,onStart,onQuick,activeRun}){
  const cleared=progress.clearedChapterIds||[];
  const next=campaignNextLevel(cleared);
  const [page,setPage]=useState(()=>Math.floor((next-1)/PAGE_SIZE));
  useEffect(()=>setPage(Math.floor((selected-1)/PAGE_SIZE)),[selected]);
  const level=CAMPAIGN_LEVELS[selected-1];
  const levels=CAMPAIGN_LEVELS.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
  const clearSet=new Set(cleared);
  if(clearSet.has('last_flame_v1'))clearSet.add(CAMPAIGN_LEVELS[0].id);
  return <section className="ocm" aria-label="Overswing campaign level map">
    <div className="ocm-heading">
      <span>THE FLAME TRAIL</span><strong>{CAMPAIGN_LEVELS.filter(level=>clearSet.has(level.id)).length} / {CAMPAIGN_LEVELS.length} CLEARED</strong>
    </div>
    <div className="ocm-map" role="group" aria-label={'Chapter '+(page+1)+' of 2'}>
      <DoomFire className="ocm-map-doom-fire" width={88} height={38}/>
      <svg aria-hidden="true" className="ocm-path" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M22 88 L78 73 L22 58 L78 43 L22 28 L78 13" fill="none" stroke="#5b4431" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3"/>
        <path d="M22 88 L78 73 L22 58 L78 43 L22 28 L78 13" fill="none" stroke="#d28d3d" strokeWidth=".7" strokeLinecap="round"/>
      </svg>
      {levels.map((item,i)=>{
        const clearedHere=clearSet.has(item.id),unlocked=item.number<=next||clearedHere;
        return <button key={item.id} type="button"
          className={'ocm-node'+(clearedHere?' ocm-cleared':'')+(item.number===next?' ocm-next':'')+(item.number===selected?' ocm-selected':'')}
          style={{left:(i%2===0?22:78)+'%',top:(88-15*i)+'%'}}
          disabled={!unlocked}
          onClick={()=>onSelect(item.number)}
          aria-pressed={selected===item.number}
          aria-label={'Level '+item.number+' '+item.title+(clearedHere?' cleared':unlocked?' available':' locked')}>
          <span>{clearedHere?'★':unlocked?item.number:'🔒'}</span>
        </button>;
      })}
    </div>
    <div className="ocm-pages">
      <button disabled={page===0} onClick={()=>setPage(n=>n-1)} type="button">‹ PREV</button>
      <span>PATH {page+1} / {Math.ceil(CAMPAIGN_LEVELS.length/PAGE_SIZE)}</span>
      <button disabled={page===Math.ceil(CAMPAIGN_LEVELS.length/PAGE_SIZE)-1} onClick={()=>setPage(n=>n+1)} type="button">NEXT ›</button>
    </div>
    <div className="ocm-detail" aria-live="polite">
      <div className="ocm-level-head"><small>LEVEL {level.number} / {CAMPAIGN_LEVELS.length}</small>
        <strong>{level.title}</strong></div>
      <p>{level.subtitle} · 3 gates · Target ×{level.targetScale.toFixed(2)}</p>
      <div className="ocm-rules">{campaignRuleLabels(level).map(t=><span key={t}>{t}</span>)}</div>
    </div>
    <div className="oj-choices ocm-actions">
      {activeRun&&<button className="oj-secondary" type="button" onClick={activeRun}>RESUME CURRENT JOURNEY</button>}
      <button className="oj-primary" type="button" onClick={onStart}>PLAY LEVEL {selected}</button>
      <button className="oj-secondary" type="button" onClick={onQuick}>QUICK PLAY · TUTORIAL</button>
    </div>
  </section>;
}
