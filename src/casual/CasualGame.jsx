import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {overswingActions,overswingPayout,overswingMultiplier,signed} from '../external/engines.js';
import {FIRST_LEVEL,newRound,stepFirstLevel} from './firstLevel.js';
import {animateCardTravel,animateBankIntoJar} from './animations.js';
import {GardenScene,Corgi,SwingGauge,ScoreJar,TileGlyph} from './CasualArt.jsx';

const signedLabel=id=>(signed(id)>0?'+':'')+signed(id);

function Card({id,index,disabled,onPlay}){
 const value=signed(id),positive=value>0;
 const kind=!positive?'cloud':id===4?'drop':id===2?'leaf':id%2?'drop':'leaf';
 return <button type="button" className={'sg-card sg-card-'+kind} disabled={disabled}
   onClick={event=>onPlay(index,event.currentTarget)} aria-label={'Play '+(positive?'plus ':'minus ')+Math.abs(value)}>
   <span className="sg-card-icon"><TileGlyph type={kind}/></span>
   <strong>{signedLabel(id)}</strong>
 </button>;
}

function ParticleLayer({event}){
 const host=useRef(null),emit=useRef(null);
 useEffect(()=>{
   let disposed=false,app;
   (async()=>{
     try{
       const {Application,Graphics}=await import('pixi.js');
       if(disposed||!host.current)return;
       app=new Application();
       await app.init({resizeTo:host.current,backgroundAlpha:0,antialias:true,resolution:Math.min(window.devicePixelRatio||1,2),preference:'webgl'});
       if(disposed){app.destroy({removeView:true},{children:true});return;}
       host.current.appendChild(app.canvas);
       emit.current=kind=>{
         const count=kind==='win'?48:kind==='bank'?24:kind==='cross'?12:kind==='snap'?18:6;
         const width=app.screen.width,height=app.screen.height;
         for(let i=0;i<count;i++){
           const color=kind==='snap'?0xff7c8b:[0xffd34f,0xffee99,0xffffff,0x8ff9a5,0xff9cb2][i%5];
           const p=new Graphics().circle(0,0,(i%3)+3).fill({color});
           p.x=width*.5;p.y=height*(kind==='win'?.53:kind==='bank'?.58:.39);
           app.stage.addChild(p);
           const angle=(Math.PI*2*i/count)+(Math.random()-.5)*.5;
           const radius=45+Math.random()*(kind==='win'?210:105);
           gsap.to(p,{x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius,alpha:0,duration:.75+Math.random()*.6,ease:'power2.out',onComplete:()=>p.destroy()});
         }
       };
     }catch{/* Effects are optional. Gameplay remains functional without WebGL. */}
   })();
   return ()=>{disposed=true;emit.current=null;if(app?.renderer)app.destroy({removeView:true},{children:true});};
 },[]);
 useEffect(()=>{if(event.id>0)emit.current?.(event.type);},[event]);
 return <div ref={host} className="sg-particle-layer" aria-hidden="true"/>;
}

