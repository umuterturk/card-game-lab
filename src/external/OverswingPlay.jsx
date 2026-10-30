import React from 'react';
import {rank,suit,label,signed,applySwing,overswingActions,overswingPayout} from './engines.js';
import './overswing.css';

const SUITS=['♥','♦','♠','♣'];
const sign=n=>n>0?'+'+n:String(n);
const where={hand:'ELE',pot:'POT’A',discard:'ISKARTAYA'};
function PlayingCard({id,onClick,helper,highlight=false}){
  const red=suit(id)<2;
  const Tag=onClick?'button':'div';
  return <Tag type={onClick?'button':undefined} onClick={onClick} className={'os-card '+(red?'os-red':'os-black')+(onClick?' os-selectable':'')+(highlight?' os-highlight':'')} aria-label={label(id)+' '+(red?'kırmızı, artı':'siyah, eksi')+(helper?' '+helper:'')}>
    <span className="os-corner">{rank(id)===1?'A':rank(id)}<span>{SUITS[suit(id)]}</span></span>
    <span className="os-suit">{SUITS[suit(id)]}</span>
    <span className="os-value">{sign(signed(id))}</span>
    {helper&&<span className="os-helper">{helper}</span>}
  </Tag>;
}
function Info({title,value,sub}){return <div className="os-info"><span>{title}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;}
function ResolveText({e}){
  if(!e)return <p>Başlamak için kapalı desteye dokun. İlk kart mutlaka açılır ve Pot’a eklenir.</p>;
  if(e.type==='bank')return <p><strong>Kasaya alındı:</strong> {e.pot} × {e.multiplier} = <strong>{e.points} puan</strong>. Pot boşaldı, sarkaç ve çarpan sıfırlandı.</p>;
  const card=label(e.card),source=e.type==='flip'?'FLIP':'STEER';
  if(e.snap)return <p><strong>SNAP!</strong> {source} ile açılan/oynanan <strong>{card}</strong>, {sign(e.from)} → {sign(e.to)} noktasına taşacaktı. Sınır ±10! Kart iskartaya gitti, Pot’taki <strong>{e.lost} puan kaybedildi</strong>. Eldeki kartlar korundu.</p>;
  return <p><strong>{source} — {card}:</strong> Sarkaç {sign(e.from)} → {sign(e.to)}. Kart <strong>{where[e.destination]}</strong> gitti. {e.swung?'Sıfır geçildi! ':'Sıfır geçilmedi. '}{e.gain>0?'Çarpan +'+e.gain+' arttı. ':''}{e.destination==='pot'?'Pot’a +'+e.addedToPot+' puan eklendi. ':''}{e.destination==='hand'?'Elinde artık yönlendirmek için bu kart var. ':''}{e.destination==='discard'?'STEER kartı sıfırı geçmediği için puan vermedi.':''}</p>;
}
export default function OverswingPlay({s,act,restart}){
  const d=s.deal;
  const legal=overswingActions(s);
  const canFlip=legal.some(a=>a.type==='flip');
  const canBank=legal.some(a=>a.type==='bank');
  const total=s.dealTotals.reduce((v,n)=>v+n,0)+(s.status==='over'?0:d.T);
  const pot=d.pot.reduce((v,c)=>v+rank(c),0);
  const e=s.lastAction;
  const lastFlip=s.lastFlip;
  return <div className="os-game">
    <section className="os-guide" aria-label="Kısa kurallar">
      <strong>Nasıl oynanır?</strong>
      <p><b>1.</b> Kapalı kartı aç (<b>FLIP</b>). <b>2.</b> Elindeki kartla sarkacı yönlendir (<b>STEER</b>). <b>3.</b> Sınırı aşmadan puanını kasaya al (<b>BANK</b>).</p>
      <div className="os-key"><span className="os-red-legend">♥ ♦ Kırmızı = sağa (+)</span><span className="os-black-legend">♠ ♣ Siyah = sola (−)</span></div>
      <p className="os-guide-small">Sıfırı geçmek çarpanı büyütür. ±10 güvenli, ±11 ve ötesi <b>SNAP</b>: Pot kaybolur.</p>
    </section>
    <div className="os-topline"><label>Oyun modu <select value={s.mode} onChange={v=>restart(v.target.value)} aria-label="Oyun modu"><option value="short">Kısa · 1 deste</option><option value="match">Maç · 3 deste</option></select></label><span>{s.mode==='match'?'Deste '+(s.dealIndex+1)+' / 3':'Tek deste'}</span></div>
    <div className="os-stats"><Info title="Toplam puan" value={total}/><Info title="Pot" value={pot}/><Info title="Çarpan" value={'×'+(d.W+1)}/><Info title="Şimdi BANK" value={overswingPayout(s)}/></div>
    <section className="os-meter" aria-label={'Sarkaç konumu '+sign(d.S)}>
      <div className="os-meter-title"><strong>SARKAÇ</strong><span className="os-position">{sign(d.S)}</span></div>
      <div className="os-track">
        <span className="os-zero" aria-hidden="true"/>
        <span className="os-marker" style={{left:((d.S+10)*5)+'%'}} aria-hidden="true"/>
      </div>
      <div className="os-ticks"><span>−10</span><span>−5</span><span>0</span><span>+5</span><span>+10</span></div>
      <small>Karşı tarafa geçince çarpan yükselir; kasaya almazsan mevcut Pot riskte.</small>
    </section>
    <section className="os-action-result" role="status" aria-live="polite">
      <div className="os-section-head"><strong>SON HAMLE</strong><span>{e&&e.type==='flip'?'Kapalı kart açıldı':e&&e.type==='steer'?'Elden kart oynandı':e&&e.type==='bank'?'Puan kasaya alındı':'Başlangıç'}</span></div>
      <ResolveText e={e}/>
    </section>
    <section className="os-last-flip">
      <div className="os-section-head"><strong>SON FLIP KARTI</strong><span>{lastFlip?'Kartın ilk gittiği yer':'Henüz açılmadı'}</span></div>
      {lastFlip?<div className="os-flow"><span className="os-source">KAPALI DESTE</span><span aria-hidden="true">→</span><PlayingCard id={lastFlip.card} highlight/><span aria-hidden="true">→</span><strong className={'os-destination '+(lastFlip.destination==='hand'?'os-dest-hand':lastFlip.destination==='pot'?'os-dest-pot':'os-dest-discard')}>{where[lastFlip.destination]}</strong></div>:<p className="os-muted">Açtığın ilk kart burada görünecek. Sıfırı geçen FLIP kartı, elinde yer varsa eline; aksi halde Pot’a gider.</p>}
      {lastFlip?.swung&&lastFlip.destination==='hand'&&<p className="os-tiny">Bu kart sıfırı geçtiği için eline yakalandı. Artık STEER ile kullanabilirsin.</p>}
    </section>
    <div className="os-play-sections">
      <section className="os-hand">
        <div className="os-section-head"><strong>ELİN · {d.hand.length}/3</strong><span>Dokun = STEER</span></div>
        {d.hand.length?<div className="os-cards">{d.hand.map((c,i)=>{
          const result=applySwing(d.S,d.W,signed(c));
          const hint=result.snap?'SNAP!':result.swung?'POT +'+rank(c)+' · ×'+(result.W+1):'İskarta · 0 puan';
          return <PlayingCard key={c} id={c} helper={canBank?hint:'Pot boşken kullanılamaz'} onClick={canBank?()=>act({type:'steer',index:i}):undefined}/>;
        })}</div>:<p className="os-muted">El boş. FLIP ile sıfırı geçen bir kart yakalayabilirsin.</p>}
        <small>STEER kartı sıfırı geçerse Pot’a, geçmezse iskartaya gider. SNAP yapan kart da kaybolur.</small>
      </section>
      <section className="os-pot">
        <div className="os-section-head"><strong>POT · {d.pot.length} kart</strong><span>Toplam {pot} puan</span></div>
        {d.pot.length?<div className="os-cards">{d.pot.map(c=><PlayingCard key={c} id={c}/>)}</div>:<p className="os-muted">Pot boş. Açtığın her kart burada görünmeyebilir: sıfırı geçen FLIP kartı elinde yer varsa eline gider.</p>}
        <div className="os-formula">Pot {pot} × Çarpan {d.W+1} = <b>{overswingPayout(s)} puan</b></div>
      </section>
    </div>
    <div className="os-main-actions">
      <button type="button" className="os-flip" disabled={!canFlip} onClick={()=>act({type:'flip'})}>
        <span className="os-deck-back" aria-hidden="true">✦</span><span><strong>FLIP · KAPALI KART AÇ</strong><small>Kalan {40-d.pos} kart · Ne çıkacağı bilinmiyor</small></span>
      </button>
      <button type="button" className="os-bank" disabled={!canBank} onClick={()=>act({type:'bank'})}>
        <strong>BANK · {overswingPayout(s)} PUANI KASAYA AL</strong><small>Bu Pot artık kaybolmaz</small>
      </button>
    </div>
    {s.status==='over'&&<section className="os-finished"><h3>Oyun bitti</h3><strong>{s.dealTotals.reduce((v,n)=>v+n,0)} puan</strong><p>{s.dealTotals.reduce((v,n)=>v+n,0)>=(s.mode==='match'?2100:800)?'Masterful!':s.dealTotals.reduce((v,n)=>v+n,0)>=(s.mode==='match'?1500:500)?'Win!':'Tekrar dene!'}</p><button type="button" onClick={()=>restart(s.mode)}>Yeni oyun</button></section>}
    <details className="os-details"><summary>Detaylı kurallar ve kartların nereye gittiği</summary><ul>
      <li>Başlangıçta elinde 2 kart, 38 kapalı kart vardır. Her yeni seride ilk FLIP zorunludur.</li>
      <li>FLIP sıfırı geçmezse açılan kart Pot’a girer. Sıfırı geçerse elde yer varsa ele gelir, el doluysa Pot’a girer.</li>
      <li>STEER elinden oynanır: sıfırı geçerse kart Pot’a eklenir, geçmezse puan vermeden iskartaya gider.</li>
      <li>Sıfırı geçmeden önceki uzaklık 1–2 ise +0, 3–5 ise +1, 6–8 ise +2, 9–10 ise +3 çarpan kademesi. Üst sınır ×6.</li>
      <li>SNAP olursa yalnızca o serideki Pot ve SNAP yapan kart kaybolur. Elin korunur.</li>
      <li>BANK = Pot’taki kartların sayı toplamı × mevcut çarpan. Sonraki seride sarkaç sıfır, çarpan ×1 olur.</li>
      <li>Kapalı kartlar bitince BANK veya SNAP sonrası deste tamamlanır. Elde kalan kartlar puan vermez.</li>
    </ul></details>
    <div className="os-discard">İskarta: {d.discard.length} kart · Bu destede açılan: {d.flips}/38</div>
  </div>;
}
