import React from 'react';
import {createPortal} from 'react-dom';
import GoldAmount,{GoldCoin} from './GoldCoin.jsx';
import {bankCoinCount} from './overswingFlipFlight.js';
import './overswing.css';
import './overswingPurchaseFlight.css';

// Reuse BANK's existing pixel-coin sprite, fan, timing and flight keyframes.
// Only the endpoints are swapped: Treasury -> purchased item.
export default function OverswingPurchaseFlight({purchase}){
  if(!purchase||typeof document==='undefined')return null;
  const {style,price,label,serial}=purchase;
  const count=Math.min(16,bankCoinCount(price));
  return createPortal(<div className="os8-bank-burst oj-purchase-burst"
    key={serial} aria-label={'Spent '+price+' Gold on '+label} role="status">
    {Array.from({length:count},(_,i)=>{
      const angle=(i/count)*Math.PI*2,radius=22+(i%5)*13;
      const fanX=Math.round(Math.cos(angle)*radius);
      const fanY=Math.round(Math.abs(Math.sin(angle))*radius);
      const vars={...style,
        '--fan-x':fanX+'px','--fan-y':fanY+'px',
        '--fan-x-quarter':Math.round(fanX*.24)+'px',
        '--bank-delay':((i%7)*33)+'ms'};
      return <span className="os8-bank-flying-coin" key={i}
        style={vars} aria-hidden="true"><GoldCoin size="lg" shine={false}/></span>;
    })}
    <div className="os8-bank-burst-label oj-purchase-label" style={style}
      aria-hidden="true">
      <GoldAmount value={price} prefix="−" size="lg"/>
      <span>{label}</span>
    </div>
  </div>,document.body);
}
