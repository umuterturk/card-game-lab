import React,{useState,useEffect} from 'react';
import {rank,suit,signed,applySwing,overswingActions,overswingPayout,overswingMultiplier} from './engines.js';
import './overswing.css';
import {OVERSWING_TUTORIAL_STEPS,OVERSWING_TUTORIAL_INTRO} from './overswingTutorial.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';

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

function FlameMeter({position}){
  const t=Math.PI-(position+10)/20*Math.PI;
  const x=200+147*Math.cos(t),y=184-147*Math.sin(t);
  const n=position>0?'+'+position:String(position);
  return <div className="os8-flame-meter">
    <svg viewBox="0 0 400 205" role="img" aria-label={'Pendulum '+n+' on a scale from minus ten to plus ten'}>
      <defs>
        <linearGradient id="os8-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#776c6a"/><stop offset=".48" stopColor="#322c36"/>
          <stop offset="1" stopColor="#e26b28"/>
        </linearGradient>
        <linearGradient id="os8-flame-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#101722"/><stop offset=".5" stopColor="#241b21"/>
          <stop offset="1" stopColor="#77200d"/>
        </linearGradient>
        <linearGradient id="os8-needle" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7d1f"/><stop offset=".5" stopColor="#ffdf84"/><stop offset="1" stopColor="#ffb639"/>
        </linearGradient>
      </defs>
      <path d="M 22 184 A 178 178 0 0 1 378 184 Z" fill="url(#os8-flame-side)"/>
      <path d="M 28 184 A 172 172 0 0 1 372 184" fill="none" stroke="#16131c" strokeWidth="20"/>
      <path d="M 28 184 A 172 172 0 0 1 372 184" fill="none" stroke="url(#os8-rim)" strokeWidth="12" strokeDasharray="10 3"/>
      <path d="M 45 184 A 155 155 0 0 1 355 184" fill="none" stroke="#efb872" strokeWidth="2"/>
      <path d="M 200 26 V 184" stroke="#e7c8ad" strokeWidth="2" strokeDasharray="6 4" opacity=".7"/>
      {[-10,-8,-6,-4,-2,0,2,4,6,8,10].map(value=>{
        const theta=Math.PI-(value+10)/20*Math.PI;
        const r1=155,r2=value%5===0?135:143;
        return <line key={value} x1={200+r1*Math.cos(theta)} y1={184-r1*Math.sin(theta)}
          x2={200+r2*Math.cos(theta)} y2={184-r2*Math.sin(theta)}
          stroke={value>0?'#ff8b42':'#d3d2d7'} strokeWidth={value%5===0?3:1.5}/>;
      })}
      <text x="24" y="197" fill="#fff5df" fontSize="19" fontWeight="900">−10</text>
      <text x="375" y="197" textAnchor="end" fill="#ffb36a" fontSize="19" fontWeight="900">+10</text>
      <text x="200" y="22" textAnchor="middle" fill="#f5dfb1" fontSize="20" fontWeight="900">0</text>
      <line x1="200" y1="184" x2={x} y2={y} stroke="#51220f" strokeWidth="12" strokeLinecap="square"/>
      <line x1="200" y1="184" x2={x} y2={y} stroke="url(#os8-needle)" strokeWidth="8" strokeLinecap="square"/>
      <circle cx="200" cy="184" r="19" fill="#1b1519" stroke="#ff8b24" strokeWidth="6"/>
      <text x="200" y="191" textAnchor="middle" fill="#ffbe58" fontSize="20">♨</text>
      <rect x={Math.min(350,Math.max(8,x-23))} y={Math.max(29,y-43)} width="48" height="31" rx="2"
        fill="#2c1510" stroke="#ff8f34" strokeWidth="3"/>
      <text x={Math.min(350,Math.max(8,x-23))+24} y={Math.max(29,y-43)+22}
        textAnchor="middle" fill="#fff4df" fontSize="21" fontWeight="900">{n}</text>
    </svg>
    <div className="os8-meter-ends"><span>SHADOW · −</span><strong>♨ THE PENDULUM ♨</strong><span>+ · FLAME</span></div>
  </div>;
}

