// Reproducible, matched-seed Royal-card experiment using the production Overswing engine.
// node experiments/run-overswing-royals.mjs [seeds=2000] [startSeed=900000]
// Runs baseline / J / J+Q / J+Q+K, on all three encounter targets with
// explicit Royal SUMMON decisions. The Royal queue is identical across gates
// of the same game, unlike the independent ordinary-card deck. Heuristic only.
import {mkdirSync,writeFileSync} from 'node:fs';
import {newOverswing,stepOverswing,overswingActions,overswingPayout,rank,signed,applySwing} from '../src/external/engines.js';
import {royalCardsForLoadout,royalRank} from '../src/external/overswingRoyals.js';
import {journeySeed} from '../src/external/overswingJourney.js';
import {LAST_FLAME} from '../src/external/overswingJourneyContent.js';

const sampleCount=Number(process.argv[2]||2000),startSeed=Number(process.argv[3]||900000);
if(!Number.isInteger(sampleCount)||sampleCount<1||sampleCount>10000||!Number.isSafeInteger(startSeed))throw Error('Usage: node experiments/run-overswing-royals.mjs [samples=2000] [startSeed=900000]');
const levels=[{name:'baseline',loadout:[]},{name:'J',loadout:['J']},{name:'J+Q',loadout:['J','Q']},{name:'J+Q+K',loadout:['J','Q','K']}];
const strategies=['flip_rush','early_bank','cross_control','royal_aware'];
const seedFor=(seed,encounter)=>seed+encounter*10000019;
function delta(s,a){
  if(a.type!=='steer')return null;
  const id=s.deal.hand[a.index];
  return royalRank(id)==='Q'?a.direction*12:signed(id);
}
function safeSteers(s,actions){
  return actions.filter(a=>a.type==='steer').map(a=>{
    const outcome=applySwing(s.deal.S,s.deal.W,delta(s,a));
    return {...a,card:s.deal.hand[a.index],outcome};
  }).filter(a=>!a.outcome.snap);
}
function pick(s,strategy){
  const d=s.deal,actions=overswingActions(s);
  const flip=actions.find(a=>a.type==='flip'),summon=actions.find(a=>a.type==='summon');
  const carry=actions.filter(a=>a.type==='carry'),banks=actions.filter(a=>a.type==='bank');
  const safe=safeSteers(s,actions);
  const crossing=safe.filter(a=>a.outcome.swung);
  const best=(choices)=>choices.slice().sort((a,b)=>{
    const value=x=>rank(x.card)*1.5+(x.outcome.gain||0)*15+
      (royalRank(x.card)==='J'&&d.scoutNext==null?9:0)-
      (royalRank(x.card)==='K'?(d.crownBonus||0)*0.4:0);
    return value(b)-value(a);
  })[0];
  const payout=overswingPayout(s);
  const danger=Math.abs(d.S)>=7;
  const canBank=banks.length>0;
  const chooseBank=()=>banks.find(a=>a.dropIndex===undefined)||banks[0];
  const remaining=d.deck.length-d.pos;
  // When only Royals remain, carry one deliberately to trigger an ordinary
  // hand refill. Prefer a King with a live Crown, then J Scout, then Q Mirror.
  if(carry.length){
    const preference=c=>royalRank(c)==='K'&&(d.crownBonus||0)>0?30:
      royalRank(c)==='J'?20:10;
    return carry.sort((a,b)=>preference(d.hand[b.index])-preference(d.hand[a.index]))[0];
  }
  // SUMMON does not draw an ordinary card or grow the FLIP multiplier.
  // It is an intentional tactical action; aggressive/skillful policies
  // request Royals more eagerly, while flip-rush favors its normal engine.
  if(summon&&strategy==='royal_aware'&&(!canBank||d.hand.length<=d.handCap-1))
    return summon;
  if(summon&&strategy==='cross_control'&&d.plays>=1&&d.hand.length<=d.handCap-1)
    return summon;
  if(summon&&strategy==='early_bank'&&d.plays>=3&&d.hand.length<=d.handCap-1)
    return summon;
  if(summon&&strategy==='flip_rush'&&remaining<8)return summon;
  if(strategy==='flip_rush'){
    if(canBank&&(d.plays>=4||remaining===0||payout>=280))return chooseBank();
    return flip||best(crossing)||best(safe)||chooseBank()||actions[0];
  }
  if(strategy==='early_bank'){
    if(canBank&&(payout>=90||d.plays>=2&&danger||remaining===0))return chooseBank();
    return best(crossing)||flip||best(safe)||chooseBank()||actions[0];
  }
  if(strategy==='cross_control'){
    if(canBank&&(payout>=250&&d.plays>=3||danger&&!crossing.length||remaining===0))return chooseBank();
    return best(crossing)||best(safe)||flip||chooseBank()||actions[0];
  }
  // Royal-aware: values the K holding bonus, uses J's preview to distinguish
  // known-safe from known-SNAP FLIPs, and actively looks for safe Q crossings.
  const kHeld=d.hand.some(c=>royalRank(c)==='K');
  const peek=d.scoutNext==null?null:applySwing(d.S,d.W,signed(d.scoutNext));
  if(canBank&&(remaining===0||payout>=300||
       kHeld&&(d.crownBonus||0)>=20&&payout>=130||
       d.plays>=3&&danger&&!crossing.length))return chooseBank();
  if(peek&&!peek.snap&&flip)return flip;
  if(peek?.snap&&crossing.length)return best(crossing);
  const specialCross=crossing.filter(a=>royalRank(a.card));
  if(specialCross.length&&!canBank)return best(specialCross);
  if(crossing.length&&(!flip||danger||d.plays>=2))return best(crossing);
  if(flip&&(!peek||!peek.snap)&&!danger)return flip;
  return best(crossing)||best(safe)||flip||chooseBank()||actions[0];
}
function play(seed,loadout,encounterIndex,strategy){
  const actualSeed=seedFor(seed,encounterIndex);
  const royals=royalCardsForLoadout(loadout,journeySeed(seed,0,'royals'));
  let s=newOverswing({seed:actualSeed,royals});
  const stats={snaps:0,flips:0,steers:0,banks:0,summons:0,carries:0,resonance:0,
    jackPlayed:0,queenPlayed:0,kingPlayed:0,crownBanks:0,crownExtra:0,
    scoutedFlips:0,turns:0};
  for(let i=0;i<180&&s.status==='playing';i++){
    const action=pick(s,strategy);
    if(!action)throw Error('NO LEGAL ACTION seed='+seed+' tier='+tier+' encounter='+encounterIndex+' turn='+i);
    if(action.type==='flip'&&s.deal.scoutNext!=null)stats.scoutedFlips++;
    const card=action.type==='steer'?s.deal.hand[action.index]:null;
    const next=stepOverswing(s,action);
    if(next===s)throw Error('ILLEGAL ACTION seed='+seed+' '+JSON.stringify(action));
    const event=next.lastAction;
    stats.turns++;
    if(action.type==='flip')stats.flips++;
    if(action.type==='summon')stats.summons++;
    if(action.type==='carry')stats.carries++;
    stats.resonance+=event?.resonanceGained||0;
    if(action.type==='steer'){
      stats.steers++;
      const royal=royalRank(card);
      if(royal==='J')stats.jackPlayed++;
      if(royal==='Q')stats.queenPlayed++;
      if(royal==='K')stats.kingPlayed++;
    }
    if(action.type==='bank'){
      stats.banks++;
      if(event.crownBonus){
        stats.crownBanks++;
        stats.crownExtra+=event.points-Math.floor(event.pot*event.multiplier);
      }
    }
    if(event?.snap)stats.snaps++;
    s=next;
  }
  if(s.status!=='over')throw Error('DID NOT FINISH seed='+seed+' tier='+tier+' encounter='+encounterIndex);
  const score=s.deal.T;
  const gate=LAST_FLAME.encounters[encounterIndex];
  const target=Math.round(gate.target)+
    (gate.objective?.type==='snap_target_tax'?stats.snaps*gate.objective.pointsPerSnap:0);
  return {...stats,score,target,passed:Number(score>=target),royalsOffered:royals.length};
}
const rows=[];
for(const level of levels){
  const tier=level.loadout.length;
  for(let encounter=0;encounter<3;encounter++){
    for(const strategy of strategies){
      const sums={};const scores=[];
      for(let i=0;i<sampleCount;i++){
        const one=play(startSeed+i,level.loadout,encounter,strategy);
        scores.push(one.score);
        for(const [k,v]of Object.entries(one))if(typeof v==='number')sums[k]=(sums[k]||0)+v;
      }
      scores.sort((a,b)=>a-b);
      const avg=k=>Number((sums[k]/sampleCount).toFixed(2));
      rows.push({
        stage:level.name,royalTier:tier,encounter:LAST_FLAME.encounters[encounter].id,
        strategy,seedCount:sampleCount,winRate:Number((sums.passed/sampleCount*100).toFixed(2)),
        avgScore:avg('score'),medianScore:scores[Math.floor(sampleCount*0.5)],
        p90Score:scores[Math.floor(sampleCount*0.9)],p99Score:scores[Math.floor(sampleCount*0.99)],
        avgTarget:avg('target'),avgSnaps:avg('snaps'),
        avgFlips:avg('flips'),avgSteers:avg('steers'),avgBanks:avg('banks'),
        avgSummons:avg('summons'),avgCarries:avg('carries'),avgResonance:avg('resonance'),
        avgJackPlayed:avg('jackPlayed'),avgQueenPlayed:avg('queenPlayed'),
        avgKingPlayed:avg('kingPlayed'),crownBankRate:Number((sums.crownBanks/sampleCount*100).toFixed(2)),
        avgCrownExtra:avg('crownExtra'),avgScoutedFlips:avg('scoutedFlips'),
        avgTurns:avg('turns')
      });
    }
  }
}
mkdirSync('artifacts',{recursive:true});
const columns=Object.keys(rows[0]);
writeFileSync('artifacts/royal-simulation.csv',columns.join(',')+'\n'+rows.map(r=>columns.map(k=>r[k]).join(',')).join('\n')+'\n');
writeFileSync('artifacts/royal-simulation.json',JSON.stringify({sampleCount,startSeed,
  totalEncounters:rows.length*sampleCount,
  note:'Matched game seeds. One Royal order and suits reused across its three gates; independent ordinary decks per gate. Heuristic policies are not optimal.',
  levels,strategies,rows},null,2));
console.log('ROYAL SIMULATION: '+(rows.length*sampleCount).toLocaleString('en-US')+' completed encounters.');
console.log('Stage,Gate,Policy,Win%,AvgScore,Median,P90,P99,AvgSNAP,AvgSummons,AvgJack,AvgQueen,AvgKing,CrownBank%');
for(const r of rows)console.log([r.stage,r.encounter,r.strategy,r.winRate,r.avgScore,
    r.medianScore,r.p90Score,r.p99Score,r.avgSnaps,r.avgSummons,r.avgJackPlayed,
    r.avgQueenPlayed,r.avgKingPlayed,r.crownBankRate].join(','));
console.log('Results saved: artifacts/royal-simulation.csv and artifacts/royal-simulation.json');
