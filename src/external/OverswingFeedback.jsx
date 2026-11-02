import React from 'react';
import {createPortal} from 'react-dom';
import './overswingFeedback.css';

// Brief in-place multiplier effects. JACKPOT earns a dramatic coronation;
// ordinary SWING/FLIP tier gains receive a small, legible pixel glint.
const JACKPOT_SPARKS=Array.from({length:20},(_,i)=>({
  '--burst-angle':i*18+'deg',
  '--burst-radius':(43+i%4*16)+'px',
  '--burst-delay':(i%5*24)+'ms'
}));
export function MultiplierBurst({feedback}){
  if(!feedback)return null;
  const jackpot=feedback.kind==='jackpot',swing=feedback.kind==='swing';
  const label=jackpot?'JACKPOT!':swing?'SWING UP':'FLIP UP';
  return <div className={'os8-multiplier-burst os8-multiplier-burst-'+feedback.kind}
    key={feedback.serial} aria-hidden="true">
    {jackpot&&<div className="os8-multiplier-crown" aria-hidden="true">
      <svg viewBox="0 0 80 52" shapeRendering="crispEdges" focusable="false">
        <path fill="#34131e" d="M8 40V11H18V18H30V5H40V18H51V6H61V19H70V12H78V42H71V48H12V42Z"/>
        <path fill="#ffd15d" d="M9 12H17V20H29V8H37V23H47V8H55V22H66V15H73V40H9Z"/>
        <path fill="#ff8a26" d="M13 34H69V41H13Z"/>
        <path fill="#fff5bd" d="M32 11H36V29H32ZM50 13H54V30H50ZM14 17H17V31H14Z"/>
        <path fill="#7f2740" d="M38 30H44V37H38Z"/>
      </svg>
    </div>}
    {jackpot&&<div className="os8-multiplier-halo"/>}
    {jackpot&&JACKPOT_SPARKS.map((vars,i)=>
      <i className="os8-multiplier-spark" style={vars} key={i}/>)}
    <div className="os8-multiplier-message">
      <strong>{label}</strong>
      <span>{jackpot?'JACKPOT ×'+feedback.factor:
        swing?'SWING +'+feedback.gain:'FLIP ×'+feedback.factor}</span>
    </div>
  </div>;
}

// Additional translucent glass fracture layered above the already-existing
// SNAP burst, card shatter, pendulum rebound, and meter visuals.
const CRACK_PATHS=[
  'M250 250 L215 209 L181 199 L148 164 L108 158 L66 123 L24 115',
  'M250 250 L282 202 L318 193 L339 153 L390 136 L421 93 L487 76',
  'M250 250 L309 277 L319 318 L369 334 L399 384 L468 403',
  'M250 250 L222 303 L182 308 L155 347 L113 365 L86 418 L20 445',
  'M250 250 L257 177 L235 138 L256 99 L238 55 L249 1',
  'M250 250 L267 321 L251 357 L283 412 L265 459 L271 497',
  'M181 199 L152 215 L117 194 L84 211',
  'M318 193 L352 213 L379 194 L422 216',
  'M319 318 L320 354 L353 371 L343 419',
  'M182 308 L165 278 L125 269 L113 238',
  'M235 138 L197 116 L187 76',
  'M257 177 L289 146 L301 103',
  'M267 321 L308 365 L307 403',
  'M222 303 L189 357 L193 390'
];
export function PotCrack({crack,onFinish}){
  if(!crack)return null;
  return createPortal(
    <div className="os8-pot-crack" key={crack.serial} style={crack.style}
      aria-hidden="true"
      onAnimationEnd={event=>{
        if(event.target===event.currentTarget)onFinish?.(crack.serial);
      }}>
      <div className="os8-pot-crack-flash"/>
      <div className="os8-pot-crack-vignette"/>
      <svg className="os8-pot-crack-glass" viewBox="0 0 500 500"
        shapeRendering="crispEdges" focusable="false" aria-hidden="true">
        {CRACK_PATHS.map((d,i)=>
          <g key={i}>
            <path d={d} fill="none" stroke="#1d0814" strokeWidth={i<6?11:7}
              strokeLinejoin="miter" strokeLinecap="square"/>
            <path d={d} fill="none" stroke={i%3===0?'#ffb2a0':'#ebe4de'}
              strokeWidth={i<6?4:2} strokeLinejoin="miter"
              strokeLinecap="square"/>
          </g>
        )}
        <path d="M248 230L270 243L263 261L243 273L230 256Z"
          fill="#180c14" stroke="#ff633b" strokeWidth="5"/>
      </svg>
      <div className="os8-pot-crack-caption">
        <strong>POT SHATTERED</strong>
        <span>{crack.pointsLost.toLocaleString('en-US')} POTENTIAL GOLD LOST</span>
      </div>
    </div>,document.body
  );
}
