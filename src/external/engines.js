export const rank = c => c % 10 + 1;
export const suit = c => Math.floor(c / 10);
export const SUITS = ['♥','♦','♠','♣'];
export const bondSuits = ['♠','♥','♦','♣'];
export const tideSuits = ['♠','♥','♦','♣'];
export const label = (c, symbols=SUITS) => c == null ? '—' : `${rank(c)===1?'A':rank(c)===10?'10':rank(c)}${symbols[suit(c)]}`;
export function seeded(seed=Date.now()){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function shuffle(a, rng=seeded()){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
const all40=()=>Array.from({length:40},(_,i)=>i);
const mark=(s,msg)=>({...s,last:msg,history:[msg,...(s.history||[])].slice(0,12)});
export function newKindling({seed,deckOverride}={}){const deck=deckOverride?deckOverride.slice():shuffle(all40(),seeded(seed));return {game:'kindling',deck,pos:3,market:deck.slice(0,3),fires:[null,null,null],sparks:3,score:0,turn:0,discard:[],history:[],status:'playing',last:'Choose a market card, then a Fire.'};}
export const kindlingFits=(f,r)=>!f || (r-f.top>=1 && r-f.top<=3);
export function kindlingSmother(fires){let best=0;for(let i=1;i<3;i++){const a=fires[i],b=fires[best];if(a.cards.length>b.cards.length || a.cards.length===b.cards.length && (a.top>b.top))best=i;}return best;}
export function kindlingActions(s){if(s.status==='over')return [];const arr=[];s.market.forEach((c,k)=>{if(k>0&&s.sparks===0)return;const fits=s.fires.map((f,i)=>kindlingFits(f,rank(c))?i:-1).filter(i=>i>=0);if(!fits.length){arr.push({type:'take',market:k,fire:kindlingSmother(s.fires),kindle:false,smother:true});}else for(const fire of fits){arr.push({type:'take',market:k,fire,kindle:false});if((s.fires[fire]?.cards.length||0)>=2)arr.push({type:'take',market:k,fire,kindle:true});}});return arr;}
export function stepKindling(s,a){if(!kindlingActions(s).some(x=>x.market===a.market&&x.fire===a.fire&&x.kindle===!!a.kindle))return s;const n={...s,fires:s.fires.map(f=>f?{...f,cards:[...f.cards]}:null),market:[...s.market],discard:[...s.discard],history:[...s.history]};const c=n.market.splice(a.market,1)[0],f=n.fires[a.fire];if(a.market>0)n.sparks--;
 const fits=n.fires.some(x=>kindlingFits(x,rank(c)));let msg='';
 if(!fits){n.discard.push(...f.cards);n.fires[a.fire]={cards:[c],top:rank(c),bottomSuit:suit(c)};msg=`${label(c)} smothered Fire ${a.fire+1}; lost ${f.cards.length} cards.`;}
 else{const nf=f?{cards:[...f.cards,c],top:rank(c),bottomSuit:f.bottomSuit}:{cards:[c],top:rank(c),bottomSuit:suit(c)};n.fires[a.fire]=nf;msg=`${label(c)} placed on Fire ${a.fire+1}.`;
 if(a.kindle){const points=nf.cards.length**2*(suit(c)===nf.bottomSuit?2:1);n.score+=points;n.sparks++;n.discard.push(...nf.cards);n.fires[a.fire]=null;msg=`Kindled Fire ${a.fire+1} for +${points}; gained a Spark.`;}}
 n.turn++;if(n.pos<40)n.market.push(n.deck[n.pos++]);if(!n.market.length)n.status='over';return mark(n,msg);
}
export const kindlingFinal=s=>s.score+s.sparks+s.fires.reduce((v,f)=>v+(f?.cards.length||0),0);
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]];
export function newBondstone({seed,deckOverride}={}){return {game:'bondstone',deck:deckOverride?deckOverride.slice():shuffle(all40(),seeded(seed)),t:0,wall:Array(9).fill(null),rise:1,mortar:3,score:0,rubble:[],history:[],status:'playing',last:'Choose an empty wall cell, or Mortar this Stone.'};}
export function bondJudge(cards){const values=cards.map(rank),ss=cards.map(suit),sum=values.reduce((a,b)=>a+b,0);const same=ss.every(v=>v===ss[0]);const v=values.slice().sort((a,b)=>a-b);const run=v[1]===v[0]+1 && v[2]===v[1]+1;return {kind:same&&run?'pure':same?'suit':run?'run':'fault',value:same&&run?sum*2:(same||run)?sum:0};}
export function bondActions(s){if(s.status==='over')return [];return [...s.wall.flatMap((v,i)=>v===null?[{type:'set',cell:i}]:[]),...(s.mortar?[{type:'mortar'}]:[])];}
export function stepBondstone(s,a){if(!bondActions(s).some(x=>x.type===a.type&&(a.type!=='set'||x.cell===a.cell)))return s;const n={...s,wall:[...s.wall],rubble:[...s.rubble],history:[...s.history]};const c=s.deck[s.t];let msg='';
 if(a.type==='mortar'){n.mortar--;n.rubble.push(c);msg=`Mortared ${label(c,bondSuits)}. ${n.mortar} Mortar left.`;}
 else{n.wall[a.cell]=c;const lines=LINES.map((line,i)=>({line,index:i})).filter(({line})=>line.includes(a.cell)&&line.every(j=>n.wall[j]!==null)).map(({line,index})=>({line,index,...bondJudge(line.map(j=>n.wall[j]))}));const value=lines.reduce((sum,l)=>sum+l.value,0);const pts=value*s.rise;n.score+=pts;if(lines.some(l=>l.kind==='fault'))n.rise=1;else n.rise=Math.min(6,n.rise+lines.length);const cleared=[...new Set(lines.flatMap(l=>l.line))].sort((a,b)=>a-b);cleared.forEach(j=>{n.rubble.push(n.wall[j]);n.wall[j]=null;});msg=lines.length?`${lines.map(l=>l.kind.toUpperCase()).join(' + ')}: +${pts} points. Rise ×${n.rise}.`:`Set ${label(c,bondSuits)} at cell ${a.cell+1}.`;n.lastJudged=lines.map(l=>({line:l.index,kind:l.kind,value:l.value}));}
 n.t++;if(n.t===40)n.status='over';return mark(n,msg);
}
export const signed=c=>(suit(c)<2?1:-1)*rank(c);
export function applySwing(S,W,value){const next=S+value;if(Math.abs(next)>10)return {snap:true};const swung=S!==0&&(next===0||Math.sign(next)!==Math.sign(S));const gain=swung?Math.min(Math.floor(Math.abs(S)/3),5-W):0;return {snap:false,S:next,W:W+gain,gain,swung};}
// Overswing v7 experiment: A (start/cap 4), mild B (draw 1 on BANK), and
// optional opening STEER. BANK needs two card actions per swing to discourage
// open-steer -> immediate BANK -> refill farming.
function dealSwing(rng,override){
  const deck=override?override.slice():shuffle(all40(),rng);
  return {deck,pos:4,hand:deck.slice(0,4),pot:[],discard:[],S:0,W:0,T:0,swingNo:1,flips:0,plays:0};
}
export function newOverswing({seed,mode='short',deckOverride}={}){
  const base=seed??Date.now();
  return {game:'overswing',version:7,seed:base,mode,dealIndex:0,dealTotals:[],
    deal:dealSwing(seeded(base),deckOverride),history:[],status:'playing',
    last:'4 kartın var. İstersen elinden bir kartla başla, istersen FLIP yap.'};
}
export function overswingActions(s){
  if(s.status==='over')return [];
  const d=s.deal,a=[];
  if(d.pos<40)a.push({type:'flip'});
  d.hand.forEach((_,index)=>a.push({type:'steer',index}));
  // No instant open-card BANK loop; when all cards are gone, allow the
  // final Pot to be banked regardless of count, to prevent a soft lock.
  if(d.pot.length&&(d.plays>=2||(d.pos>=40&&!d.hand.length)))a.push({type:'bank'});
  return a;
}
export function overswingPayout(s){
  return s.deal.pot.reduce((a,c)=>a+rank(c),0)*(1+s.deal.W);
}
export function stepOverswing(s,a){
  if(!overswingActions(s).some(x=>x.type===a.type&&(x.type!=='steer'||x.index===a.index)))return s;
  const d={...s.deal,hand:[...s.deal.hand],pot:[...s.deal.pot],discard:[...s.deal.discard]};
  let n={...s,deal:d,dealTotals:[...s.dealTotals],history:[...s.history]};
  let msg='',ended=false;
  const previousS=d.S,previousW=d.W,previousPot=d.pot.reduce((sum,c)=>sum+rank(c),0);
  if(a.type==='bank'){
    const gain=overswingPayout(s);
    d.T+=gain;
    d.discard.push(...d.pot);
    d.pot=[];
    ended=true;
    let refill=null;
    if(d.hand.length<4&&d.pos<40){
      refill=d.deck[d.pos++];
      d.hand.push(refill);
    }
    n.lastAction={type:'bank',points:gain,pot:previousPot,multiplier:previousW+1,refill};
    msg='BANK: '+gain+' puan güvenceye alındı.'+(refill===null?'':' Eline 1 kart çekildi.');
  }else{
    const opening=d.plays===0;
    let c;
    if(a.type==='flip'){c=d.deck[d.pos++];d.flips++;}
    else c=d.hand.splice(a.index,1)[0];
    d.plays++;
    const outcome=applySwing(d.S,d.W,signed(c));
    if(outcome.snap){
      n.lastAction={type:a.type,card:c,from:previousS,to:previousS+signed(c),
        snap:true,destination:'discard',lost:previousPot,
        beforeMultiplier:previousW+1,afterMultiplier:previousW+1,swung:false};
      if(a.type==='flip')n.lastFlip=n.lastAction;
      d.discard.push(...d.pot,c);
      d.pot=[];
      ended=true;
      msg='SNAP! '+label(c)+' sınırı aştı. '+previousPot+' Pot puanı kaybedildi.';
    }else{
      d.S=outcome.S;d.W=outcome.W;
      let destination;
      if(a.type==='flip'){
        if(outcome.swung&&d.hand.length<4){d.hand.push(c);destination='hand';}
        else{d.pot.push(c);destination='pot';}
      }else if(opening||outcome.swung){
        d.pot.push(c);
        destination='pot';
      }else{
        d.discard.push(c);
        destination='discard';
      }
      const addedToPot=destination==='pot'?rank(c):0;
      n.lastAction={type:a.type,card:c,from:previousS,to:d.S,
        snap:false,swung:outcome.swung,gain:outcome.gain,destination,
        beforeMultiplier:previousW+1,afterMultiplier:d.W+1,addedToPot,
        openingSteer:opening&&a.type==='steer'};
      if(a.type==='flip')n.lastFlip=n.lastAction;
      msg=(a.type==='flip'?'FLIP ':'STEER ')+label(c)+' → '+d.S+
        '; '+(destination==='hand'?'eline':destination==='pot'?'Pot’a':'iskartaya')+
        '. Çarpan ×'+(d.W+1)+'.';
    }
  }
  if(ended){
    if(d.pos>=40){
      n.dealTotals.push(d.T);
      if(n.mode==='match'&&n.dealIndex<2){
        n.dealIndex++;
        n.deal=dealSwing(seeded(n.seed*3+n.dealIndex));
        n.lastFlip=null;n.lastAction=null;
        msg+=' Sonraki deste başladı.';
      }else n.status='over';
    }else{
      d.S=0;d.W=0;d.pot=[];d.plays=0;d.swingNo++;
    }
  }
  return mark(n,msg);
}
export const overswingFinal=s=>s.dealTotals.reduce((a,b)=>a+b,0)+(s.status==='over'?0:s.deal.T);
export const tideLabel=x=>`${['J','Q','K'][x%3]}${tideSuits[Math.floor(x/3)]}`;
export function newUndertow({seed,tideOverride,crewOverride}={}){const rng=seeded(seed);const tide=tideOverride?tideOverride.slice():shuffle(Array.from({length:12},(_,i)=>i),rng);const crew=crewOverride?crewOverride.slice():shuffle(all40(),rng);const s={game:'undertow',tide,crew,ci:4,turn:0,hand:crew.slice(0,4),seen:crew.slice(0,4),line:[],catch:0,strain:0,deep:0,discard:[],stage:'act',history:[],status:'playing',last:'Choose Break, Anchor and up to 3 Row cards.'};return undertowPrepare(s);}
export function undertowPrepare(s){if(s.turn>=12)return {...s,status:'over',stage:'over'};const drawCount=s.turn===11?2:3;const cards=s.crew.slice(s.ci,s.ci+drawCount);return {...s,ci:s.ci+drawCount,hand:[...s.hand,...cards],seen:[...s.seen,...cards],stage:'act',forceEmptyKeep:false,last:`Tide ${tideLabel(s.tide[s.turn])}; choose your crew.`};}
export const undertowScore=s=>s.catch+3*s.strain+3*s.deep;
export function undertowCheckOdds(s,strain){const currentSuit=Math.floor(s.tide[s.turn]/3),threshold=strain-5,unknown=s.crew.filter(c=>!s.seen.includes(c));const hits=unknown.filter(c=>suit(c)===currentSuit&&rank(c)<=threshold).length;return {hits,total:unknown.length,prob:strain>10?1:unknown.length?hits/unknown.length:0};}
export function undertowActions(s){if(s.status==='over')return [];if(s.stage==='keep')return [{type:'keep'}];return [{type:'act'}];}
export function stepUndertow(s,a){if(s.stage==='act'&&a.type==='act'){const {breakCard=null,anchorCard=null,row=[]}=a;if(!Array.isArray(row)||row.length>3||!Array.isArray(s.hand))return s;const used=[breakCard,anchorCard,...row].filter(c=>c!==null);if(new Set(used).size!==used.length||used.some(c=>!s.hand.includes(c)))return s;const ts=Math.floor(s.tide[s.turn]/3),tr=11+s.tide[s.turn]%3;if(breakCard!==null&&suit(breakCard)!==ts)return s;
 const n={...s,line:[...s.line],hand:s.hand.filter(c=>!used.includes(c)),discard:[...s.discard,...row,...(breakCard===null?[]:[breakCard])],history:[...s.history]};if(anchorCard!==null)n.line.push(anchorCard);const m=row.reduce((sum,c)=>sum+rank(c),0)+n.line.length-(breakCard===null?tr:0)-(n.turn+1);
 if(m>0)n.catch+=m;else if(m<0)n.strain-=m;
 let cracked=false,odds=null;if(m<0&&n.strain>=6){odds=undertowCheckOdds(s,n.strain);const cc=n.crew[n.ci];cracked=n.strain>10||(suit(cc)===ts && rank(cc)<=n.strain-5);if(cracked){n.catch=Math.floor(n.catch/2);n.strain=0;n.deep=0;n.forceEmptyKeep=n.turn<=2;}else if(odds.hits>0)n.deep+=-m;}
 n.stage='keep';n.lastResult={margin:m,cracked,odds,checkCard:odds?n.crew[n.ci]:null};return mark(n,`Margin ${m>=0?'+':''}${m}. ${cracked?'CRACK! Catch halved.':m>0?'Catch gained.':odds?`Check ${odds.hits}/${odds.total} threats; survived.`:'Strain taken.'} Choose cards to keep (max 4).`);
 }
 if(s.stage==='keep'&&a.type==='keep'){const keep=a.cards||[];if(!Array.isArray(keep)||keep.length>4||s.forceEmptyKeep&&keep.length||new Set(keep).size!==keep.length||keep.some(c=>!s.hand.includes(c)))return s;let n={...s,hand:keep.slice(),discard:[...s.discard,...s.hand.filter(c=>!keep.includes(c))],turn:s.turn+1,history:[...s.history]};if(n.turn===12){n.stage='over';n.status='over';return mark(n,`Voyage finished! Final score ${undertowScore(n)}.`);}n=undertowPrepare(n);return mark(n,`Kept ${keep.length} cards. ${n.last}`);}
 return s;
}
