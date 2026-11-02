import React from 'react';
import './goldCoin.css';

// One pixel-art coin for every Gold amount in Overswing.
// Cosmetic only: Gold remains the same single spendable currency.
export function GoldCoin({size='sm',shine=true}){
  return <span className={'os-gold-coin os-gold-coin-'+size+
    (shine?' os-gold-coin-shine':'')} aria-hidden="true">
    <svg viewBox="0 0 24 24" shapeRendering="crispEdges" focusable="false"
      aria-hidden="true">
      {/* Stepped outline instead of a smooth SVG circle. */}
      <path d="M7 0H17V2H21V4H23V7H24V17H23V20H21V22H17V24H7V22H3V20H1V17H0V7H1V4H3V2H7Z"
        fill="#37160f"/>
      <path d="M7 2H17V4H20V6H22V9H23V16H21V19H19V21H16V22H7V20H4V18H2V7H4V5H7Z"
        fill="#a34a15"/>
      <path d="M7 3H17V5H20V7H22V17H20V20H17V22H7V20H4V17H2V8H4V5H7Z"
        fill="#e7a329"/>
      <path d="M7 4H17V6H19V8H21V16H19V19H16V20H8V18H5V16H4V8H6V6H7Z"
        fill="#ffd15b"/>
      <path d="M7 5H15V7H18V9H19V16H17V18H9V17H7V15H5V9H7Z"
        fill="#ffdf80"/>
      <path d="M7 8H9V6H15V7H17V9H10V11H8V16H6V10H7Z"
        fill="#fff2ab"/>
      <path d="M14 18H18V16H20V13H21V17H19V20H15V21H10V20H14Z"
        fill="#bc6c1c"/>
      {/* Dark stamped G with a single illuminated top edge. */}
      <path d="M10 8H16V10H10V8ZM8 10H10V15H8V10ZM10 15H15V17H10V15ZM13 12H17V17H15V14H13V12Z"
        fill="#853b16"/>
      <path d="M10 8H15V9H10V8ZM8 10H9V14H8V10Z" fill="#b46b21"/>
      <rect x="4" y="8" width="2" height="2" fill="#ffef97"/>
      <rect x="17" y="18" width="2" height="2" fill="#ffc047"/>
    </svg>
  </span>;
}

// Use this for *all* Gold values so amounts, costs and payouts share one icon.
// Numbers retain the caller's type styling; aria-label includes the unit once.
export default function GoldAmount({value,prefix='',showLabel=false,size='sm'}){
  const formatted=Number(value).toLocaleString('en-US');
  const spokenPrefix=prefix==='+'?'plus ':prefix==='−'||prefix==='-'?'minus ':prefix;
  return <span className={'os-gold-amount os-gold-amount-'+size}
    role="img" aria-label={spokenPrefix+formatted+' Gold'}>
    <GoldCoin size={size}/>
    <span className="os-gold-amount-value" aria-hidden="true">{prefix}{formatted}</span>
    {showLabel&&<span className="os-gold-amount-label" aria-hidden="true">GOLD</span>}
  </span>;
}
