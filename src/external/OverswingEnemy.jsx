import React from 'react';
import {opponentForLevel} from './overswingEnemies.js';
import './overswingEnemy.css';
export function enemyArtUrl(level){
  return (import.meta.env?.BASE_URL||'/')+opponentForLevel(level).art;
}
export function EnemyPortrait({level,className='',alt}){
  return <img className={'oe-portrait '+className} src={enemyArtUrl(level)}
    alt={alt??opponentForLevel(level).name+' — infernal opponent'} draggable="false"/>;
}
export default function OverswingEnemyIntro({level,closing,onContinue}){
  const enemy=opponentForLevel(level);
  return <div className={'oe-intro'+(closing?' oe-intro-exit':'')}
    role="dialog" aria-modal="true" aria-label={'Level '+level+' opponent: '+enemy.name}>
    <div className="oe-intro-night" aria-hidden="true"/>
    <EnemyPortrait level={level} className="oe-intro-art" alt=""/>
    <div className="oe-intro-vignette" aria-hidden="true"/>
    <div className="oe-intro-embers" aria-hidden="true">
      {Array.from({length:22},(_,i)=><i key={i} style={{
        left:(3+(i*43)%94)+'%',top:(10+(i*29)%82)+'%',
        animationDelay:(i*.31)+'s',animationDuration:(3+i%5)+'s'
      }}/>)}
    </div>
    <div className="oe-intro-words">
      <small>LEVEL {level} · THREE GATES</small>
      <h2>{enemy.name}</h2>
      <p>{enemy.line}</p>
    </div>
    <button type="button" className="oe-intro-continue"
      onClick={onContinue} disabled={closing} autoFocus>
      TAP TO PREPARE <span aria-hidden="true">›</span>
    </button>
  </div>;
}
