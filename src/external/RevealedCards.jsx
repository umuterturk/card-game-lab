import React from 'react';
import {rank,suit,label} from './engines.js';
import GoldAmount from './GoldCoin.jsx';
import {journeyGoldBalance} from './overswingJourney.js';
import {revealOffer,sortDeckCards} from './overswingReveal.js';
import './revealedCards.css';

const SUITS=['♥','♦','♠','♣'];
const rankLabel=id=>rank(id)===1?'A':String(rank(id));
function RevealedMiniCard({id}){
  const symbol=SUITS[suit(id)],red=suit(id)<2,value=rankLabel(id);
  return <span className={'os8-revealed-card os8-revealed-deck'+
    (red?' os8-revealed-red':' os8-revealed-black')}
    role="img" aria-label={label(id)+' still in the deck'}>
    <span className="os8-revealed-corner"><b>{value}</b><small>{symbol}</small></span>
    <span className="os8-revealed-pip" aria-hidden="true">{symbol}</span>
    <span className="os8-revealed-footer" aria-hidden="true">{value}</span>
  </span>;
}
export default function RevealedCards({deal,run,onPurchase,onClose}){
  const remaining=deal.deck.slice(deal.pos);
  const paid=new Set(run?.revealedCardIds||[]);
  // Cards that have already been drawn are no longer future deck cards.
  const cards=remaining.filter(id=>paid.has(id)).sort(sortDeckCards);
  const offer=revealOffer(run),gold=journeyGoldBalance(run);
  return <div className="os8-history-overlay" role="presentation">
    <section className="os8-history-dialog os8-revealed-dialog"
      role="dialog" aria-modal="true" aria-labelledby="os8-history-title">
      <div className="os8-history-head">
        <h3 id="os8-history-title">REVEALED DECK</h3>
        <button type="button" onClick={onClose} aria-label="Close revealed deck">✕</button>
      </div>
      <div className="os8-history-stats" aria-label="Unseen deck intelligence">
        <span><strong>{remaining.length}</strong> IN DECK</span>
        <span><strong>{cards.length}</strong> KNOWN</span>
        <span><strong>{remaining.length-cards.length}</strong> HIDDEN</span>
      </div>
      <div className="os8-reveal-shop" aria-label="Purchase unrevealed deck cards">
        <p>Reveal every card still in the deck. Cards are sorted by rank
          and suit, never by draw order. The fewer cards remain, the more
          powerful the information—and the higher its Gold price.</p>
        <div className="os8-reveal-wallet">AVAILABLE <GoldAmount value={gold}/></div>
        {offer?<button className="os8-reveal-all" type="button"
          disabled={gold<offer.price} onClick={()=>onPurchase?.()}
          aria-label={'Reveal all '+offer.count+' deck cards for '+offer.price+' Gold'}>
          <strong>REVEAL ALL {offer.count} CARDS</strong>
          <GoldAmount value={offer.price}/>
        </button>:
        <p className="os8-revealed-empty">
          {run?.revealPurchaseCount?'Already revealed this gate.':'No cards left to reveal.'}
        </p>}
      </div>
      <section className="os8-revealed-section os8-revealed-section-deck"
        aria-label="Purchased cards remaining in the deck">
        <div className="os8-revealed-section-title">
          <h4>REVEALED DECK CARDS <span>({cards.length})</span></h4>
          <small>SORTED BY RANK · THEN SUIT</small>
        </div>
        {cards.length?<div className="os8-revealed-gallery">
          {cards.map(id=><RevealedMiniCard key={id} id={id}/>)}
        </div>:<p className="os8-revealed-empty">Buy a reveal to see future deck cards.</p>}
      </section>
      <p className="os8-history-note">Drawn cards disappear from this preview.
        The paid peek reveals identities, not their draw sequence or the next FLIP.</p>
      <button type="button" className="os8-history-close" onClick={onClose}>BACK TO GAME</button>
    </section>
  </div>;
}
