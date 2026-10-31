import React from 'react';
import {rank,suit,signed,applySwing,overswingActions,overswingPayout} from './engines.js';
import './overswing.css';

const SIGNS=['♥','♦','♠','♣'];
const val=n=>n>0?'+'+n:String(n);
const cardName=id=>(rank(id)===1?'A':rank(id))+SIGNS[suit(id)];
const destination={hand:'ELİNE',pot:'POT’A',discard:'ISKARTAYA'};
function Card({id,onClick,hint}){
  const red=suit(id)<2;
  return <button type="button" disabled={!onClick} onClick={onClick}
    className={'os7-card '+(red?'os7-red':'os7-black')}
    aria-label={cardName(id)+', '+val(signed(id))+', '+hint}>
    <span className="os7-corner">{cardName(id)}</span>
    <strong>{SIGNS[suit(id)]}</strong>
    <small>{hint}</small>
  </button>;
}
function Mini({id}){return <span className={'os7-mini '+(suit(id)<2?'os7-red':'os7-black')}>{cardName(id)}</span>;}
function Event({e}){
  if(!e)return <>Başlangıç: elinden bir kart seç veya FLIP yap.</>;
  if(e.type==='bank')return <>BANK: <b>+{e.points} puan.</b> {e.refill!=null?'Eline 1 kart geldi.':'Yeni kart çekilmedi.'}</>;
  if(e.snap)return <><b>SNAP!</b> {cardName(e.card)}: {val(e.from)} → {val(e.to)}. <b>{e.lost} puan kaybedildi.</b></>;
  return <><b>{e.type==='flip'?'FLIP':'STEER'} {cardName(e.card)}</b>: {val(e.from)} → {val(e.to)} · <b>{destination[e.destination]}</b> {e.gain>0?'· Çarpan +'+e.gain:''}</>;
}
export default function OverswingPlay({s,act,restart}){
  const d=s.deal,actions=overswingActions(s);
  const flip=actions.some(a=>a.type==='flip');
  const bankable=actions.some(a=>a.type==='bank');
  const pot=d.pot.reduce((sum,id)=>sum+rank(id),0);
  const bank=overswingPayout(s);
  const total=s.dealTotals.reduce((sum,x)=>sum+x,0)+(s.status==='over'?0:d.T);
  return <div className="os7">
    <header className="os7-heading">
      <div><span className="os7-eyebrow">V7 · DENEYSEL</span><h2>Overswing</h2></div>
      <div className="os7-tools"><select aria-label="Oyun modu" value={s.mode} onChange={e=>restart(e.target.value)}><option value="short">1 deste</option><option value="match">3 deste</option></select><button type="button" onClick={()=>restart(s.mode)}>↻ Yenile</button></div>
    </header>
    <div className="os7-ruleline"><span className="os7-red">♥ ♦ sağa (+)</span><span>♠ ♣ sola (−)</span><span>0'ı geç → × artır</span></div>
    <div className="os7-stats">
      <div><small>SKOR</small><b>{total}</b></div><div><small>POT</small><b>{pot}</b></div>
      <div><small>ÇARPAN</small><b>×{d.W+1}</b></div><div className="os7-gold"><small>BANK</small><b>+{bank}</b></div>
    </div>
    <div className="os7-pendulum" aria-label={'Sarkaç '+val(d.S)}>
      <div className="os7-barhead"><strong>SARKAÇ</strong><b>{val(d.S)}</b></div>
      <div className="os7-rail"><span className="os7-center"/><span className="os7-pin" style={{left:((d.S+10)*5)+'%'}}/></div>
      <div className="os7-ticks"><span>−10</span><span>−5</span><span>0</span><span>+5</span><span>+10</span></div>
    </div>
    <div className={'os7-event '+(s.lastAction?.snap?'os7-danger':'')} role="status" aria-live="polite"><Event e={s.lastAction}/></div>
    <section className="os7-hand">
      <div className="os7-rowtitle"><h3>ELİN <small>{d.hand.length}/4</small></h3><span>Bir karta dokun → STEER</span></div>
      <div className="os7-handcards">{d.hand.length?d.hand.map((id,index)=>{
        const outcome=applySwing(d.S,d.W,signed(id));
        const hint=outcome.snap?'SNAP':d.plays===0?'POT +'+rank(id):outcome.swung?'POT +'+rank(id):'İskarta';
        return <Card key={id} id={id} hint={hint} onClick={actions.some(a=>a.type==='steer'&&a.index===index)?()=>act({type:'steer',index}):null}/>;
      }):<span className="os7-empty">El boş. FLIP ile devam et.</span>}</div>
      <p className="os7-hint">{d.plays===0?'İlk kartı elinden oynayabilir veya FLIP yapabilirsin.':'STEER sıfırı geçerse Pot’a gider; geçmezse iskartaya.'}</p>
    </section>
    <div className="os7-actions">
      <button type="button" className="os7-flip" onClick={()=>act({type:'flip'})} disabled={!flip}><b>FLIP</b><small>Kapalı kart aç · {40-d.pos} kaldı</small></button>
      <button type="button" className="os7-bank" onClick={()=>act({type:'bank'})} disabled={!bankable}><b>BANK +{bank}</b><small>{bankable?'Puanı koru · 1 kart çek':d.plays<2?'Önce '+(2-d.plays)+' hamle daha':'Pot boş'}</small></button>
    </div>
    <div className="os7-pot">
      <div className="os7-rowtitle"><h3>POT</h3><span>{d.pot.length} kart · {pot} puan</span></div>
      <div className="os7-minis">{d.pot.length?d.pot.map(id=><Mini key={id} id={id}/>):<span className="os7-empty">Boş</span>}</div>
    </div>
    {s.lastFlip&&<p className="os7-lastflip">Son FLIP: <Mini id={s.lastFlip.card}/> → <b>{destination[s.lastFlip.destination]}</b></p>}
    <footer className="os7-footer"><span>{s.mode==='match'?'Deste '+(s.dealIndex+1)+'/3 · ':''}{d.pos}/40 kart kullanıldı</span>
      <details><summary>Kurallar (30 saniye)</summary>
        <p>4 kartla başlarsın. İlk hamle FLIP veya elinden kart (STEER) olabilir. Açılış STEER kartı Pot’a gider.</p>
        <p>♥ ♦ artı, ♠ ♣ eksi. Sıfırı geçince çarpan artar. ±10 güvenli; ±11 ve ötesi SNAP, Pot kaybolur.</p>
        <p>FLIP sıfırı geçerse ve elinde yer varsa kart eline gelir, yoksa Pot’a. STEER yalnızca sıfırı geçince Pot’a eklenir (açılış hariç).</p>
        <p>BANK için aynı seride en az 2 kart hamlesi gerekir. BANK puanı korur ve elinde yer varsa desteden sadece 1 kart çeker. SNAP kart kazandırmaz.</p>
        <p>Bu deneysel sürümün puan hedefleri henüz kalibre edilmedi.</p>
      </details>
    </footer>
    {s.status==='over'&&<div className="os7-done"><h3>Oyun bitti</h3><b>{s.dealTotals.reduce((sum,x)=>sum+x,0)} puan</b><button type="button" onClick={()=>restart(s.mode)}>Yeni oyun</button></div>}
  </div>;
}
