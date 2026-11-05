import React from 'react';
import {meterPercent,meterMarks} from './meterScale.js';
export const signedValue=n=>n>0?'+'+n:String(n);

export function HorizontalMeter({position,limit=8,multipliers=[]}){
 const percentage=meterPercent(position,limit);
 return <section className="sgv-meter-section" aria-label="Swing meter and multipliers">
   <div className="sgv-meter-caption"><span className="sgv-meter-name">SWING</span></div>
   <div className="sgv-meter" role="group" data-value={position}
     aria-label={'Swing at '+signedValue(position)+'; Snap beyond minus '+limit+' or plus '+limit}>
     <div className="sgv-meter-track" role="img" data-edge-danger={Math.abs(position)>=limit-2}
       aria-label={'Swing position '+signedValue(position)}>
       <span className="sgv-meter-centerline" aria-hidden="true"/>
       <div className="sgv-meter-scale" aria-hidden="true">
         <div className="sgv-meter-ticks">
           {meterMarks(limit).map(number=>
             <span key={number} className={'sgv-meter-tick'+(number===0?' sgv-meter-tick-zero':'')}
               style={{left:meterPercent(number,limit)+'%'}}>{signedValue(number)}</span>)}
         </div>
         <span className="sgv-meter-marker" style={{left:percentage+'%'}}>
           <span className="sgv-meter-number">{signedValue(position)}</span>
           <span className="sgv-meter-arrow"/>
         </span>
       </div>
     </div>
     <div className="sgv-multipliers" role="group" aria-label="Swing, Flip, Jackpot multipliers">
       {multipliers.map(({kind,value,label})=>
         <span key={kind} className={'sgv-multiplier-pill sgv-multiplier-'+kind}
           data-factor={kind} title={label} aria-label={label+': times '+value}>
           ×{value}
         </span>)}
     </div>
   </div>
 </section>;
}

function GoldPile({value}){
 const pieces=Math.min(60,Math.max(0,Math.round(value)));
 return <div className="sgv-gold-pile" aria-hidden="true">
   {Array.from({length:pieces},(_,i)=>{
     const row=Math.floor(i/9),column=i%9;
     const x=8+(column*10.05)+(row%2?4:0)+(((i*13)%7)-3)*.35;
     const y=5+row*13+((i*11)%5);
     const size=15+(i*7)%7;
     return <span key={i} className="sgv-gold-piece"
       style={{left:x+'%',bottom:y+'%',width:size+'px',height:size+'px',
         '--tilt':(i*29%36-18)+'deg'}}>★</span>;
   })}
 </div>;
}

// The open Pot is still at risk. Nothing in this tray is counted as secured gold.
export function PendingPot({value,resonance=0}){
 return <div className="sgv-pending-pot" role="status" aria-label={'At risk Pot: '+value+(resonance?' plus '+resonance+' resonance bonus':'')}>
   <span className="sgv-pot-label">POT</span>
   <span className="sgv-pot-amount"><span aria-hidden="true">★</span>{value}</span>
   {resonance>0?<span className="sgv-pot-resonance">+{resonance} BONUS</span>:
     <span className="sgv-pot-coins" aria-hidden="true">✦ ✦</span>}
 </div>;
}

export function GoalProgress({banked,target}){
 return <div className="sgv-goal-progress" role="status" aria-label={'Secured '+banked+' of '+target+' gold'}>
   <span>SECURED</span><strong>{banked} / {target}</strong>
 </div>;
}

export function GlassChest({banked}){
 return <div className="sgv-chest-area" aria-label={banked+' gold collected'} data-gold={banked}>
   <div className="sgv-chest-glow" aria-hidden="true"/>
   <div className="sgv-chest-art">
     <div className="sgv-chest-platform" aria-hidden="true"/>
     <div className="sgv-chest-body">
       <div className="sgv-chest-inner">
         <GoldPile value={banked}/>
       </div>
       <span className="sgv-glass-highlight sgv-glass-highlight-left"/>
       <span className="sgv-glass-highlight sgv-glass-highlight-right"/>
       <span className="sgv-glass-spark sgv-glass-spark-a">✦</span>
       <span className="sgv-glass-spark sgv-glass-spark-b">✦</span>
     </div>
     <div className="sgv-chest-rim" aria-hidden="true"/>
     <span className="sgv-chest-mouth" aria-hidden="true"/>
   </div>
 </div>;
}

export function IntroTarget({target,onDone,sequence}){
 return <div className="sgv-intro-target" key={sequence} aria-live="polite"
   onAnimationEnd={event=>{if(event.target===event.currentTarget)onDone();}}>
   <div className="sgv-intro-coin">★</div>
   <div className="sgv-intro-message"><span>COLLECT</span><strong>{target}</strong><span>GOLD!</span></div>
 </div>;
}

export function SimpleCard({id,index,value,disabled,onPlay}){
 const type=value<0?'cloud':id===4||id%5===0?'drop':'leaf';
 return <button type="button"
   className={'sgv-card sgv-card-'+type}
   aria-label={'Play '+signedValue(value)}
   disabled={disabled}
   onClick={event=>onPlay(index,event.currentTarget)}>
   <span className="sgv-card-gloss" aria-hidden="true"/>
   <span className="sgv-card-glyph" aria-hidden="true">{type==='leaf'?'✿':type==='cloud'?'◆':'✦'}</span>
   <strong>{signedValue(value)}</strong>
 </button>;
}
