// Fixed 40-card teaching deck. Card IDs: hearts 0-9, diamonds 10-19,
// spades 20-29, clubs 30-39; signed ranks follow engines.js.
// A short, fixed sequence: FLIP, STEER, SWING, JACKPOT, BANK, ZERO BREAK, SNAP.
const OPENING_HAND=[27,0,3,23,5,28,7,2]; // -8, +1, +4, -4, +6, -9, +8, +3
const GUIDED_FLIPS=[12,11,15,17,4]; // +3, +2, +6, +8, +5
export const OVERSWING_TUTORIAL_DECK=[
  ...OPENING_HAND,...GUIDED_FLIPS,
  ...Array.from({length:40},(_,i)=>i).filter(id=>!OPENING_HAND.includes(id)&&!GUIDED_FLIPS.includes(id))
];

export const OVERSWING_TUTORIAL_INTRO=[
  {term:'FLIP',text:'Desteden rastgele bir kart açmak. Kart Pot’a gider.'},
  {term:'STEER',text:'Elindeki kartlardan birini seçip oynamak.'},
  {term:'POT',text:'Henüz BANK yapmadığın, riske attığın kart puanları.'},
  {term:'SKOR',text:'BANK ile kasaya aldığın, kaybetmeyeceğin toplam puan.'}
];

// Each step is one real engine action. No arbitrary scenario-state injections.
export const OVERSWING_TUTORIAL_STEPS=[
  {type:'flip',title:'FLIP',instruction:'FLIP yap: +3.',why:'Rastgele kart Pot’a gider. FLIP ×2.'},
  {type:'flip',title:'FLIP serisi',instruction:'Tekrar FLIP yap: +2.',why:'İki FLIP üst üste: FLIP ×3.'},
  {type:'steer',card:27,title:'SWING',instruction:'Elinden 8♠ (−8) oyna: +5 → −3.',why:'Sıfırı geçtin: SWING ×2. Kart Pot’a girer.'},
  {type:'steer',card:0,title:'STEER bedeli',instruction:'A♥ (+1) oyna: −3 → −2.',why:'Geçiş yok: SWING ×1’e düşer. Kart iskartaya gider.'},
  {type:'flip',title:'JACKPOT',instruction:'FLIP yap: +6 ile −2 → +4.',why:'FLIP ile geçiş: SWING ×2, JACKPOT ×2 olur; sonraki geçişte ×3 olur. FLIP ×3 korunur.'},
  {type:'bank',title:'BANK ve SKOR',instruction:'BANK yap ve puanları kasaya al.',why:'Pot × SWING × FLIP × JACKPOT skora eklenir.'},
  {type:'steer',card:3,title:'Yeni tur',instruction:'4♥ (+4) oyna.',why:'İlk STEER Pot’a gider.'},
  {type:'steer',card:23,title:'ZERO BREAK',instruction:'4♠ (−4) oyna: +4 → 0.',why:'Tam 0: çarpanlar ×1, Pot korunur.'},
  {type:'flip',title:'Sınırı gör',instruction:'FLIP yap: +8.',why:'Sarkaç −10…+10 arasında kalmalı.'},
  {type:'flip',title:'SNAP',instruction:'Yeniden FLIP yap: +8 → +13.',why:'Sınır aşıldı: Pot kaybolur. Eğitim bitti!'}
];

export function overswingTutorialExpectedAction(deal,stepIndex){
  const step=OVERSWING_TUTORIAL_STEPS[stepIndex];
  if(!step)return null;
  if(step.type==='steer'){
    const index=deal.hand.indexOf(step.card);
    return index<0?null:{type:'steer',index};
  }
  if(step.type==='bank'&&step.dropCard!=null){
    const dropIndex=deal.hand.indexOf(step.dropCard);
    return dropIndex<0?null:{type:'bank',dropIndex};
  }
  return {type:step.type};
}
