import React,{useEffect,useRef,useState} from 'react';
import {newRound,stepFirstLevel,FIRST_LEVEL} from './firstLevel.js';
import {overswingActions,overswingPayout,signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {HorizontalMeter,GlassChest,IntroTarget,SimpleCard} from './MinimalBoard.jsx';
import {flyCardThroughCenter,bankGoldIntoGlass,flyMultiplierRewards} from './minimalMotion.js';
import {multiplierParts,multiplierRewards} from './multiplierView.js';

export default function SimplifiedGame(){
 const [round,setRound]=useState(newRound);
 const [shownGold,setShownGold]=useState(0);
 const [animating,setAnimating]=useState(false);
 const [showTarget,setShowTarget]=useState(true);
 const [introSequence,setIntroSequence]=useState(0);
 const rootRef=useRef(null),busyRef=useRef(false),cancelRef=useRef(null);
 useEffect(()=>()=>cancelRef.current?.(),[]);

 const {game,snaps,event,turn}=round;
 const deal=game.deal;
 const banked=deal.T;
 const pending=overswingPayout(game,FIRST_LEVEL.rules);
 const remaining=deal.deck.length-deal.pos;
 const hearts=Math.max(0,FIRST_LEVEL.maxSnaps-snaps);
 const victory=banked>=FIRST_LEVEL.target;
 const finished=victory||snaps>=FIRST_LEVEL.maxSnaps||game.status==='over';
 const available=finished||animating?[]:overswingActions(game,FIRST_LEVEL.rules);
 const canBank=available.some(a=>a.type==='bank'&&a.dropIndex==null);
 const canFlip=available.some(a=>a.type==='flip');
 // The engine is the sole source for Swing × Flip × Jackpot.
 const multipliers=multiplierParts(deal);
 useEffect(()=>{
   if(event.id===0)return;
   const rewards=multiplierRewards(game.deal,game.lastAction);
   return flyMultiplierRewards({root:rootRef.current,rewards});
 },[event.id]);

 const reset=()=>{
   cancelRef.current?.();
   cancelRef.current=null;
   busyRef.current=false;
   setRound(newRound());
   setShownGold(0);
   setAnimating(false);
   setIntroSequence(x=>x+1);
   setShowTarget(true);
 };

 function play(action,source){
   if(finished||busyRef.current)return;
   const next=stepFirstLevel(round,action);
   if(next===round)return; // Illegal actions never produce an animation.
   busyRef.current=true;
   setAnimating(true);
   const done=()=>{
     busyRef.current=false;
     cancelRef.current=null;
     setRound(next);
     if(action.type!=='bank')setShownGold(next.game.deal.T);
     setAnimating(false);
   };
   const root=rootRef.current;
   if(!root||!source){
     setShownGold(next.game.deal.T);done();return;
   }
   if(action.type==='bank'){
     cancelRef.current=bankGoldIntoGlass({
       root,source,fromScore:banked,toScore:next.game.deal.T,
       onCount:setShownGold,onComplete:done
     });
   }else{
     const nextValue=signed(next.game.lastAction?.card??0);
     cancelRef.current=flyCardThroughCenter({
       root,source,action,nextValue,onComplete:done
     });
   }
 }

 return <main className="sgv-page">
   <div ref={rootRef} className={'sgv-phone sgv-event-'+event.type} aria-busy={animating}>
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
       <div className="sgv-mini-hint" aria-live="polite">
         {turn===0?'Tap a card to move the marker':event.type==='snap'?'Oops! Stay between −8 and +8':
           canBank&&pending>0?'Bank to collect your gold!':''}
       </div>
       <HorizontalMeter position={deal.S} limit={FIRST_LEVEL.rules.snapLimit}
         multipliers={multipliers}/>
       <span className="sgv-flight-center" aria-hidden="true"/>
       <GlassChest banked={shownGold}/>
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
           aria-label={'Bank '+pending+' gold'}>
           <span className="sgv-action-icon">★</span>
           <span className="sgv-action-text">BANK</span>
           <small>{canBank?'+'+pending:'SAVE'}</small>
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
         <p>{victory?'Gold collected: '+banked:'Gold collected: '+banked+' / '+FIRST_LEVEL.target}</p>
         <button type="button" onClick={reset}>PLAY AGAIN</button>
       </div>
     </div>}
   </div>
 </main>;
}
