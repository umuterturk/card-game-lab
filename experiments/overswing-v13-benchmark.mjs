// Overswing v13 controlled, matched-seed policy benchmark.
// Run with Node: node --input-type=module -e "import('./experiments/overswing-v13-benchmark.mjs').then(m=>console.log(JSON.stringify(m.runBenchmark(1000,710000))))"
// This uses the shipped engine. No policy reads deal.deck or future card order.
import {
  newOverswing,overswingActions,stepOverswing,overswingPayout,
  applySwing,rank,signed
} from '../src/external/engines.js';

export const STRATEGIES=['random','cash_out','flip_rush','greedy','probability_aware','fixed_bank_flip','fixed_bank_steer','fixed_bank_signal','fixed_bank_exact'];
const range=Array.from({length:40},(_,i)=>i);
function rng(seed){
  let a=seed>>>0;
  return ()=>{
    a=(a+0x6D2B79F5)>>>0;
    let t=a;t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
const potValue=d=>d.pot.reduce((x,c)=>x+rank(c),0);
function knownUnknown(d){
  const known=new Set([...d.hand,...d.pot,...d.discard]);
  return range.filter(id=>!known.has(id));
}
function bankOption(actions,d,random){
  const opts=actions.filter(a=>a.type==='bank');
  if(!opts.length)return null;
  if(opts.length===1)return opts[0];
  // Discard the least valuable card (unless random).
  return random?opts[Math.floor(random()*opts.length)]:
    opts.reduce((best,a)=>rank(d.hand[a.dropIndex])<rank(d.hand[best.dropIndex])?a:best);
}
function outcomes(s){
  const d=s.deal,actions=overswingActions(s);
  const steers=actions.filter(a=>a.type==='steer').map(action=>{
    const c=d.hand[action.index],r=rank(c);
    const x=applySwing(d.S,d.W,signed(c));
    if(x.snap)return {action,value:0,delta:-overswingPayout(s),snap:true,swung:false};
    const zero=d.S!==0&&x.S===0;
    const w=zero?0:x.swung?x.W:Math.max(0,x.W-1);
    const p=zero?potValue(d)+r:potValue(d)+(d.plays===0||x.swung?r:0);
    const value=p*(w+1)*(zero?1:d.flipFactor)*(zero?1:d.jackpotFactor);
    return {action,value,delta:value-overswingPayout(s),snap:false,
      swung:x.swung,zero,card:c};
  });
  const unseen=knownUnknown(d);
  let flip=null;
  if(actions.some(a=>a.type==='flip')&&unseen.length){
    let sum=0,snap=0,zero=0,jackpot=0,safes=0,near=0;
    for(const c of unseen){
      const x=applySwing(d.S,d.W,signed(c));
      if(x.snap){snap++;continue;}
      const z=d.S!==0&&x.S===0;
      if(z)zero++;
      const w=z?0:x.W;
      const f=z?1:Math.max(d.flipFactor,d.flipStreak+2);
      const j=z?1:d.jackpotFactor+(x.swung?1:0);
      if(x.swung)jackpot++;
      if(Math.abs(x.S)>=8)near++;
      sum+=(potValue(d)+rank(c))*(w+1)*f*j;
      safes++;
    }
    flip={action:{type:'flip'},value:sum/unseen.length,
      pSnap:snap/unseen.length,pZero:zero/unseen.length,
      pJackpot:jackpot/unseen.length,pNear:near/unseen.length,
      safe:safes/unseen.length,delta:sum/unseen.length-overswingPayout(s)};
  }
  return {steers,flip,bank:bankOption(actions,d),pot:potValue(d),
    current:overswingPayout(s)};
}
function choose(s,strategy,random){
  const x=outcomes(s),d=s.deal;
  const bank=bankOption(overswingActions(s),d,strategy==='random'?random:null);
  const steer=x.steers.sort((a,b)=>b.value-a.value);
  const best=steer[0],winning=steer.find(y=>y.swung&&!y.snap);
  // These four policies share exactly the same BANK rule; only STEER/FLIP
  // choice and information differ. This isolates control/risk guidance.
  if(strategy.startsWith('fixed_bank_')){
    // Fixed, public, identical bank threshold and discard rule across arms.
    if(bank && (x.current>=400 || (!x.flip&&!best)))return bank;
    if(strategy==='fixed_bank_flip')return x.flip?.action||best?.action||bank;
    if(strategy==='fixed_bank_steer'){
      return winning?.action||x.flip?.action||best?.action||bank;
    }
    if(strategy==='fixed_bank_signal'){
      // Coarse UI-style risk label: Low <15%, Medium 15–34%, High >=35%.
      // No exact probability is exposed to this strategy.
      const riskHigh=x.flip&&x.flip.pSnap>=.35;
      const riskMedium=x.flip&&x.flip.pSnap>=.15;
      if((riskHigh||riskMedium)&&best&&!best.snap)return best.action;
      return x.flip?.action||best?.action||bank;
    }
    if(strategy==='fixed_bank_exact'){
      // Full probability accounting, same BANK threshold as other fixed arms.
      const steerValue=best?best.value:-Infinity;
      const flipValue=x.flip?x.flip.value:-Infinity;
      if(best&&!best.snap&&
          (steerValue>flipValue||x.flip?.pSnap>=.3))return best.action;
      return x.flip?.action||best?.action||bank;
    }
  }
  if(strategy==='random'){
    const kinds=[...(x.flip?['flip']:[]),...(steer.length?['steer']:[]),...(bank?['bank']:[])];
    const kind=kinds[Math.floor(random()*kinds.length)];
    return kind==='flip'?{type:'flip'}:kind==='steer'?
      steer[Math.floor(random()*steer.length)].action:bank;
  }
  if(strategy==='cash_out'){
    if(bank)return bank;
    if(winning)return winning.action;
    if(x.flip&&x.flip.pSnap<=.16)return x.flip.action;
    if(best&&!best.snap)return best.action;
    return x.flip?.action||best?.action;
  }
  if(strategy==='flip_rush'){
    if(bank&&x.current>=350&&(x.flip?.pSnap>=.23||x.current>=1400))return bank;
    if(x.flip)return x.flip.action;
    if(bank)return bank;
    return best.action;
  }
  if(strategy==='greedy'){
    if(bank&&x.current>=75 &&
        ( (!best||best.value<x.current*1.18) &&
          (!x.flip||x.flip.value<x.current*1.15||x.flip.pSnap>.32)
          || x.current>2500 ))return bank;
    if(winning&&winning.delta>=Math.max(12,x.flip?.delta||0)*.8)return winning.action;
    if(x.flip&&x.flip.pSnap<.38 && x.flip.value>=Math.max(best?.value||0,x.current*.7))return x.flip.action;
    if(best&&!best.snap&&best.value>=x.current*.85)return best.action;
    return bank||x.flip?.action||best.action;
  }
  if(strategy==='probability_aware'){
    const flipValue=x.flip?
      x.flip.value - x.current*(.55*x.flip.pSnap+.2*x.flip.pZero): -Infinity;
    const sValue=best?best.value-(best.swung?0:Math.max(4,rank(best.card||0)*2)): -Infinity;
    const bankValue=bank?
      x.current*(1.04+ (x.flip?.pSnap||0)*.22) - Math.max(0,8-d.handCap)*10: -Infinity;
    if(bank && bankValue>=flipValue && bankValue>=sValue)return bank;
    if(sValue>=flipValue && best)return best.action;
    return x.flip?.action||best?.action||bank;
  }
  throw Error('Unknown policy');
}
function play(seed,strategy){
  let s=newOverswing({seed,mode:'short'}),turns=0;
  const random=rng(seed*13+STRATEGIES.indexOf(strategy)*1000003+991);
  const m={seed,strategy,score:0,turns:0,flips:0,steers:0,banks:0,snaps:0,zeroBreaks:0,
    crossings:0,jackpots:0,nearEdges:0,atRisk:0,lostPotential:0,largestBank:0,
    highestPotential:0,bankPoints:0,randomnessExposure:0,flipsAtRisk:0,decisionCount:0};
  let previousFactor=s.deal.jackpotFactor;
  while(s.status==='playing'&&turns<120){
    const d=s.deal;
    const legal=overswingActions(s);
    if(!legal.length)throw Error('Softlock '+seed+' '+strategy);
    if(legal.length>1)m.decisionCount++;
    const prior=overswingPayout(s),prePot=potValue(d);
    const a=choose(s,strategy,random);
    if(!a)throw Error('No action '+seed+' '+strategy);
    if(prior>=100 && legal.some(x=>x.type==='bank')&&a.type!=='bank')m.atRisk++;
    if(a.type==='flip'&&prior>=100)m.flipsAtRisk++;
    const n=stepOverswing(s,a);
    if(n===s)throw Error('Illegal action '+seed+' '+strategy+' '+JSON.stringify(a));
    m.turns++;turns++;
    if(a.type==='flip')m.flips++;
    else if(a.type==='steer')m.steers++;
    else if(a.type==='bank'){m.banks++;m.largestBank=Math.max(m.largestBank,n.lastAction?.points||0);
      m.bankPoints+=n.lastAction?.points||0;}
    if(n.lastAction?.snap){m.snaps++;m.lostPotential+=n.lastAction.lostPayout||0;}
    if(n.lastAction?.zeroBreak)m.zeroBreaks++;
    if(n.lastAction?.swung)m.crossings++;
    if(a.type==='flip'&&n.lastAction?.swung)m.jackpots++;
    if(Math.abs(n.deal.S)>=8)m.nearEdges++;
    if(a.type==='flip')m.randomnessExposure++;
    m.highestPotential=Math.max(m.highestPotential,prior,overswingPayout(n));
    s=n;
  }
  if(s.status!=='over')throw Error('Nonterminating '+seed+' '+strategy);
  m.score=s.dealTotals.reduce((a,b)=>a+b,0);
  if(!Number.isSafeInteger(m.score))throw Error('Unsafe score '+seed+' '+strategy);
  return m;
}
export function runBenchmark(count=2000,startSeed=710000,strategies=STRATEGIES){
  const rows=[];
  for(let i=0;i<count;i++)for(const strategy of strategies)rows.push(play(startSeed+i,strategy));
  return rows;
}
