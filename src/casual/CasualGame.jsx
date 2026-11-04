import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {overswingActions,overswingPayout,overswingMultiplier,signed} from '../external/engines.js';
import {FIRST_LEVEL,newRound,stepFirstLevel} from './firstLevel.js';

const signedLabel=id=>(signed(id)>0?'+':'')+signed(id);

function Garden(){return <svg className="sg-garden" viewBox="0 0 440 930" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs>
  <linearGradient id="sgSky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#89d7f2"/><stop offset=".52" stopColor="#dafbfc"/><stop offset="1" stopColor="#fff6cc"/></linearGradient>
  <linearGradient id="sgHill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c2e7aa"/><stop offset="1" stopColor="#81c9a0"/></linearGradient>
  <linearGradient id="sgGround" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c0e8a7"/><stop offset="1" stopColor="#6eb991"/></linearGradient>
  <filter id="sgSoft"><feGaussianBlur stdDeviation="5"/></filter>
 </defs>
 <rect width="440" height="930" fill="url(#sgSky)"/>
 <circle cx="350" cy="132" r="54" fill="#fffbbe" opacity=".53" filter="url(#sgSoft)"/>
 <g fill="#fff" opacity=".89" className="sg-cloud-one"><ellipse cx="84" cy="136" rx="58" ry="17"/><circle cx="63" cy="126" r="20"/><circle cx="97" cy="120" r="28"/><circle cx="122" cy="131" r="15"/></g>
 <g fill="#fff" opacity=".8" className="sg-cloud-two"><ellipse cx="337" cy="215" rx="54" ry="17"/><circle cx="318" cy="209" r="21"/><circle cx="348" cy="201" r="24"/></g>
 <path d="M0 433 Q67 360 125 410 Q195 313 269 399 Q350 312 440 407 L440 930H0Z" fill="#d7ebd1"/>
 <path d="M0 530Q95 442 165 474T327 452Q380 428 440 475V930H0Z" fill="url(#sgHill)"/>
 <path d="M0 610Q113 550 223 592T440 573V930H0Z" fill="url(#sgGround)"/>
 <path d="M0 660Q105 607 244 649T440 637V930H0Z" fill="#aad994" opacity=".68"/>
 <g opacity=".45" fill="#498c65"><ellipse cx="-18" cy="512" rx="26" ry="71"/><ellipse cx="22" cy="520" rx="31" ry="62"/><ellipse cx="419" cy="501" rx="40" ry="82"/><ellipse cx="450" cy="524" rx="35" ry="65"/></g>
 <g fill="#fffef5" opacity=".87"><circle cx="48" cy="672" r="4"/><circle cx="60" cy="667" r="3"/><circle cx="384" cy="690" r="4"/><circle cx="392" cy="683" r="3"/></g>
 </svg>}

function TinyFox(){return <svg viewBox="0 0 66 66" aria-hidden="true"><path d="M8 18 17 3 29 15 42 15 53 3 60 18 59 44Q51 62 33 62 14 62 7 43Z" fill="#ec9a50" stroke="#a96b43" strokeWidth="3" strokeLinejoin="round"/><path d="M12 35Q14 55 33 57Q52 55 55 35Q45 41 33 44Q20 42 12 35Z" fill="#fff5da"/><path d="m15 16 5-7 6 9M41 18l6-9 6 7" fill="#f6d0a2"/><path d="M19 33q4-6 9 0M39 33q4-6 9 0" stroke="#754b3c" strokeWidth="3" fill="none" strokeLinecap="round"/><path d="M28 42q5 6 10 0" stroke="#865644" strokeWidth="2.5" fill="none" strokeLinecap="round"/><ellipse cx="33" cy="40" rx="4" ry="3" fill="#704335"/><circle cx="17" cy="41" r="4" fill="#efaaac"/><circle cx="48" cy="41" r="4" fill="#efaaac"/></svg>}

