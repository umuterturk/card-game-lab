import React,{useEffect,useRef,useState} from 'react';
import {newRound,stepFirstLevel,FIRST_LEVEL} from './firstLevel.js';
import {overswingActions,overswingPayout,signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {HorizontalMeter,GlassChest,PendingPot,GoalProgress,IntroTarget,SimpleCard} from './MinimalBoard.jsx';
import {animateCardAction,animateFactorReset,bankGoldIntoGlass} from './minimalMotion.js';
import {multiplierParts} from './multiplierView.js';
import {rawPotValue,actionPresentation} from './presentation.js';

const viewOf=round=>({
  position:round.game.deal.S,
  rawPot:rawPotValue(round.game.deal),
  factors:multiplierParts(round.game.deal),
  snaps:round.snaps
});

export default function SimplifiedGame(){
 const [round,setRound]=useState(newRound);
 const [view,setView]=useState(()=>viewOf(round));
 const [shownGold,setShownGold]=useState(round.game.deal.T);
 const [animating,setAnimating]=useState(false);
 const [feedback,setFeedback]=useState(null);
 const [showTarget,setShowTarget]=useState(true);
 const [introSequence,setIntroSequence]=useState(0);
 const rootRef=useRef(null),busyRef=useRef(false),cancelRef=useRef(null);
 const resetMotionRef=useRef(null),seenFactorsRef=useRef(new Set());
 useEffect(()=>()=>{
   cancelRef.current?.();
   resetMotionRef.current?.();
 },[]);

 const {game,event,turn}=round;
 const deal=game.deal;
 const banked=deal.T;
 // Prospective payout is computed by the engine, not the raw Pot amount.
 const potentialPayout=overswingPayout(game,FIRST_LEVEL.rules);
 const remaining=deal.deck.length-deal.pos;
 const hearts=Math.max(0,FIRST_LEVEL.maxSnaps-view.snaps);
 const victory=banked>=FIRST_LEVEL.target;
 const finished=victory||round.snaps>=FIRST_LEVEL.maxSnaps||game.status==='over';
 const available=finished||animating?[]:overswingActions(game,FIRST_LEVEL.rules);
 const canBank=available.some(a=>a.type==='bank'&&a.dropIndex==null);
 const canFlip=available.some(a=>a.type==='flip');

 const reset=()=>{
   cancelRef.current?.();
   resetMotionRef.current?.();
   cancelRef.current=null;
   resetMotionRef.current=null;
   busyRef.current=false;
   const next=newRound();
   setRound(next);
   setView(viewOf(next));
   setShownGold(next.game.deal.T);
   setAnimating(false);
   setFeedback(null);
   seenFactorsRef.current=new Set();
   setIntroSequence(x=>x+1);
   setShowTarget(true);
 };

 function play(action,source){
   if(finished||busyRef.current)return;
   const next=stepFirstLevel(round,action);
   if(next===round)return; // Engine remains the only authority for legal actions.
   const change=actionPresentation(round,next,action);
   const root=rootRef.current;
   busyRef.current=true;
   setAnimating(true);
   setFeedback(action.type);
   resetMotionRef.current?.();
   resetMotionRef.current=null;

   const done=()=>{
     busyRef.current=false;
     cancelRef.current=null;
     setRound(next);
     setView(viewOf(next));
     setShownGold(next.game.deal.T);
     setFeedback(null);
     setAnimating(false);
   };
   if(!root||!source){
     done();
     return;
   }
   if(action.type==='bank'){
     const potSource=root.querySelector('.sgv-pending-pot')||source;
     cancelRef.current=bankGoldIntoGlass({
       root,source:potSource,
       fromScore:change.securedBefore,toScore:change.securedAfter,
       onTake:()=>setView(v=>({...v,rawPot:0})),
       onCount:setShownGold,
       onComplete:done
     });
     return;
   }

   const firstFactorAwards=change.rewards
     .filter(({kind})=>!seenFactorsRef.current.has(kind))
     .map(({kind})=>kind);
   change.rewards.forEach(({kind})=>seenFactorsRef.current.add(kind));
   cancelRef.current=animateCardAction({
     root,source,action,view:change,firstFactorAwards,
     onMeter:position=>{
       setView(v=>({...v,position}));
       if(change.zeroBreak)setFeedback('zero_break');
       if(change.snap)setFeedback('snap');
     },
     onPot:rawPot=>setView(v=>({...v,rawPot})),
     onSnap:()=>setView(v=>({...v,snaps:change.snapsAfter})),
     onFactors:factors=>{
       setView(v=>({...v,factors}));
       if(change.zeroBreak||change.snap||
          change.factorsAfter.some((f,i)=>f.value<change.factorsBefore[i].value)){
         resetMotionRef.current=animateFactorReset(root);
       }
     },
     onComplete:done
   });
 }

 const notice=feedback==='snap'||event.type==='snap'
   ?'SNAP! Pending Pot lost'
   :feedback==='zero_break'||event.type==='zero_break'
   ?'ZERO BREAK — Pot kept, factors reset'
   :turn===0?'Tap a card to move the marker'
   :!canBank&&view.rawPot>0&&!animating?'Play another card to Bank'
   :'';

 return <main className="sgv-page">
   <div ref={rootRef} className={'sgv-phone sgv-event-'+(feedback||event.type)}
     aria-busy={animating}>
     <GardenScene/>
     <div className="sgv-atmosphere" aria-hidden="true"/>
     <header className="sgv-hud">
       <div className="sgv-level" aria-label="Level 1"><span>★</span><strong>Level 1</strong></div>
       <div className="sgv-hud-right">
         <div className="sgv-gold-counter" aria-label={'Banked gold: '+shownGold}>
           <span className="sgv-gold-icon">★</span>
           <strong>{shownGold}</strong>
         </div>
         <div className="sgv-lives" aria-label={hearts+' chances remaining'}>
           {Array.from({length:FIRST_LEVEL.maxSnaps},(_,i)=>
             <span key={i} className={i<hearts?'sgv-heart':'sgv-heart sgv-heart-empty'}>♥</span>)}
         </div>
       </div>
     </header>

     <div className="sgv-middle">
       <div className="sgv-mini-hint" aria-live="polite">{notice}</div>
       <HorizontalMeter position={view.position} limit={FIRST_LEVEL.rules.snapLimit}
         multipliers={view.factors}/>
       <span className="sgv-flight-center" aria-hidden="true"/>
       <GlassChest banked={shownGold}/>
       <PendingPot value={view.rawPot}/>
       <GoalProgress banked={shownGold} target={FIRST_LEVEL.target}/>
     </div>

     <section className="sgv-controls" aria-label="Card actions">
       <div className="sgv-card-shelf" aria-hidden="true"/>
       <div className="sgv-hand" aria-label="Your cards">
         {deal.hand.map((id,i)=>
           <SimpleCard key={id} id={id} index={i} value={signed(id)}
             disabled={finished||animating||!available.some(a=>a.type==='steer'&&a.index===i)}
             onPlay={(index,element)=>play({type:'steer',index},element)}/>)}
         {Array.from({length:Math.max(0,FIRST_LEVEL.handSize-deal.hand.length)},(_,i)=>
           <div className="sgv-card sgv-card-empty" key={'empty-'+i} aria-hidden="true">×</div>)}
       </div>
       <div className="sgv-actions">
         <button type="button" className="sgv-action sgv-bank" disabled={!canBank}
           onClick={e=>play({type:'bank'},e.currentTarget)}
           aria-label={'Bank '+potentialPayout+' gold'}>
           <span className="sgv-action-icon">★</span>
           <span className="sgv-action-text">BANK</span>
           <small>{canBank?'+'+potentialPayout:'SAVE'}</small>
         </button>
         <button type="button" className="sgv-action sgv-flip" disabled={!canFlip}
           onClick={e=>play({type:'flip'},e.currentTarget.querySelector('.sgv-next-card'))}
           aria-label={'Flip a card. '+remaining+' left in deck'}>
           <span className="sgv-action-icon">⟳</span>
           <span className="sgv-action-text">FLIP</span>
           <span className="sgv-flip-next"><span className="sgv-next-card">?</span>
             <small>{remaining} left</small></span>
         </button>
       </div>
     </section>

     {showTarget&&<IntroTarget sequence={introSequence} target={FIRST_LEVEL.target}
       onDone={()=>setShowTarget(false)}/>}
     {finished&&<div className="sgv-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sgv-end-title">
       <div className="sgv-end-card">
         <div className="sgv-end-symbol">{victory?'★':'♡'}</div>
         <h1 id="sgv-end-title">{victory?'Level complete!':'Try again!'}</h1>
         <p>{'Gold collected: '+banked+' / '+FIRST_LEVEL.target}</p>
         <button type="button" onClick={reset}>PLAY AGAIN</button>
       </div>
     </div>}
   </div>
 </main>;
}
