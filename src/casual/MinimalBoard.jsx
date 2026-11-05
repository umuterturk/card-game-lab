import React from 'react';
import {meterPercent,meterMarks} from './meterScale.js';
import {fluidFillPercent} from './presentation.js';

export const signedValue=n=>n>0?'+'+n:String(n);

// The fluid is one resource with two states: at-risk in the Pot, secured in the tank.
export function DropletIcon({className=''}) {
 return <svg className={'sgv-drop-icon '+className} viewBox="0 0 28 34"
   aria-hidden="true" focusable="false">
   <path d="M14 2C11 8 3 17 3 23a11 11 0 0 0 22 0C25 17 17 8 14 2Z"
     fill="currentColor" stroke="var(--drop-rim,#ffeb9d)" strokeWidth="2.6"
     strokeLinejoin="round"/>
   <path d="M9 22c.4-3 2-6 4.5-9" stroke="#fff8ca" strokeWidth="2.2"
     strokeLinecap="round" fill="none" opacity=".85"/>
 </svg>;
}

export function HorizontalMeter({position,limit=8,multipliers=[]}){
 const percentage=meterPercent(position,limit);
 return <section className="sgv-meter-section" aria-label="Swing meter and multipliers">
   <div className="sgv-meter-caption"><span className="sgv-meter-name">SWING</span></div>
   <div className="sgv-meter" role="group" data-value={position}
     aria-label={'Swing at '+signedValue(position)+'; Snap beyond minus '+limit+' or plus '+limit}>
     <div className="sgv-meter-track" role="img" data-edge-danger={Math.abs(position)>=limit-2}
       aria-label={'Swing position '+signedValue(position)}>
       <div className="sgv-meter-scale" aria-hidden="true">
         <div className="sgv-meter-ticks">
           {meterMarks(limit).map(number=>
             <span key={number} className={'sgv-meter-tick'+(number===0?' sgv-meter-tick-zero':'')}
               style={{left:meterPercent(number,limit)+'%'}}>{signedValue(number)}</span>)}
         </div>
         <span className="sgv-meter-marker" style={{left:percentage+'%'}}>
           <span className="sgv-meter-number">{signedValue(position)}</span>
           <span className="sgv-meter-arrow"/>
           <span className="sgv-meter-needle" aria-hidden="true"/>
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

// Small source bottle: raw at-risk value and prospective engine payout are different.
// The bottle itself is the only Bank control; no duplicated bottom CTA.
export function PendingPot({value,resonance=0,target=24,bankable=false,bankPreview=0,onBank}){
 const fill=fluidFillPercent(value,target,{max:76});
 return <button type="button"
   className={'sgv-pending-pot sgv-pot-bottle'+(bankable?' sgv-pot-bankable':'')}
   disabled={!bankable}
   onClick={event=>onBank?.(event.currentTarget)}
   aria-label={bankable
     ?'Bank '+bankPreview+' drops from Pot holding '+value+' at risk'
     :'Pot holds '+value+' drops at risk. Banking not yet available'}>
   <span className="sgv-pot-bottle-glass" aria-hidden="true">
     <span className="sgv-pot-liquid" style={{height:fill+'%',opacity:fill>0?1:0}}/>
     <span className="sgv-pot-glass-shine"/>
   </span>
   <span className="sgv-pot-bottle-rim" aria-hidden="true"/>
   <span className="sgv-pot-label">POT</span>
   <span className="sgv-pot-amount"><DropletIcon className="sgv-pot-drop"/>{value}</span>
   {resonance>0&&<span className="sgv-pot-resonance">+{resonance} BONUS</span>}
   {bankable&&<span className="sgv-pot-bank-preview" aria-hidden="true">BANK +{bankPreview}</span>}
 </button>;
}

export function GoalProgress({banked,target}){
 return <div className="sgv-goal-progress" role="status" aria-label={'Secured '+banked+' of '+target+' drops'}>
   <span>SECURED</span><strong>{banked} / {target}</strong>
 </div>;
}

// Larger destination bottle. Its fluid represents only secured engine value.
export function GlassChest({banked,target}){
 const fill=fluidFillPercent(banked,target,{max:78});
 return <div className="sgv-chest-area sgv-bank-bottle"
   aria-label={banked+' of '+target+' drops secured'} data-gold={banked}>
   <div className="sgv-chest-glow" aria-hidden="true"/>
   <div className="sgv-chest-art">
     <div className="sgv-chest-platform" aria-hidden="true"/>
     <div className="sgv-chest-body">
       <div className="sgv-chest-inner">
         <div className="sgv-fluid-fill" style={{height:fill+'%',opacity:fill>0?1:0}} aria-hidden="true">
           <span className="sgv-fluid-surface"/>
           <span className="sgv-fluid-bubble sgv-fluid-bubble-a"/>
           <span className="sgv-fluid-bubble sgv-fluid-bubble-b"/>
           <span className="sgv-fluid-bubble sgv-fluid-bubble-c"/>
         </div>
       </div>
       <span className="sgv-glass-highlight sgv-glass-highlight-left"/>
       <span className="sgv-glass-highlight sgv-glass-highlight-right"/>
       <span className="sgv-glass-spark sgv-glass-spark-a">✦</span>
       <span className="sgv-glass-spark sgv-glass-spark-b">✦</span>
     </div>
     <div className="sgv-chest-rim" aria-hidden="true"/>
     <span className="sgv-chest-mouth" aria-hidden="true"/>
     <GoalProgress banked={banked} target={target}/>
   </div>
 </div>;
}

export function IntroTarget({target,onDone,sequence}){
 return <div className="sgv-intro-target" key={sequence} aria-live="polite"
   onAnimationEnd={event=>{if(event.target===event.currentTarget)onDone();}}>
   <div className="sgv-intro-coin"><DropletIcon/></div>
   <div className="sgv-intro-message"><span>COLLECT</span><strong>{target}</strong><span>DROPS!</span></div>
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