function SwingGauge({position}){
 const marker=useRef(null);
 useEffect(()=>{if(marker.current){const x=position*18.9;gsap.to(marker.current,{x,y:x*x*.0042,duration:.65,ease:'back.out(1.7)',overwrite:true});}},[position]);
 return <div className="sg-gauge-wrap" aria-label={'Swing position '+position+', safe range minus eight to plus eight'}>
  <svg viewBox="0 0 410 226" className="sg-gauge">
   <defs>
    <linearGradient id="sgTrack" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff3b6"/><stop offset=".5" stopColor="#e6aa58"/><stop offset="1" stopColor="#af7136"/></linearGradient>
    <linearGradient id="sgGreen" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#b3f7a4" stopOpacity="0"/><stop offset=".5" stopColor="#7ff7a0"/><stop offset="1" stopColor="#b3f7a4" stopOpacity="0"/></linearGradient>
    <radialGradient id="sgPointer"><stop stopColor="#fff5bd"/><stop offset=".7" stopColor="#ffc85a"/><stop offset="1" stopColor="#ed8d4b"/></radialGradient>
    <filter id="sgGlow"><feGaussianBlur stdDeviation="6"/></filter>
   </defs>
   <ellipse cx="205" cy="204" rx="138" ry="16" fill="#70a17f" opacity=".2"/>
   <path d="M52 174Q205 -28 358 174" stroke="#876047" strokeWidth="24" strokeLinecap="round" fill="none" opacity=".15" transform="translate(0 6)"/>
   <path d="M52 174Q205 -28 358 174" stroke="#ce8c47" strokeWidth="25" strokeLinecap="round" fill="none"/>
   <path d="M52 174Q205 -28 358 174" stroke="url(#sgTrack)" strokeWidth="18" strokeLinecap="round" fill="none"/>
   <path d="M52 174Q205 -28 358 174" stroke="#fff8d0" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" transform="translate(0 -4)"/>
   <path d="M135 98Q205 26 275 98" stroke="#6cfa8c" strokeWidth="32" strokeLinecap="round" fill="none" opacity=".55" filter="url(#sgGlow)"/>
   <path d="M135 98Q205 26 275 98" stroke="url(#sgGreen)" strokeWidth="15" strokeLinecap="round" fill="none" opacity=".95"/>
   <g fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".75"><path d="m81 133 8 9M115 104l6 10M289 102l-6 10M321 134l-9 9"/></g>
   <text x="47" y="200" fill="#a96b5a" fontSize="17" fontWeight="900">−8</text><text x="348" y="200" fill="#a96b5a" fontSize="17" fontWeight="900">+8</text>
   <g ref={marker} transform="translate(205 71)" className="sg-pointer">
    <circle r="22" fill="#fffbe3" opacity=".6" filter="url(#sgGlow)"/>
    <circle r="16" fill="url(#sgPointer)" stroke="#ffffff" strokeWidth="4"/>
    <path d="M0 27 10 12 -10 12Z" fill="#e95b73" stroke="#fff5d5" strokeWidth="2"/>
    <circle cy="-4" r="5" fill="#fff9e3"/>
   </g>
   <g className="sg-twinkles" fill="#fffbdc"><path d="m172 57 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="m260 74 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>
  </svg>
  <span className="sg-swing-readout">{position===0?'CENTER':position>0?'+'+position:position}</span>
  <span className="sg-safe-label">Stay inside the golden arc</span>
 </div>;
}

function ScoreJar({banked,pending,goal,burst}){
 const jar=useRef(null);
 useEffect(()=>{if((burst==='bank'||burst==='win')&&jar.current){gsap.fromTo(jar.current,{scale:.93,rotate:-3},{scale:1,rotate:0,duration:.6,ease:'elastic.out(1,.45)',overwrite:true});}},[banked,burst]);
 return <div className="sg-score-cluster">
   <span className="sg-pot-pill">✦ POT <strong>{pending}</strong></span>
   <div ref={jar} className="sg-jar" aria-label={'Banked '+banked+' out of '+goal+' points'}>
    <div className="sg-jar-lid"/>
    <div className="sg-jar-glass">
      <div className="sg-jar-coins" aria-hidden="true">{Array.from({length:Math.min(14,Math.floor(banked/2))},(_,i)=><span key={i} className="sg-coin" style={{left:(18+(i*31)%65)+'%',bottom:(6+Math.floor(i/4)*13)+'%'}}>★</span>)}</div>
      <div className="sg-jar-shine"/>
      <div className="sg-jar-label"><span>COLLECTED</span><strong>{banked}<small> / {goal}</small></strong></div>
    </div>
   </div>
 </div>;
}

