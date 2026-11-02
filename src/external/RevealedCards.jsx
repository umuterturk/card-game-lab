import React from 'react';
import {rank,suit,label} from './engines.js';
import {royalRank} from './overswingRoyals.js';
import {cardHistory} from './overswingHistory.js';
import {RoyalPortrait} from './RoyalPortrait.jsx';
import './revealedCards.css';

const SUITS=['♥','♦','♠','♣'];
const rankLabel=id=>royalRank(id)||(rank(id)===1?'A':String(rank(id)));
const GROUPS=[
  {id:'discard',title:'DISCARDED',description:'Cards already out of this deal',short:'OUT'},
  {id:'pot',title:'IN THE POT',description:'Exposed cards at risk until BANK',short:'POT'},
  {id:'hand',title:'YOUR HAND',description:'Cards you can currently STEER',short:'HAND'}
];
function RevealedMiniCard({id,zone}){
  const royal=royalRank(id),symbol=SUITS[suit(id)],red=suit(id)<2;
  const value=rankLabel(id);
  return <span className={'os8-revealed-card os8-revealed-'+zone+
    (red?' os8-revealed-red':' os8-revealed-black')+
    (royal?' os8-revealed-royal':'')}
    role="img" aria-label={label(id)+(royal?' '+royal+' Royal':'')+
      (zone==='discard'?' discarded':zone==='pot'?' in Pot':' in hand')}>
    <span className="os8-revealed-corner"><b>{value}</b><small>{symbol}</small></span>
    {royal?<RoyalPortrait id={id} size="history"/>:
      <span className="os8-revealed-pip" aria-hidden="true">{symbol}</span>}
    <span className="os8-revealed-footer" aria-hidden="true">{value}</span>
  </span>;
}
export default function RevealedCards({deal,onClose}){
  const history=cardHistory(deal);
  return <div className="os8-history-overlay" role="presentation">
    <section className="os8-history-dialog os8-revealed-dialog"
      role="dialog" aria-modal="true" aria-labelledby="os8-history-title">
      <div className="os8-history-head">
        <h3 id="os8-history-title">REVEALED CARDS</h3>
        <button type="button" onClick={onClose} aria-label="Close revealed cards">✕</button>
      </div>
      <div className="os8-history-stats" aria-label="Known cards in this deal">
        <span><strong>{history.revealed}</strong> REVEALED</span>
        <span><strong>{history.discarded}</strong> OUT</span>
        <span><strong>{history.potCount}</strong> POT</span>
        <span><strong>{history.handCount}</strong> HAND</span>
      </div>
      <div className="os8-revealed-sections">
        {GROUPS.map(group=><section key={group.id}
          className={'os8-revealed-section os8-revealed-section-'+group.id}
          aria-label={group.title}>
          <div className="os8-revealed-section-title">
            <h4>{group.title} <span>({history.groups[group.id].length})</span></h4>
            <small>{group.description}</small>
          </div>
          {history.groups[group.id].length?
            <div className="os8-revealed-gallery">
              {history.groups[group.id].map(id=><RevealedMiniCard key={id}
                id={id} zone={group.id}/>)}
            </div>:
            <p className="os8-revealed-empty">No cards here yet.</p>}
        </section>)}
      </div>
      <p className="os8-history-note">
        {history.unseen} unseen in the deck. This only shows cards you have seen;
        it does not reveal the next FLIP or the ordinary cards replaced by Royals.
      </p>
      <button type="button" className="os8-history-close" onClick={onClose}>BACK TO GAME</button>
    </section>
  </div>;
}