export default function CasualGame(){
 const [round,setRound]=useState(newRound);
 const [paused,setPaused]=useState(false);
 const [moving,setMoving]=useState(false);
 const [shownScore,setShownScore]=useState(0);
 const stageRef=useRef(null),busyRef=useRef(false),cancelRef=useRef(null);
 useEffect(()=>()=>{cancelRef.current?.();},[]);
 const {game,snaps,turn,event}=round,deal=game.deal;
 const score=deal.T,pending=overswingPayout(game,FIRST_LEVEL.rules);
 const deckRemaining=deal.deck.length-deal.pos;
 const won=score>=FIRST_LEVEL.target;
 const over=won||snaps>=FIRST_LEVEL.maxSnaps||game.status==='over';
 const legal=(over||paused||moving)?[]:overswingActions(game,FIRST_LEVEL.rules);
 const canFlip=legal.some(a=>a.type==='flip'),canBank=legal.some(a=>a.type==='bank'&&a.dropIndex==null);
 const tip=won?'Beautiful! The jar is full!':snaps>=FIRST_LEVEL.maxSnaps?'Out of chances. Try again!':
   turn===0?'Tap a card to move the swing!':
   event.type==='snap'?'Oops! Stay inside the purple arc!':
   canBank&&pending>0?'Save your stars! Tap BANK.':
   event.type==='bank'?'Amazing! Keep collecting!':
   'Watch the swing. Bank before it snaps!';
 const play=(action,source)=>{
   if(over||paused||busyRef.current)return;
   const next=stepFirstLevel(round,action);
   if(next===round)return;
   busyRef.current=true;
   setMoving(true);
   const finish=()=>{
     cancelRef.current=null;
     busyRef.current=false;
     setMoving(false);
     setRound(next);
     if(action.type!=='bank')setShownScore(next.game.deal.T);
   };
   const root=stageRef.current;
   if(!root){setShownScore(next.game.deal.T);finish();return;}
   if(action.type==='bank'){
     cancelRef.current=animateBankIntoJar({root,fromScore:score,toScore:next.game.deal.T,onCount:setShownScore,onComplete:finish});
   }else if(action.type==='steer'||action.type==='flip'){
     const node=source||root.querySelector('.sg-next-card');
     const value=signed(next.game.lastAction?.card??0);
     cancelRef.current=animateCardTravel({root,source:node,action,nextCard:value,onComplete:finish});
   }else finish();
 };
 const restart=()=>{
   cancelRef.current?.();cancelRef.current=null;busyRef.current=false;
   setMoving(false);setShownScore(0);setRound(newRound());setPaused(false);
 };
 const snapLeft=Math.max(0,FIRST_LEVEL.maxSnaps-snaps);
 return <main className="sg-page"><div ref={stageRef} aria-busy={moving} className={'sg-phone sg-event-'+event.type}>
   <GardenScene/><div className="sg-sun-haze" aria-hidden="true"/><ParticleLayer event={event}/>
   <header className="sg-top">
     <div className="sg-level-pill"><span className="sg-level-star">★</span><strong>Level 1</strong></div>
     <div className="sg-progress" aria-label="Level 1 of 200"><span className="sg-progress-glow"/><b>1 / 200</b></div>
     <div className="sg-wallet" aria-label={shownScore+' collected stars'}><span>★</span><b className="sg-tabular">{shownScore}</b></div>
     <button className="sg-pause" type="button" onClick={()=>setPaused(true)} aria-label="Pause game">Ⅱ</button>
   </header>
   <section className="sg-objective" aria-label="Level target">
     <div className="sg-target-icon" aria-hidden="true"><span>◎</span><i>➤</i></div>
     <div className="sg-objective-label">Target</div><strong className="sg-objective-value">{FIRST_LEVEL.target}</strong>
   </section>
   <div className="sg-tiny-stats">
     <span className="sg-stat"><span className="sg-stat-icon">▣</span> Deck: <b>{deckRemaining}</b></span>
     <span className="sg-stat"><span className="sg-stat-icon">▰</span> Hand: <b>{deal.hand.length}</b></span>
     <span className="sg-stat"><span className="sg-stat-icon">✦</span> Snaps: <b>{snapLeft}</b></span>
   </div>
   <section className="sg-playfield" aria-label="Swing game board">
     <div className="sg-hint" key={tip}><Corgi/><span>{tip}</span></div>
     <SwingGauge position={deal.S} limit={FIRST_LEVEL.rules.snapLimit}/>
     <ScoreJar banked={shownScore} pending={pending} goal={FIRST_LEVEL.target} burst={event.type}/>
     <span className="sg-multiplier">✦ BONUS ×{overswingMultiplier(deal)}</span>
   </section>
   <section className="sg-controls">
     <div className="sg-hand-shelf" aria-hidden="true"/>
     <div className="sg-hand" aria-label="Your cards">
       {deal.hand.map((id,i)=><Card key={id} id={id} index={i} disabled={over||!legal.some(a=>a.type==='steer'&&a.index===i)} onPlay={(index,node)=>play({type:'steer',index},node)}/>)}
       {Array.from({length:Math.max(0,FIRST_LEVEL.handSize-deal.hand.length)},(_,i)=><div key={'empty-'+i} className="sg-card sg-empty" aria-hidden="true"><span>✕</span></div>)}
     </div>
     <div className="sg-buttons">
       <button type="button" className="sg-button sg-bank" disabled={!canBank} onClick={()=>play({type:'bank'})}>
         <span className="sg-button-icon sg-chest">▣<i>★</i></span><span className="sg-action-name">Bank</span>
       </button>
       <button type="button" className="sg-button sg-flip" disabled={!canFlip} onClick={event=>play({type:'flip'},event.currentTarget.querySelector('.sg-next-card'))}>
         <span className="sg-button-icon sg-arrow">⟳</span><span className="sg-action-name">Flip</span>
         <span className="sg-next"><small>NEXT</small><span className="sg-next-card">?</span></span>
       </button>
       <div className="sg-button sg-snap-status" role="status" aria-label={snapLeft+' Snap chances left'}>
         <span className="sg-button-icon">✦</span><span className="sg-action-name">Snap</span><small>({snapLeft} left)</small>
       </div>
     </div>
   </section>
   {paused&&!over&&<div className="sg-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sg-pause-title">
     <div className="sg-end-card"><div className="sg-end-burst">★</div><h1 id="sg-pause-title">Paused</h1>
       <button type="button" onClick={()=>setPaused(false)}>KEEP PLAYING</button>
       <button type="button" className="sg-secondary-action" onClick={restart}>RESTART LEVEL</button>
     </div>
   </div>}
   {over&&<div className="sg-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sg-end-title"><div className="sg-end-card">
     <div className="sg-end-burst">{won?'★':'♡'}</div><h1 id="sg-end-title">{won?'Level complete!':'Try again!'}</h1>
     <p>{won?'You collected '+score+' stars!':'You collected '+score+' of '+FIRST_LEVEL.target+' stars.'}</p>
     <button type="button" onClick={restart}>↻ PLAY AGAIN</button>
   </div></div>}
 </div></main>;
}
