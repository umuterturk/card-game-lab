// Campaign-wide v14 deterministic benchmark. Gate runs are sampled independently;
// the Royal order/suits are fixed for all three gates of each sampled game.
// Usage: node experiments/run-overswing-campaign-v14.mjs [seeds=500] [start=950000]
import {mkdirSync,writeFileSync} from 'node:fs';
import {
  newOverswing,overswingActions,stepOverswing,overswingPayout,
  applySwing,rank,signed
} from '../src/external/engines.js';
import {royalRank,royalCardsForLoadout} from '../src/external/overswingRoyals.js';
import {journeySeed} from '../src/external/overswingJourney.js';
import {CAMPAIGN_LEVELS} from '../src/external/overswingCampaign.js';
import {LAST_FLAME} from '../src/external/overswingJourneyContent.js';

const seeds=Number(process.argv[2]||500);
const start=Number(process.argv[3]||950000);
if(!Number.isInteger(seeds)||seeds<1||seeds>2500||
   !Number.isSafeInteger(start))throw Error('Usage: run-overswing-campaign-v14.mjs [seeds] [start]');
const builds=[
  {name:'no_royals',loadout:[]},
  {name:'scout',loadout:['J']},
  {name:'full_court',loadout:['J','Q','K']}
];
const strategies=['flip_rush','royal_aware'];
const rows=[];
function choose(s,rules,strategy,target){
  const d=s.deal,actions=overswingActions(s,rules),limit=rules.snapLimit||10;
  const bank=actions.find(a=>a.type==='bank');
  const flip=actions.find(a=>a.type==='flip');
  const summon=actions.find(a=>a.type==='summon');
  const carry=actions.find(a=>a.type==='carry');
  if(carry)return carry;
  const safe=actions.filter(a=>a.type==='steer').map(a=>{
    const card=d.hand[a.index],v=royalRank(card)==='Q'?a.direction*12:signed(card);
    return {...a,card,result:applySwing(d.S,d.W,v,limit)};
  }).filter(a=>!a.result.snap).sort((a,b)=>{
    const score=x=>(x.result.swung?30+4*x.result.gain:0)+rank(x.card)-
       (royalRank(x.card)==='K'?(d.crownBonus||0)*.3:0);
    return score(b)-score(a);
  });
  const crossing=safe.find(a=>a.result.swung);
  const payout=overswingPayout(s,rules);
  const danger=Math.abs(d.S)>=limit-2;
  if(strategy==='royal_aware'){
    if(bank&&(payout>=target*.34||danger&&!crossing&&d.plays>=2||
      d.pos>=d.deck.length))return bank;
    if(summon)return summon;
    if(d.scoutNext!=null&&flip){
      const next=applySwing(d.S,d.W,signed(d.scoutNext),limit);
      if(!next.snap)return flip;
    }
    if(crossing&&(danger||d.plays>1))return crossing;
    if(flip&&!danger)return flip;
    return crossing||safe[0]||flip||bank||actions[0];
  }
  if(bank&&(d.plays>=4||payout>=target*.30||d.pos>=d.deck.length))return bank;
  if(flip)return flip;
  if(summon)return summon;
  return crossing||safe[0]||bank||actions[0];
}
function run(seed,level,gate,build,strategy){
  const rules=level.rules;
  const royalSeed=journeySeed(seed,0,'royals');
  const royals=royalCardsForLoadout(build.loadout,royalSeed);
  let s=newOverswing({seed:journeySeed(seed,gate,'deck'),
    royals,initialHandSize:rules.maxHandSize||8});
  const stats={snaps:0,summons:0,carries:0,flips:0,steers:0,banks:0,resonance:0};
  const target=Math.round(LAST_FLAME.encounters[gate].target*level.targetScale);
  let steps=0;
  while(s.status==='playing'&&steps++<200){
    const a=choose(s,rules,strategy,target);
    if(!a)throw Error('No legal action '+JSON.stringify({seed,level:level.number,gate,strategy}));
    const before=s,after=stepOverswing(s,a,rules);
    if(after===before)throw Error('Rejected action '+JSON.stringify({seed,level:level.number,gate,a}));
    s=after;
    if(a.type==='summon')stats.summons++;
    if(a.type==='carry')stats.carries++;
    if(a.type==='flip')stats.flips++;
    if(a.type==='steer')stats.steers++;
    if(a.type==='bank')stats.banks++;
    if(s.lastAction?.snap)stats.snaps++;
    stats.resonance+=Math.max(0,s.lastAction?.resonanceGained||0);
  }
  if(s.status!=='over')throw Error('Did not terminate '+JSON.stringify({seed,level:level.number,gate,steps}));
  const bossExtra=gate===2?200*stats.snaps:0;
  return {score:s.deal.T,passed:Number(s.deal.T>=target+bossExtra),
    target:target+bossExtra,steps:steps-1,...stats};
}
for(const level of CAMPAIGN_LEVELS){
  for(let gate=0;gate<3;gate++){
    for(const build of builds){
      for(const strategy of strategies){
        const totals={},scores=[];
        for(let i=0;i<seeds;i++){
          const x=run(start+i,level,gate,build,strategy);
          scores.push(x.score);
          for(const [key,value] of Object.entries(x))
            totals[key]=(totals[key]||0)+value;
        }
        scores.sort((a,b)=>a-b);
        const avg=key=>Number((totals[key]/seeds).toFixed(2));
        rows.push({
          level:level.number,levelId:level.id,gate:gate+1,
          build:build.name,strategy,seeds,
          passPct:Number((100*avg('passed')).toFixed(2)),
          avgScore:avg('score'),median:scores[Math.floor(seeds*.5)],
          p90:scores[Math.floor(seeds*.9)],p99:scores[Math.floor(seeds*.99)],
          avgTarget:avg('target'),avgSnaps:avg('snaps'),avgSummons:avg('summons'),
          avgResonance:avg('resonance'),avgFlips:avg('flips'),avgSteers:avg('steers'),
          avgBanks:avg('banks'),avgSteps:avg('steps')
        });
      }
    }
  }
}
mkdirSync('artifacts',{recursive:true});
const columns=Object.keys(rows[0]);
writeFileSync('artifacts/campaign-v14.csv',columns.join(',')+'\n'+rows.map(row=>
  columns.map(k=>row[k]).join(',')).join('\n')+'\n');
writeFileSync('artifacts/campaign-v14.json',JSON.stringify({
  samplesPerCombination:seeds,seedStart:start,totalGames:rows.length*seeds,
  note:'Fixed Royal sequence per game across three gates; independent gate decks. Non-optimal heuristics, without Tactic inventories/Relics.',
  builds,strategies,rows
},null,2));
console.log('CAMPAIGN V14: '+(rows.length*seeds).toLocaleString('en-US')+' seeded gate simulations');
console.log('Level,Gate,Build,Policy,Pass%,AvgScore,P90,AvgSnaps,AvgSummons');
for(const r of rows)if(r.gate===3)console.log([
  r.level,r.gate,r.build,r.strategy,r.passPct,r.avgScore,r.p90,r.avgSnaps,r.avgSummons].join(','));
console.log('Saved artifacts/campaign-v14.csv and artifacts/campaign-v14.json');
