import React,{useState,useEffect} from 'react';
import {rank,suit,signed,applySwing,overswingActions,overswingPayout,overswingMultiplier} from './engines.js';
import './overswing.css';
import {OVERSWING_TUTORIAL_STEPS,OVERSWING_TUTORIAL_INTRO} from './overswingTutorial.js';

const SUITS=['♥','♦','♠','♣'];
const name=id=>(rank(id)===1?'A':rank(id))+SUITS[suit(id)];
const val=n=>n>0?'+'+n:String(n);
const target={pot:'POT',discard:'ISKARTA'};
function Card({id,onClick,caption,chosen=false,mini=false}){
  return <button type="button" disabled={!onClick} onClick={onClick}
    className={'os8-card '+(suit(id)<2?'os8-red':'os8-black')+(chosen?' os8-selected':'')+(mini?' os8-mini':'')}
    aria-label={name(id)+' '+val(signed(id))+(caption?' '+caption:'')}>
    <span className="os8-card-top">{name(id)}</span>
    {!mini&&<strong>{val(signed(id))}</strong>}
    {!mini&&<small>{caption}</small>}
  </button>;
}
function Outcome({e}){
  if(!e)return <>Bir kart seç veya <b>FLIP</b> yap. Kırmızı sağa, siyah sola hareket eder.</>;
  if(e.type==='bank')return <><b>+{e.points.toLocaleString('tr-TR')} BANK</b> · Kapasite {e.oldCap} → {e.newCap}. {e.dropped!=null?name(e.dropped)+' çıkarıldı. ':''}{e.refilled?.length?'Elin yeniden dolduruldu.':''}</>;
  if(e.snap)return <><b>SNAP!</b> <b>{name(e.card)}</b> ile {val(e.from)} → {val(e.to)}. {e.lostPayout.toLocaleString('tr-TR')} olası puan kaybedildi.</>;
  if(e.zeroBreak)return <><b>ZERO BREAK!</b> {name(e.card)} ile {val(e.from)} → 0. <b>Tüm çarpanlar ×1 oldu.</b> Pot korunuyor{e.refilled?.length?', elin yenilendi':''}.</>;
  return <><b>{e.type==='flip'?'FLIP':'STEER'} {name(e.card)}</b> · {val(e.from)} → {val(e.to)} · <b>{target[e.destination]}</b>{e.swung?<b> · SWING +{e.gain}</b>:null}{e.swingPenalty?<b> · SWING −1</b>:null} · toplam ×{e.multiplier.toLocaleString('tr-TR')}{e.refilled?.length?' · Elin '+e.refilled.length+' kartla yenilendi.':''}</>;
}
const FACTOR_HELP={
  swing:{title:'SWING',text:'Sarkaç sıfırın bir tarafından diğerine geçtiğinde artar. Önceki konumun sıfıra uzaklığı 1–5 ise +1, 6–8 ise +2, 9–10 ise +3 kademe kazanırsın. Üst sınır yoktur. Sıfırı geçmeyen STEER, SWING’i 1 kademe azaltır (en az ×1). Tam 0’a gelmek ZERO BREAK’tir: bütün çarpanlar ×1 olur.'},
  flip:{title:'FLIP',text:'Sıfırı geçmeden yapılan ardışık FLIP hamlelerinde çarpan ×2, ×3, ×4… büyür. STEER veya sıfır geçişi bu ardışık sayacı durdurur; önceden kazanılmış FLIP çarpanı BANK, SNAP veya ZERO BREAK’e kadar korunur.'},
  combo:{title:'SERİ',text:'Üst üste iki FLIP yapınca ayrı bir ×2 bonus kazanırsın. Üçüncü ardışık FLIP sıfırı geçerse ayrıca ×3 daha kazanırsın. STEER art arda FLIP sayacını sıfırlar.'},
  cross:{title:'CROSS',text:'FLIP ile tam sıfıra basmadan karşı tarafa geçtiğinde ayrıca ×2 kazanırsın. Tekrar başarılı FLIP CROSS yaparsan bu bonuslar çarpılarak büyür. STEER ile sıfırı geçmek CROSS bonusu değil, SWING bonusu verir.'}
};
function Factor({id,label,value,onClick,expanded}){
  return <button type="button" className={'os8-factor '+(value>1?'os8-active':'')+(expanded?' os8-factor-open':'')}
      onClick={onClick} aria-expanded={expanded} aria-controls="os8-factor-help"
      aria-label={label+' çarpanı ×'+value+'. Açıklama için dokun'}>
    <span>{label} <span className="os8-info-icon" aria-hidden="true">ⓘ</span></span>
    <b>×{value.toLocaleString('tr-TR')}</b>
  </button>;
}
export default function OverswingPlay({s,act,restart}){
  const [discardPick,setDiscardPick]=useState(false);
  const [openFactor,setOpenFactor]=useState(null);
  const tutorial=s.mode==='tutorial';
  const tutorialStep=tutorial?OVERSWING_TUTORIAL_STEPS[s.tutorialStep]:null;
  const d=s.deal,legal=overswingActions(s),pot=d.pot.reduce((a,c)=>a+rank(c),0);
  const payout=overswingPayout(s),multiplier=overswingMultiplier(d);
  const total=s.dealTotals.reduce((a,b)=>a+b,0)+(s.status==='over'?0:d.T);
  const canFlip=legal.some(a=>a.type==='flip'),canBank=legal.some(a=>a.type==='bank');
  const nextCap=Math.max(2,d.handCap-1),mustDiscard=d.hand.length>nextCap;
  useEffect(()=>setDiscardPick(false),[s.dealIndex,d.bankCount,s.status]);
  const doSteer=index=>{if(discardPick){if(legal.some(a=>a.type==='bank'&&a.dropIndex===index)){act({type:'bank',dropIndex:index});setDiscardPick(false);}}else if(legal.some(a=>a.type==='steer'&&a.index===index))act({type:'steer',index});};
  const bank=()=>{if(mustDiscard)setDiscardPick(true);else act({type:'bank'});};
  return <div className="os8">
    <header className="os8-head">
      <div><span>{tutorial?'REHBERLİ EĞİTİM':'V10 · OVERSWING'}</span><h2>OVERSWING</h2></div>
      <div className="os8-settings">
        {!tutorial&&<button className="os8-tutorial-launch" type="button" onClick={()=>{setDiscardPick(false);setOpenFactor(null);restart('tutorial');}}>Eğitim</button>}
        <select value={s.mode} aria-label="Oyun modu" onChange={e=>{setDiscardPick(false);setOpenFactor(null);restart(e.target.value);}}>
          <option value="short">1 deste</option><option value="match">3 deste</option><option value="tutorial">Eğitim</option>
        </select>
        <button title="Yeniden başlat" aria-label="Yeniden başlat" onClick={()=>{setDiscardPick(false);restart(s.mode);}} type="button">↻</button>
      </div>
    </header>
    {tutorial&&<section className="os8-tutorial" aria-live="polite" aria-label="Zorunlu eğitim adımı">
      {!s.tutorialIntroDone?<div className="os8-tutorial-intro">
        <div className="os8-tutorial-head"><strong>BAŞLAMADAN ÖNCE</strong><span>4 temel kavram</span></div>
        <h3>Overswing nasıl oynanır?</h3>
        <p>Amacın sarkacı kontrol ederek Pot’u ve çarpanları büyütmek, doğru zamanda BANK yaparak puanı skoruna eklemek.</p>
        <div className="os8-tutorial-glossary">
          {OVERSWING_TUTORIAL_INTRO.map(item=><div className="os8-tutorial-term" key={item.term}>
            <div><span aria-hidden="true">{item.sign}</span><strong>{item.term}</strong></div>
            <p>{item.text}</p>
          </div>)}
        </div>
        <div className="os8-tutorial-example"><strong>Örnek:</strong> Pot 10 puan ve toplam çarpan ×3 ise BANK yaptığında <b>30 puan</b> skoruna eklenir.</div>
        <button type="button" className="os8-start-tutorial" onClick={()=>act({type:'tutorial-start'})}>Anladım, ilk FLIP ile başla</button>
        <small>Sonraki 17 hamlede yalnızca işaretli kart veya buton kullanılabilir.</small>
      </div>:tutorialStep?<><div className="os8-tutorial-head"><strong>ADIM {s.tutorialStep+1} / {OVERSWING_TUTORIAL_STEPS.length}</strong><span>Yalnızca işaretli hamle açık</span></div>
        <div className="os8-tutorial-progress"><span style={{width:((s.tutorialStep+1)/OVERSWING_TUTORIAL_STEPS.length*100)+'%'}}/></div>
        <h3>{tutorialStep.title}</h3>
        <p>{discardPick?'Şimdi işaretli kartı seçerek BANK işlemini tamamla.':tutorialStep.instruction}</p>
        <small>{tutorialStep.why}</small>
      </>:<><h3>Eğitimi tamamladın!</h3><p>Dört çarpanı, STEER cezasını, ZERO BREAK’i ve riskleri gördün. Artık normal oyunu deneyebilirsin.</p>
        <button type="button" onClick={()=>restart('short')}>Normal oyuna başla</button>
        <button type="button" onClick={()=>restart('tutorial')}>Eğitimi tekrarla</button>
      </>}
      {tutorialStep&&s.tutorialIntroDone&&<button type="button" className="os8-tutorial-exit" onClick={()=>restart('short')}>Eğitimden çık</button>}
    </section>}
    <div className="os8-legend"><span className="os8-redtext">♥ ♦ <b>+</b> SAĞA</span><span>♠ ♣ <b>−</b> SOLA</span><span>0 = ÇARPAN SIFIR</span><span>±10 = sınır</span></div>
    <div className="os8-scoreline">
      <div><small>SKOR</small><b>{total.toLocaleString('tr-TR')}</b></div>
      <div><small>POT</small><b>{pot}</b></div>
      <div><small>ÇARPAN</small><b>×{multiplier.toLocaleString('tr-TR')}</b></div>
      <div><small>BANK</small><b>+{payout.toLocaleString('tr-TR')}</b></div>
    </div>
    <section className="os8-meter" aria-label={'Sarkaç '+val(d.S)}>
      <div className="os8-meter-heading"><strong>SARKAÇ</strong><b>{val(d.S)}</b></div>
      <div className="os8-track"><span className="os8-zero"/><span className="os8-pointer" style={{left:((d.S+10)*5)+'%'}}/></div>
      <div className="os8-ticks"><span>−10</span><span>−5</span><span>0</span><span>+5</span><span>+10</span></div>
      <div className="os8-zero-warning">Tam 0: tüm çarpanlar ×1 · Sıfırı geçmek: bonus</div>
    </section>
    <div className="os8-factors" aria-label="Çarpan ayrıntıları; bilgi almak için çarpana dokun">
      <Factor id="swing" label="SWING" value={d.W+1} onClick={()=>setOpenFactor(openFactor==='swing'?null:'swing')} expanded={openFactor==='swing'}/>
      <Factor id="flip" label="FLIP" value={d.flipFactor} onClick={()=>setOpenFactor(openFactor==='flip'?null:'flip')} expanded={openFactor==='flip'}/>
      <Factor id="combo" label="SERİ" value={d.comboFactor} onClick={()=>setOpenFactor(openFactor==='combo'?null:'combo')} expanded={openFactor==='combo'}/>
      <Factor id="cross" label="CROSS" value={d.crossFactor} onClick={()=>setOpenFactor(openFactor==='cross'?null:'cross')} expanded={openFactor==='cross'}/>
    </div>
    {openFactor&&<div id="os8-factor-help" className="os8-factor-tooltip" role="region" aria-label={FACTOR_HELP[openFactor].title+' açıklaması'}>
      <div className="os8-tooltip-header"><strong>{FACTOR_HELP[openFactor].title} nasıl çalışır?</strong><button type="button" aria-label="Açıklamayı kapat" onClick={()=>setOpenFactor(null)}>×</button></div>
      <p>{FACTOR_HELP[openFactor].text}</p>
    </div>}
    <div className={'os8-event '+(s.lastAction?.snap?'os8-snap':s.lastAction?.zeroBreak?'os8-zero-break':'')} role="status" aria-live="polite">
      {s.lastAction?.card!=null&&<Card id={s.lastAction.card} mini/>}
      <p><Outcome e={s.lastAction}/></p>
    </div>
    <section className="os8-hand">
      <div className="os8-section-heading"><h3>{discardPick?'BANK: BİR KART ÇIKAR':'ELİN'}</h3><span>{d.hand.length}/{d.handCap} kart · BANK sonrası kapasite {nextCap}</span></div>
      {discardPick&&<p className="os8-attention">El kapasitesi {d.handCap} → {nextCap} düşecek. {tutorial?'Yalnızca işaretli kartı çıkar.':'Çıkarmak istediğin karta dokun.'} <button type="button" onClick={()=>setDiscardPick(false)}>Vazgeç</button></p>}
      <div className="os8-handcards">
        {d.hand.map((id,index)=>{
          const o=applySwing(d.S,d.W,signed(id));
          const caption=discardPick?'ÇIKAR':o.snap?'SNAP':d.S!==0&&o.S===0?'ZERO BREAK':d.plays===0||o.swung?'POT +'+rank(id):d.W>0?'SWING −1':'ISKARTA';
          const allowed=discardPick?legal.some(a=>a.type==='bank'&&a.dropIndex===index):legal.some(a=>a.type==='steer'&&a.index===index);
          const highlighted=tutorial&&allowed;
          return <Card key={id} id={id} chosen={highlighted||(!tutorial&&discardPick)} onClick={allowed?()=>doSteer(index):null} caption={caption}/>;
        })}
        {!d.hand.length&&<p className="os8-empty">El boş. Destede kart varsa otomatik olarak kapasiteye kadar doldurulur.</p>}
      </div>
    </section>
    <div className="os8-actions">
      <button type="button" disabled={!canFlip||discardPick} className={'os8-flip '+(tutorial&&canFlip?'os8-guide-action':'')} onClick={()=>act({type:'flip'})}>
        <b>FLIP</b><small>Kapalı kart aç · {40-d.pos} kaldı</small><small>Seri: {d.flipStreak} FLIP</small>
      </button>
      <button type="button" disabled={!canBank||discardPick} className={'os8-bank '+(tutorial&&canBank?'os8-guide-action':'')} onClick={bank}>
        <b>BANK +{payout.toLocaleString('tr-TR')}</b><small>Kasaya al · Kapasite {d.handCap} → {nextCap}</small>
      </button>
    </div>
    <section className="os8-pot">
      <div className="os8-section-heading"><h3>POT</h3><span>{d.pot.length} kart · {pot} puan</span></div>
      <div className="os8-potcards">{d.pot.map(c=><Card key={c} id={c} mini/>)}{!d.pot.length&&<span className="os8-empty">Henüz boş</span>}</div>
    </section>
    <footer className="os8-footer">
      <span>{s.mode==='match'?'Deste '+(s.dealIndex+1)+'/3 · ':''}{d.pos}/40 kart çekildi</span>
      <details><summary>Kurallar ve çarpanlar</summary>
        <p>8 kartla başlarsın. ♥ ♦ artı, ♠ ♣ eksi. Sarkaç ±10 sınırını aşarsa Pot kaybolur.</p>
        <p>FLIP her zaman Pot’a gider. Sıfırı geçmeyen arka arkaya FLIP’lerde FLIP çarpanı ×2, ×3, ×4… büyür.</p>
        <p>Üst üste 2 FLIP ayrıca SERİ ×2 getirir. Üçüncü FLIP sıfırı geçerse SERİ ayrıca ×3 daha kazanır. Sıfırı geçen her FLIP CROSS ×2 verir.</p>
        <p>ZERO BREAK: FLIP veya STEER tam sıfıra gelirse SWING, FLIP, SERİ ve CROSS dahil bütün çarpanlar ×1 olur; FLIP serisi sıfırlanır. Pot kaybolmaz. Sıfırın karşı tarafına gerçekten geçmek ise bonus verir.</p>
        <p>STEER art arda FLIP sayacını sıfırlar. Sıfırı geçmeyen STEER, SWING çarpanından bir kademe düşürür (alt sınır ×1); diğer çarpanlar korunur. Kazanılan çarpanlar BANK, SNAP veya ZERO BREAK’e kadar çarpılarak korunur.</p>
        <p>İlk STEER, sıfırı geçen STEER ve ZERO BREAK yapan STEER Pot’a girer; diğer STEER kartları iskartaya gider.</p>
        <p>BANK için en az 2 kart hamlesi gerekir. BANK yaptıkça el kapasitesi 8 → 7 → … → 2 azalır. Fazla el kartın varsa hangisini çıkaracağını seçersin.</p>
        <p>Elin sıfıra indiğinde, kapalı destede yeterli kart varsa yeni elin mevcut maksimum kapasiteye kadar otomatik dolar.</p>
        <p>Çarpanlar deneysel; skor hedefleri henüz yeniden kalibre edilmedi.</p>
      </details>
    </footer>
    {s.status==='over'&&<div className="os8-complete"><h3>Oyun bitti</h3><b>{s.dealTotals.reduce((a,b)=>a+b,0).toLocaleString('tr-TR')} puan</b><button type="button" onClick={()=>restart(s.mode)}>Yeni oyun</button></div>}
  </div>;
}