function Card({id,index,disabled,onPlay}){
 const value=signed(id),positive=value>0;
 return <button type="button" className={'sg-card '+(positive?'sg-card-plus':'sg-card-minus')} disabled={disabled} onClick={()=>onPlay(index)} aria-label={'Play '+(positive?'plus ':'minus ')+Math.abs(value)}>
   <span className="sg-card-icon" aria-hidden="true">{positive?'✿':'◆'}</span><strong>{signedLabel(id)}</strong><span className="sg-card-foot">{positive?'RIGHT':'LEFT'}</span>
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
 const {game,snaps,turn,event}=round,deal=game.deal;
 const score=deal.T,pending=overswingPayout(game,FIRST_LEVEL.rules);
 const deckRemaining=deal.deck.length-deal.pos;
 const won=score>=FIRST_LEVEL.target;
 const over=won||snaps>=FIRST_LEVEL.maxSnaps||game.status==='over';
 const legal=over?[]:overswingActions(game,FIRST_LEVEL.rules);
 const canFlip=legal.some(a=>a.type==='flip'),canBank=legal.some(a=>a.type==='bank'&&a.dropIndex==null);
 const tip=won?'You filled the jar!':snaps>=FIRST_LEVEL.maxSnaps?'All chances used — try again!':
   turn===0?'Tap a tile to move the swing!':
   event.type==='snap'?'Oops! Outside the arc spills the pot.':
   canBank&&pending>0?'Tap BANK to save your gold!':
   event.type==='bank'?'Nice! Fill the jar to win.':
   'Flip for a surprise, or choose a tile.';
 function play(action){if(!over)setRound(old=>stepFirstLevel(old,action));}

 return <main className="sg-page"><div className="sg-phone">
   <Garden/><div className="sg-sun-haze" aria-hidden="true"/><ParticleLayer event={event}/>
   <header className="sg-top"><div className="sg-level-pill"><span>★</span> LEVEL 1</div><div className="sg-progress"><span>1</span><div><i/></div><span>200</span></div></header>
   <section className="sg-objective" aria-label="Level goal"><div className="sg-target-icon">◎</div><div><span>GOAL</span><strong>Collect {FIRST_LEVEL.target} stars!</strong></div><span className="sg-goal-star">★</span></section>
   <div className="sg-tiny-stats"><span>▣ <b>{deckRemaining}</b> left</span><span>✋ <b>{deal.hand.length}</b> cards</span><span>♥ <b>{Math.max(0,FIRST_LEVEL.maxSnaps-snaps)}</b> chances</span></div>
   <section className="sg-playfield" aria-label="Swing game board">
     <div className="sg-hint" key={tip}><TinyFox/><span>{tip}</span></div>
     <SwingGauge position={deal.S}/>
     <ScoreJar banked={score} pending={pending} goal={FIRST_LEVEL.target} burst={event.type}/>
     <span className="sg-multiplier">✧ BONUS ×{overswingMultiplier(deal)}</span>
   </section>
   <section className="sg-controls">
     <div className="sg-hand" aria-label="Your cards">
       {deal.hand.map((id,i)=><Card key={id} id={id} index={i} disabled={over||!legal.some(a=>a.type==='steer'&&a.index===i)} onPlay={index=>play({type:'steer',index})}/>)}
       {Array.from({length:Math.max(0,FIRST_LEVEL.handSize-deal.hand.length)},(_,i)=><div key={'empty-'+i} className="sg-card sg-empty" aria-hidden="true"><span>+</span></div>)}
     </div>
     <div className="sg-buttons"><button type="button" className="sg-button sg-bank" disabled={!canBank} onClick={()=>play({type:'bank'})}><span className="sg-button-icon">★</span><span>BANK</span><small>{canBank?'+'+pending:'SAVE'}</small></button>
       <button type="button" className="sg-button sg-flip" disabled={!canFlip} onClick={()=>play({type:'flip'})}><span className="sg-button-icon sg-arrow">↻</span><span>FLIP</span><small>{deckRemaining} left</small></button></div>
   </section>
   {over&&<div className="sg-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sg-end-title"><div className="sg-end-card"><div className="sg-end-burst">{won?'★':'♡'}</div><h1 id="sg-end-title">{won?'Level complete!':'Try again!'}</h1><p>{won?'You collected '+score+' stars!':'You collected '+score+' of '+FIRST_LEVEL.target+' stars.'}</p><button type="button" onClick={()=>setRound(newRound())}>↻ PLAY AGAIN</button></div></div>}
 </div></main>;
}
