import React from 'react';
import {opponentForLevel} from './overswingEnemies.js';
import './overswingEnemy.css';
// Vite builds for GitHub Pages with base='./'. Resolve images against the
// DOCUMENT, not against the generated stylesheet in /assets/. An inline CSS
// var(url('./enemies/...')) otherwise points to /assets/enemies (404).
export function enemyArtUrl(level){
  const relative=(import.meta.env?.BASE_URL||'./')+opponentForLevel(level).art;
  return typeof document==='undefined'?relative:new URL(relative,document.baseURI).href;
}
export function enemyFallbackUrl(){
  const relative=(import.meta.env?.BASE_URL||'./')+'enemies/hell-enforcer.webp';
  return typeof document==='undefined'?relative:new URL(relative,document.baseURI).href;
}
export function EnemyPortrait({level,className='',alt}){
  const enemy=opponentForLevel(level);
  const [failedLoads,setFailedLoads]=React.useState(0);
  React.useEffect(()=>setFailedLoads(0),[level]);
  const slot=enemy.slot;
  const fallback=failedLoads>0;
  const src=fallback?enemyFallbackUrl():enemyArtUrl(level);
  const position=fallback?{left:'0%',top:'0%'}:{
    left:(slot%2===0?0:-100)+'%',
    top:(-100*Math.floor(slot/2))+'%'
  };
  return <div className={'oe-portrait '+className}
    role={alt===''?'presentation':'img'}
    aria-label={alt===''?undefined:alt??enemy.name+' — infernal opponent'}>
    {failedLoads>=2?<span className="oe-portrait-missing">{enemy.name}</span>:
      <img key={src} className={'oe-portrait-atlas'+(fallback?' oe-portrait-fallback':'')}
        src={src} style={position} alt="" draggable="false"
        decoding="async" onError={()=>setFailedLoads(count=>Math.min(2,count+1))}/>}
  </div>;
}
export default function OverswingEnemyIntro({level,closing=false,onContinue,onBack,prepared=false,children=null}){
  const enemy=opponentForLevel(level);
  return <div className={'oe-intro'+(closing?' oe-intro-exit':'')+(prepared?' oe-intro-prepared':'')}
    role="dialog" aria-modal="true" aria-label={'Level '+level+' opponent: '+enemy.name}>
    <div className="oe-intro-night" aria-hidden="true"/>
    <div className="oe-intro-image-shell">
      <EnemyPortrait level={level} className="oe-intro-art" alt=""/>
    </div>
    <div className="oe-intro-vignette" aria-hidden="true"/>
    <div className="oe-intro-heat" aria-hidden="true"/>
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
    {children&&<div className="oe-intro-preparation" aria-hidden={!prepared}>{children}</div>}
    {onBack&&<button type="button" className="oe-intro-back"
      onClick={onBack} disabled={!prepared} aria-hidden={!prepared}>‹ MAP</button>}
    <button type="button" className="oe-intro-continue"
      onClick={onContinue} disabled={closing||prepared} autoFocus={!prepared}>
      TAP TO PREPARE <span aria-hidden="true">›</span>
    </button>
  </div>;
}
