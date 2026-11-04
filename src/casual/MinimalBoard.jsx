import React from 'react';

const MARKS=[-8,-6,-4,-2,0,2,4,6,8];
export const signedValue=n=>n>0?'+'+n:String(n);

export function HorizontalMeter({position,limit=8,bonus=1,crossed=false,burstId=0}){
 const bounded=Math.max(-limit,Math.min(limit,position));
 const percentage=((bounded+limit)/(2*limit))*100;
 return <section className="sgv-meter-section" aria-label="Swing">
   <div className="sgv-meter-caption"><span className="sgv-meter-name">SWING</span><span className="sgv-meter-current">Current <b>{signedValue(position)}</b></span></div>
   <div className="sgv-meter" role="img" data-value={position}
     aria-label={'Swing at '+signedValue(position)+'; Snap beyond minus '+limit+' or plus '+limit}>
     <div className="sgv-meter-track">
       <span className="sgv-meter-safe" aria-hidden="true"/>
       <span className="sgv-meter-centerline" aria-hidden="true"/>
       <span className="sgv-meter-marker" style={{left:percentage+'%'}}>
         <span className="sgv-meter-number">{signedValue(position)}</span>
         <span className="sgv-meter-arrow"/>
       </span>
     </div>
     <div className="sgv-meter-labels" aria-hidden="true">
       {MARKS.map(number=><span key={number}>{signedValue(number)}</span>)}
     </div>
   </div>
   {crossed&&<div key={burstId} className="sgv-meter-bonus" aria-live="polite">★ BONUS ×{bonus}</div>}
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
 const type=value<0?'cloud':index%2===0?'leaf':'drop';
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
