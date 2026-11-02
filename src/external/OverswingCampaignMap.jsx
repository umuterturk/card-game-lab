import React from 'react';
import {CAMPAIGN_LEVELS,campaignNextLevel,campaignRuleLabels} from './overswingCampaign.js';
import {opponentForLevel} from './overswingEnemies.js';
import {EnemyPortrait} from './OverswingEnemy.jsx';
import './overswingCampaignMap.css';

export default function OverswingCampaignMap({progress,selected,onSelect,onStart,onQuick,activeRun}){
  const cleared=new Set(progress.clearedChapterIds||[]);
  if(cleared.has('last_flame_v1'))cleared.add(CAMPAIGN_LEVELS[0].id);
  const next=campaignNextLevel([...cleared]);
  const level=CAMPAIGN_LEVELS[selected-1]||CAMPAIGN_LEVELS[0];
  const enemy=opponentForLevel(level.number);
  const completed=CAMPAIGN_LEVELS.filter(item=>cleared.has(item.id)).length;
  return <section className="ocm" aria-label="Overswing opponents">
    <div className="ocm-heading"><span>THE FLAME TRAIL</span>
      <strong>{completed} / {CAMPAIGN_LEVELS.length} DEFEATED</strong></div>
    <div className="ocm-opponent">
      <EnemyPortrait level={level.number} className="ocm-opponent-art"/>
      <div className="ocm-opponent-shade" aria-hidden="true"/>
      <div className="ocm-embers" aria-hidden="true">
        {Array.from({length:10},(_,i)=><i key={i} style={{
          left:(8+i*19%86)+'%',animationDelay:(i*.42)+'s'
        }}/>)}
      </div>
      <div className="ocm-opponent-copy">
        <small>{cleared.has(level.id)?'DEFEATED · REPLAY':level.number===next?'YOUR NEXT OPPONENT':'OPPONENT'}</small>
        <h2>{enemy.name}</h2><p>{enemy.line}</p>
      </div>
    </div>
    <div className="ocm-selector" aria-label="Choose unlocked level">
      <button type="button" onClick={()=>onSelect(selected-1)}
        disabled={selected<=1} aria-label="Previous unlocked level">‹</button>
      <div><strong>LEVEL {level.number} <span>/ {CAMPAIGN_LEVELS.length}</span></strong>
        <small>{level.title} · THREE GATES</small></div>
      <button type="button" onClick={()=>onSelect(selected+1)}
        disabled={selected>=Math.min(next,CAMPAIGN_LEVELS.length)}
        aria-label="Next unlocked level">›</button>
    </div>
    
    <div className="oj-choices ocm-actions">
      {activeRun&&<button className="oj-secondary" type="button" onClick={activeRun}>RESUME CURRENT FIGHT</button>}
      <button className="oj-primary" type="button" onClick={onStart}>PREPARE · LEVEL {level.number}</button>
      <button className="oj-secondary" type="button" onClick={onQuick}>QUICK PLAY · TUTORIAL</button>
    </div>
  </section>;
}