const FACTOR_HELP={
  swing:{title:'SWING',text:'Sıfırın karşı tarafına geçince artar. Geçmeden STEER yaparsan 1 kademe düşer (en az ×1).'},
  flip:{title:'FLIP',text:'Her başarılı ardışık FLIP çarpanı büyütür: ×2, ×3, ×4… Sıfırı geçsen de artar. STEER seriyi durdurur ama kazanılan çarpanı silmez.'},
  jackpot:{title:'JACKPOT',text:'FLIP ile sıfırın karşı tarafına geçtiğinde +1 artar: ×2, ×3, ×4… Geçemezsen değişmez. Tam sıfır (ZERO BREAK) bütün çarpanları ×1 yapar.'}
};
function Factor({id,label,value,onClick,expanded}){
  return <button type="button" className={'os8-factor '+(value>1?'os8-active':'')+(expanded?' os8-factor-open':'')}
      onClick={onClick} aria-expanded={expanded} aria-controls="os8-factor-help"
      aria-label={label+' çarpanı ×'+value+'. Açıklama için dokun'}>
    <span>{label} <span className="os8-info-icon" aria-hidden="true">ⓘ</span></span>
    <b>×{value.toLocaleString('tr-TR')}</b>
  </button>;
}
export default function OverswingPlay({s,act,restart,journey=null,onBack=null}){
  const [discardPick,setDiscardPick]=useState(false);
  const [openFactor,setOpenFactor]=useState(null);
  const [steerFocus,setSteerFocus]=useState(false);
  const tutorial=s.mode==='tutorial';
  const isJourney=!!journey;
  const tutorialStep=tutorial?OVERSWING_TUTORIAL_STEPS[s.tutorialStep]:null;
  const d=s.deal,legal=overswingActions(s),pot=d.pot.reduce((a,c)=>a+rank(c),0);
  const payout=overswingPayout(s),multiplier=overswingMultiplier(d);
  const total=s.dealTotals.reduce((a,b)=>a+b,0)+(s.status==='over'?0:d.T);
  const canFlip=legal.some(a=>a.type==='flip'),canBank=legal.some(a=>a.type==='bank');
  const nextCap=Math.max(2,d.handCap-1),mustDiscard=d.hand.length>nextCap;
  useEffect(()=>setDiscardPick(false),[s.dealIndex,d.bankCount,s.status]);
  const doSteer=index=>{setSteerFocus(false);if(discardPick){if(legal.some(a=>a.type==='bank'&&a.dropIndex===index)){act({type:'bank',dropIndex:index});setDiscardPick(false);}}else if(legal.some(a=>a.type==='steer'&&a.index===index))act({type:'steer',index});};
  const bank=()=>{if(mustDiscard)setDiscardPick(true);else act({type:'bank'});};
  const guidedActionFirst=tutorial&&s.tutorialIntroDone&&(tutorialStep?.type==='flip'||tutorialStep?.type==='bank');
  const actionButtons=<>
    <div className="os8-actions">
      <button type="button" disabled={!canFlip||discardPick}
        className={'os8-flip '+(tutorial&&canFlip?'os8-guide-action':'')}
        onClick={()=>act({type:'flip'})}>
        <span className="os8-action-icon">▣?</span><b>FLIP</b><small>RANDOM CARD</small>
      </button>
      <button type="button" disabled={discardPick||!legal.some(a=>a.type==='steer')}
        className={'os8-steer '+(steerFocus?'os8-steer-focus':'')}
        onClick={()=>setSteerFocus(v=>!v)}>
        <span className="os8-action-icon">⇄</span><b>STEER</b><small>{steerFocus?'CHOOSE A CARD':'FROM YOUR HAND'}</small>
      </button>
      <button type="button" disabled={!canBank||discardPick}
        className={'os8-bank '+(tutorial&&canBank?'os8-guide-action':'')} onClick={bank}>
        <span className="os8-action-icon">♛</span><b>BANK</b><small>+{payout.toLocaleString('en-US')} PTS</small>
      </button>
    </div>
  </>;
  const multiplierDetails=<>
    <div className="os8-factors" aria-label="Çarpan ayrıntıları; bilgi almak için çarpana dokun">
      <Factor id="swing" label="SWING" value={d.W+1} onClick={()=>setOpenFactor(openFactor==='swing'?null:'swing')} expanded={openFactor==='swing'}/>
      <Factor id="flip" label="FLIP" value={d.flipFactor} onClick={()=>setOpenFactor(openFactor==='flip'?null:'flip')} expanded={openFactor==='flip'}/>
      <Factor id="jackpot" label="JACKPOT" value={d.jackpotFactor} onClick={()=>setOpenFactor(openFactor==='jackpot'?null:'jackpot')} expanded={openFactor==='jackpot'}/>
    </div>
    {openFactor&&FACTOR_HELP[openFactor]&&<div id="os8-factor-help" className="os8-factor-tooltip" role="region" aria-label={FACTOR_HELP[openFactor].title+' açıklaması'}>
      <div className="os8-tooltip-header"><strong>{FACTOR_HELP[openFactor].title} nasıl çalışır?</strong><button type="button" aria-label="Açıklamayı kapat" onClick={()=>setOpenFactor(null)}>×</button></div>
      <p>{FACTOR_HELP[openFactor].text}</p>
    </div>}
    <div className={'os8-event '+(s.lastAction?.snap?'os8-snap':s.lastAction?.zeroBreak?'os8-zero-break':'')} role="status" aria-live="polite">
      {s.lastAction?.card!=null&&<Card id={s.lastAction.card} mini/>}
      <p><Outcome e={s.lastAction}/></p>
    </div>
  </>;

  return <div className="os8">
    <header className="os8-head">
      <div className="os8-brand"><span>{tutorial?'GUIDED TRAINING':isJourney?'THE LAST FLAME':'V13 · ARCADE MODE'}</span><h2>OVER<span>SWING</span></h2></div>
      <div className="os8-settings">
        {isJourney?<button type="button" title="Back to journey" onClick={onBack}>‹ MAP</button>:null}
        {!isJourney&&!tutorial&&<button className="os8-tutorial-launch" type="button" onClick={()=>{setDiscardPick(false);setOpenFactor(null);restart('tutorial');}}>TRAIN</button>}
        {!isJourney&&<select value={s.mode} aria-label="Oyun modu" onChange={e=>{setDiscardPick(false);setOpenFactor(null);restart(e.target.value);}}>
          <option value="short">QUICK</option><option value="match">3 DECKS</option><option value="tutorial">TRAIN</option>
        </select>}
        {!isJourney&&<button title="Restart" aria-label="Restart" onClick={()=>{setDiscardPick(false);restart(s.mode);}} type="button">↻</button>}
      </div>
    </header>
    {isJourney&&<section className="os8-journey-strip" aria-label="Current journey objective">
      <div className="os8-journey-top"><span>GATE {journey.encounterIndex+1} / 3 · {LAST_FLAME.encounters[journey.encounterIndex].title}</span>
        <strong>{d.T.toLocaleString('en-US')} / {journey.encounter.effectiveTarget.toLocaleString('en-US')}</strong></div>
      <div className="os8-journey-track"><span style={{width:Math.min(100,d.T/journey.encounter.effectiveTarget*100)+'%'}}/></div>
      <div className="os8-journey-bottom"><span>{journey.encounterIndex===2?'♛ BOSS · SNAP +200 GOAL':'♨ REACH THE GATE TARGET'}</span>
        <div>{journey.relicIds.map(id=><button key={id} type="button"
          title={LAST_FLAME_RELICS[id].description}
          className={'os8-relic-charge '+(journey.encounter.relicUses[id]?'os8-relic-spent':'')}
          onClick={()=>setOpenFactor(openFactor===id?null:id)}>{LAST_FLAME_RELICS[id].symbol}</button>)}</div>
      </div>
      {journey.relicIds.includes(openFactor)&&<p className="os8-journey-relic-help">{LAST_FLAME_RELICS[openFactor]?.title}: {LAST_FLAME_RELICS[openFactor]?.description} {journey.encounter.relicUses[openFactor]?'(Used this gate)':'(Ready)'}</p>}
    </section>}
    <div className="os8-legend"><span className="os8-redtext">♥ ♦ POSITIVE</span><span>♠ ♣ NEGATIVE</span><span>0 = RESET</span><span>±10 = SNAP</span></div>
    <div className="os8-scoreline">
      <div><small>✦ SCORE</small><b>{total.toLocaleString('en-US')}</b></div>
      <div><small>♨ POT</small><b>{pot}</b></div>
      <div><small>× MULTIPLIER</small><b>×{multiplier.toLocaleString('en-US')}</b></div>
      <div><small>♛ BANK NOW</small><b>+{payout.toLocaleString('en-US')}</b></div>
    </div>
    <section className="os8-meter" aria-label={'Swing '+val(d.S)}>
      <FlameMeter position={d.S}/>
      <div className="os8-zero-warning">ZERO BREAK = RESET MULTIPLIERS · CROSS ZERO = SWING</div>
    </section>
    {tutorial&&<section className="os8-tutorial" aria-live="polite" aria-label="Zorunlu eğitim adımı">
      {!s.tutorialIntroDone?<div className="os8-tutorial-intro">
        <div className="os8-tutorial-head"><strong>ÖNCE 4 KAVRAM</strong><span>Eğitim başlamadan</span></div>
        <div className="os8-tutorial-glossary">
          {OVERSWING_TUTORIAL_INTRO.map(item=><div className="os8-tutorial-term" key={item.term}>
            <strong>{item.term}</strong><span>=</span><span>{item.text}</span>
          </div>)}
        </div>
        <button type="button" className="os8-start-tutorial" onClick={()=>act({type:'tutorial-start'})}>Anladım, başla</button>
      </div>:tutorialStep?<><div className="os8-tutorial-head"><strong>ADIM {s.tutorialStep+1} / {OVERSWING_TUTORIAL_STEPS.length}</strong><span>Yalnızca işaretli hamle açık</span></div>
        <div className="os8-tutorial-progress"><span style={{width:((s.tutorialStep+1)/OVERSWING_TUTORIAL_STEPS.length*100)+'%'}}/></div>
        <h3>{tutorialStep.title}</h3>
        <p>{discardPick?'Şimdi işaretli kartı seçerek BANK işlemini tamamla.':tutorialStep.instruction}</p>
        <small>{tutorialStep.why}</small>
      </>:<><h3>Eğitimi tamamladın!</h3><p>Üç çarpanı, STEER cezasını ve riskleri öğrendin. Artık normal oyunu deneyebilirsin.</p>
        <button type="button" onClick={()=>restart('short')}>Normal oyuna başla</button>
        <button type="button" onClick={()=>restart('tutorial')}>Eğitimi tekrarla</button>
      </>}
      {tutorialStep&&s.tutorialIntroDone&&<button type="button" className="os8-tutorial-exit" onClick={()=>restart('short')}>Eğitimden çık</button>}
    </section>}
    {guidedActionFirst&&actionButtons}
    {multiplierDetails}
    <section className="os8-pot">
      <div className="os8-section-heading"><h3>♨ POT CARDS</h3><span>{d.pot.length} kart · {pot} puan</span></div>
      <div className="os8-potcards">{d.pot.map(c=><Card key={c} id={c} mini/>)}{!d.pot.length&&<span className="os8-empty">Henüz boş</span>}</div>
    </section>
    <section className="os8-hand">
      <div className="os8-section-heading"><h3>{discardPick?'BANK · REMOVE 1 CARD':'YOUR HAND'}</h3><span>{d.hand.length}/{d.handCap} kart · BANK sonrası kapasite {nextCap}</span></div>
      {discardPick&&<p className="os8-attention">El kapasitesi {d.handCap} → {nextCap} düşecek. {tutorial?'Yalnızca işaretli kartı çıkar.':'Çıkarmak istediğin karta dokun.'} <button type="button" onClick={()=>setDiscardPick(false)}>Vazgeç</button></p>}
      <div className="os8-handcards">
        {d.hand.map((id,index)=>{
          const o=applySwing(d.S,d.W,signed(id));
          const caption=discardPick?'ÇIKAR':o.snap?'SNAP':d.S!==0&&o.S===0?'ZERO BREAK':d.plays===0||o.swung?'POT +'+rank(id):d.W>0?'SWING −1':'ISKARTA';
          const allowed=discardPick?legal.some(a=>a.type==='bank'&&a.dropIndex===index):legal.some(a=>a.type==='steer'&&a.index===index);
          const highlighted=(tutorial||steerFocus)&&allowed;
          return <Card key={id} id={id} chosen={highlighted||(!tutorial&&discardPick)} onClick={allowed?()=>doSteer(index):null} caption={caption}/>;
        })}
        {!d.hand.length&&<p className="os8-empty">El boş. Destede kart varsa otomatik olarak kapasiteye kadar doldurulur.</p>}
      </div>
    </section>
    {!guidedActionFirst&&actionButtons}
    <footer className="os8-footer">
      <span>{s.mode==='match'?'Deste '+(s.dealIndex+1)+'/3 · ':''}{d.pos}/40 kart çekildi</span>
      <details><summary>Kurallar ve çarpanlar</summary>
        <p>8 kartla başlarsın. ♥ ♦ artı, ♠ ♣ eksi. Sarkaç ±10 sınırını aşarsa Pot kaybolur.</p>
        <p>FLIP açılan kartı Pot’a ekler. Başarılı ardışık FLIP hamleleri çarpanı ×2, ×3, ×4… artırır; sıfır geçişleri de sayılır.</p>
        <p>FLIP ile sıfırın karşı tarafına geçince SWING artar ve JACKPOT ×1 kademe yükselir. Karşıya geçmeden FLIP yaparsan JACKPOT değişmez.</p>
        <p>ZERO BREAK: Tam sıfıra gelince SWING, FLIP ve JACKPOT ×1 olur; Pot korunur. ±10 sınırını aşmak SNAP'tir: Pot kaybolur.</p>
        <p>STEER ardışık FLIP sayacını durdurur; kazanılan FLIP ve JACKPOT korunur. Sıfırı geçmeyen STEER, SWING’i 1 azaltır (en az ×1).</p>
        <p>İlk STEER, sıfırı geçen STEER ve ZERO BREAK yapan STEER Pot’a girer; diğer STEER kartları iskartaya gider.</p>
        <p>BANK için en az 2 kart hamlesi gerekir. BANK yaptıkça el kapasitesi 8 → 7 → … → 2 azalır. Fazla el kartın varsa hangisini çıkaracağını seçersin.</p>
        <p>Elin sıfıra indiğinde, kapalı destede yeterli kart varsa yeni elin mevcut maksimum kapasiteye kadar otomatik dolar.</p>
        <p>Çarpanlar deneysel; skor hedefleri henüz yeniden kalibre edilmedi.</p>
      </details>
    </footer>
    {s.status==='over'&&<div className="os8-complete"><h3>Oyun bitti</h3><b>{s.dealTotals.reduce((a,b)=>a+b,0).toLocaleString('tr-TR')} puan</b><button type="button" onClick={()=>restart(s.mode)}>Yeni oyun</button></div>}
  </div>;
}
