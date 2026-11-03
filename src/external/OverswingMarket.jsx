import React from 'react';
import GoldAmount from './GoldCoin.jsx';
import {ROYAL_NAMES,ROYAL_PRICES,ROYAL_RULES} from './overswingRoyals.js';
import {WILD_IDS,WILD_RULES} from './overswingWilds.js';
import {MARKET_WILD_PRICES} from './overswingJourney.js';
import './overswingMarket.css';

const fmt=n=>Number(n).toLocaleString('en-US');
export default function OverswingMarket({progress,onBack,onRoyal,onWild,disabled=false,pendingPurchase=null}){
  const balance=progress.lifetimeGold||0,owned=progress.ownedRoyalIds||[];
  return <main className="oj-shell om-market" aria-label="Market">
    <header className="om-head">
      <button className="oj-back" type="button" onClick={onBack} disabled={!!pendingPurchase}>‹ MAP</button>
      <h1>MARKET</h1>
      <strong data-oj-treasury><GoldAmount value={balance}/></strong>
    </header>
    {disabled&&<p className="om-lock">PURCHASES LOCKED DURING A FIGHT</p>}
    <section className="om-section" aria-label="Permanent Royal cards">
      <div className="om-section-heading"><strong>ROYALS</strong><small>PERMANENT · AUTO-EQUIPPED</small></div>
      <div className="om-items">{ROYAL_NAMES.map(id=>{
        const has=owned.includes(id),price=ROYAL_PRICES[id],info=ROYAL_RULES[id];
        return <button key={id} type="button" className={'om-item'+(has?' om-owned':'')+(pendingPurchase==='royal:'+id?' om-buying':'')}
          disabled={has||disabled||!!pendingPurchase||balance<price} onClick={e=>onRoyal(id,e.currentTarget)}
          title={info.description} aria-label={has?info.title+' owned':'Buy '+info.title+' for '+fmt(price)+' Gold'}>
          <span className="om-item-symbol om-royal-symbol">{id}</span>
          <span className="om-item-name">{info.title}</span>
          <span className="om-item-price">{has?'OWNED':<GoldAmount value={price}/>}</span>
        </button>;
      })}</div>
    </section>
    <section className="om-section" aria-label="Consumable Wild cards">
      <div className="om-section-heading"><strong>WILDS</strong><small>ONE USE PER GATE</small></div>
      <div className="om-items">{WILD_IDS.map(id=>{
        const info=WILD_RULES[id],price=MARKET_WILD_PRICES[id];
        return <button key={id} type="button" className={'om-item'+(pendingPurchase==='wild:'+id?' om-buying':'')}
          disabled={disabled||!!pendingPurchase||balance<price} onClick={e=>onWild(id,e.currentTarget)}
          title={info.description}
          aria-label={'Buy '+info.name+' for '+fmt(price)+' Gold'}>
          <span className="om-item-symbol">{info.symbol}</span>
          <span className="om-item-name">{info.name.replace('WILD ','')}
            <small>×{progress.wildInventory?.[id]||0}</small></span>
          <span className="om-item-price"><GoldAmount value={price}/></span>
        </button>;
      })}</div>
    </section>
  </main>;
}
