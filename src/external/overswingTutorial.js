// Fixed 40-card teaching deck. Card IDs: hearts 0-9, diamonds 10-19,
// spades 20-29, clubs 30-39; signed ranks follow engines.js.
const OPENING_HAND=[27,5,0,3,23,28,7,2]; // -8,+6,+1,+4,-4,-9,+8,+3
const GUIDED_FLIPS=[12,11,24,21,15,17,4]; // +3,+2,-5,-2,+6,+8,+5
export const OVERSWING_TUTORIAL_DECK=[
  ...OPENING_HAND,...GUIDED_FLIPS,
  ...Array.from({length:40},(_,i)=>i).filter(id=>!OPENING_HAND.includes(id)&&!GUIDED_FLIPS.includes(id))
];

// No tutorial step may be skipped. The deck, hand selection and BANK discard
// are scripted; every step is a real engine action (not a simulated animation).
export const OVERSWING_TUTORIAL_STEPS=[
  {type:'flip',title:'1. Kırmızı (+), siyah (−)',instruction:'FLIP’e dokun. Açılan kırmızı 3♦ sarkacı +3’e taşıyacak.',why:'FLIP kapalı desteden rastgele kart açar; tutorial’da sıra önceden belirlenmiştir. FLIP kartı doğrudan Pot’a gider.'},
  {type:'flip',title:'2. FLIP çarpanı ve seri',instruction:'Bir kez daha FLIP yap. +2 gelince sarkaç +5 olacak.',why:'Sıfırı geçmeyen ikinci FLIP, FLIP çarpanını ×3; art arda iki FLIP ise SERİ çarpanını ×2 yapar.'},
  {type:'steer',card:27,title:'3. SWING: sıfırın ötesine geç',instruction:'Elindeki 8♠ (−8) kartına dokun: +5 → −3.',why:'Tam 0’a basmadın; sıfırın karşı tarafına geçtin. SWING bir kademe artar; STEER kartı Pot’a gider.'},
  {type:'steer',card:5,title:'4. Bir kez daha SWING',instruction:'6♥ (+6) kartını kullan: −3 → +3.',why:'Kontrollü STEER geçişleri SWING’i artırabilir. Çarpanın üst sınırı yoktur.'},
  {type:'steer',card:0,title:'5. Güvenli STEER’in bedeli',instruction:'A♥ (+1) kartını oyna: +3 → +4.',why:'Sıfır geçilmediği için SWING bir kademe düşer (en az ×1). STEER kartı iskartaya gider; diğer bonuslar korunur.'},
  {type:'flip',title:'6. FLIP ile CROSS',instruction:'FLIP’e dokun. Siyah 5♠ ile +4 → −1 olacak.',why:'Sıfırı FLIP ile geçince hem SWING artar hem ayrıca CROSS ×2 kazanırsın. Açılan kart Pot’a gider.'},
  {type:'flip',title:'7. Art arda iki FLIP',instruction:'Tekrar FLIP yap: siyah 2♠, −1 → −3.',why:'Sıfır geçilmedi; FLIP serisi devam eder ve ikinci ardışık FLIP ayrı SERİ ×2 verir.'},
  {type:'flip',title:'8. Üçüncü FLIP ile CROSS',instruction:'Üçüncü FLIP’i yap: kırmızı 6♦, −3 → +3.',why:'Üçüncü ardışık FLIP ile CROSS yapınca SERİ’ye ekstra ×3 eklenir. SWING ve CROSS da artar.'},
  {type:'bank',title:'9. BANK: kazancı koru',instruction:'BANK’e dokun, Pot’u puana dönüştür.',why:'Puan = Pot × SWING × FLIP × SERİ × CROSS. BANK çarpanları sıfırlar ve maksimum el kapasitesini 8’den 7’ye düşürür.'},
  {type:'steer',card:3,title:'10. Sıfıra yaklaş',instruction:'4♥ (+4) kartını oyna: 0 → +4.',why:'Serinin ilk STEER kartı Pot’a eklenir. Şimdi sıfır tuzağını göreceğiz.'},
  {type:'steer',card:23,title:'11. ZERO BREAK',instruction:'4♠ (−4) kartını oyna: +4 → tam 0.',why:'ZERO BREAK! Pot korunur ama SWING, FLIP, SERİ ve CROSS anında ×1 olur. Tam sıfır bir geçiş sayılmaz.'},
  {type:'flip',title:'12. Risk: sınır +10',instruction:'FLIP yap: kırmızı 8♦, sarkaç +8 olacak.',why:'Sarkaç −10 ve +10 arasında kalmalı. Bu FLIP Pot’a gider ve FLIP çarpanını artırır.'},
  {type:'flip',title:'13. SNAP: Pot’u kaybet',instruction:'Bir FLIP daha yap. +5 açılınca +8 → +13 ile sınırı aşacaksın.',why:'SNAP olunca Pot’taki kartlar kaybolur, çarpanlar sıfırlanır; elindeki diğer kartlar korunur.'},
  {type:'steer',card:2,title:'14. Kalan elinle devam et',instruction:'3♥ (+3) kartını oyna; yeni seriyi başlat.',why:'FLIP yapmaya zorunlu değilsin. Eldeki STEER kartıyla da yeni seri açabilirsin.'},
  {type:'steer',card:28,title:'15. Kartla sıfırı geç',instruction:'9♠ (−9) kartını oyna: +3 → −6.',why:'SWING yine artar. STEER ile sıfır geçmek CROSS faktörünü değil yalnızca SWING’i etkiler.'},
  {type:'steer',card:7,title:'16. Elin sıfırlanınca otomatik dolsun',instruction:'8♥ (+8) kartını oyna: −6 → +2.',why:'Elindeki son kartı kullandın. Deste, elini mevcut kapasiten olan 7 karta kadar otomatik doldurur.'},
  {type:'bank',dropCard:14,title:'17. BANK sonrası el kapasitesi azalır',instruction:'Önce BANK’e, ardından işaretli 5♦ kartına dokunup elinden çıkar.',why:'BANK el kapasitesini 7’den 6’ya indirir. Fazla kart olduğunda atılacak kartı sen seçersin. Tutorial’da doğru seçim işaretli.'}
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
