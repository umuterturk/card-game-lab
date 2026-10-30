// Browser gameplay engines for the archived Card Game Lab experiments.
// Rule sources: the experiment's original Python simulator (001–017).
// All decisions are user-driven; only hidden draws and initial shuffles are random.
import { shuffled } from '../logic.js';
const num=(max=6,copies=4)=>Array.from({length:max*copies},(_,i)=>i%max+1);
const start=(values,random)=>{const deck=shuffled(values,random);const hand=[];while(hand.length<3&&deck.length)hand.push(deck.pop());return {deck,hand};};
const draw=s=>s.deck.pop();
const refill=s=>{while(s.hand.length<3&&s.deck.length)s.hand.push(draw(s));};
const sum=a=>a.reduce((s,x)=>s+x,0);
const erase=s=>{s.hand=[];s.deck=[];};
const act=(type,label,extra={})=>({type,label,...extra});
const spent=(s,i)=>s.hand.splice(i,1)[0];
const newBase=(id,values,random)=>({id,...start(values,random),score:0,pot:0,discard:[],history:[],turns:0,finished:false,notice:'Choose a card, then an action.',});
const log=(s,message)=>{s.notice=message;s.history=[message,...s.history].slice(0,10)};
const targetName=(i)=>['A','B','C','D','E','F','G','H','I'][i];
const bank=(s,n)=>{s.score+=n;return n;};
const end=(s)=>{s.finished=true;s.notice=`Run complete · ${s.score.toLocaleString()} points`;s.history=[s.notice,...s.history].slice(0,10);};
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const lines=b=>LINES.filter(line=>line.every(i=>b[i]!=null)&&sum(line.map(i=>b[i]))===10).length;
const tenScore=b=>{const n=lines(b);return n?10*n*2**(n-1):0;};
const twinValue=lane=>{if(!lane.length)return 0;const l=sum(lane.filter(x=>x.side==='L').map(x=>x.value)),r=sum(lane.filter(x=>x.side==='R').map(x=>x.value)),gap=Math.abs(l-r);if(lane.length===4&&gap>1)return 0;return (l+r)*(gap===0?4:gap===1?2:1)*(lane.length===4?4:lane.length===3?2:1);};
const wireValue=w=>w.length?sum(w)*[0,0,1,2,4,5][w.length]:0;
const furnaceValue=f=>f.heat*4**f.sparks*(f.heat===12?2:1);
const oddValue=j=>(2**j.cards.length-1)*(1+j.blinds);
const gridNeighbours=Array.from({length:9},(_,i)=>Array.from({length:9},(_,j)=>j).filter(j=>Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1));
const connectedGroups=grid=>{const seen=new Set(),groups=[];grid.forEach((v,i)=>{if(v==null||seen.has(i))return;const stack=[i],group=[];seen.add(i);while(stack.length){const at=stack.pop();group.push(at);for(const j of gridNeighbours[at])if(grid[j]!=null&&!seen.has(j)&&Math.abs(grid[at]-grid[j])===1){seen.add(j);stack.push(j);}}groups.push(group.sort((a,b)=>a-b));});return groups;};
const graftOdds=(grid,i)=>[1,2,3,4,5,6].filter(v=>gridNeighbours[i].filter(j=>grid[j]!=null&&Math.abs(v-grid[j])===1).length>=2).length/6;
const seams=[[0,1],[0,2],[1,3],[2,3]];
const seamLinks=b=>seams.filter(([i,j])=>b[i]+b[j]===7).map(e=>e.join('-'));
const foldVal=(lo,hi,depth)=> (10-(hi-lo))*Math.min(4,depth+1);
const panVal=s=>{const p=s.pans;const diff=Math.abs(sum(p[0])-sum(p[1]));return(sum(p[0])+sum(p[1]))*(diff<=2?2**Math.min(p[0].length,p[1].length):1)*3**s.bonus;};
const pattern=b=>b[1]>b[0]&&b[1]>b[2]?'H':b[1]<b[0]&&b[1]<b[2]?'L':null;
const newMeter=()=>({pos:0,pot:0,last:0,combo:1,overloads:0});
const sign=n=>Math.sign(n);
const click=(s,w)=>{if(s.lastClick===w)s.streak=0;const g=7*2**Math.min(s.streak,2);s.pot+=g;s.streak=Math.min(3,s.streak+1);s.lastClick=w;return g;};
const chimeFail=s=>{s.pot=0;s.pledge=0;s.bells=s.bells.map(b=>b?{...b,fate:false}:null);s.hand=s.hand.map(c=>({...c,fate:false}));};
function initial(id,random=Math.random){
 let values=id==='018'?num(6,5):id==='014'?num(9,3):id==='008'?[-1,1].flatMap(sign=>num(6,2).map(v=>v*sign)):num();
 let s=newBase(id,values,random);
 switch(id){
 case '001':s.vaults=[[],[],[]];break;
 case '002':s.wires=[[],[]];break;
 case '003':s.grid=Array(9).fill(null);break;
 case '005':s.furnaces=[{heat:0,sparks:0},{heat:0,sparks:0}];break;
 case '006':s.track={last:3,direction:0,combo:1,pot:0,blinds:0};break;
 case '007':Object.assign(s,{pos:6,combo:1,surges:0,seals:4});break;
 case '008':s.meter=newMeter();break;
 case '009':s.board=[draw(s),draw(s),draw(s)];s.discard=[];s.chips=4;s.combo=1;s.last=null;break;
 case '011':s.jars=Array.from({length:3},()=>({cards:[],blinds:0}));break;
 case '012':s.grid=[draw(s),draw(s),draw(s),draw(s)];s.dares=3;s.streak=0;break;
 case '013':s.kiln={cards:[],pot:0};s.sparks=4;break;
 case '014':s.lo=0;s.hi=10;s.depth=0;s.dives=4;break;
 case '015':s.pans=[[],[]];s.chips=3;s.bonus=0;break;
 case '016':s.wheels=[0,0,0];s.streak=0;s.lastClick=-1;s.tokens=3;break;
 case '017':s.hand=s.hand.map(value=>({value,fate:false}));s.bells=[null,null,null];s.tokens=3;s.pledge=0;break;
 case '018':s.grid=Array(9).fill(null);s.banks=2;s.grafts=3;break;
 }
 return s;
}
function legal(s){
 if(s.finished)return [];
 if(s.id==='014' && s.pendingDive != null) return [act('resolve',`Move LOW to ${s.pendingDive}`,{side:'L'}),act('resolve',`Move HIGH to ${s.pendingDive}`,{side:'R'})];
 const a=[],h=s.hand;
 const each=(fn)=>h.forEach((v,i)=>fn(typeof v==='object'?v.value:v,i));
 switch(s.id){
 case '001':
  s.vaults.forEach((v,j)=>{if(v.length)a.push(act('bank',`Bank vault ${j+1} · ${twinValue(v)} pts`,{target:j}));
   if(v.length===3&&s.deck.length)for(const side of ['L','R'])a.push(act('blind',`Blind ${side} · vault ${j+1}`,{target:j,side}));
   if(v.length<4)each((n,i)=>{for(const side of ['L','R'])a.push(act('place',`Vault ${j+1} · ${side==='L'?'left':'right'}`,{card:i,target:j,side}));});});break;
 case '002':
  s.wires.forEach((w,j)=>{if(w.length)a.push(act('bank',`Bank wire ${j+1} · ${wireValue(w)} pts`,{target:j}));
   if(w.length===4&&s.deck.length)a.push(act('pulse',`Blind pulse · wire ${j+1}`,{target:j}));
   each((v,i)=>{if(!w.length)a.push(act('place',`Start wire ${j+1}`,{target:j,card:i,side:'R'}));else if(w.length<5){if(Math.abs(v-w[0])===1)a.push(act('place',`Wire ${j+1} · prepend`,{target:j,card:i,side:'L'}));if(Math.abs(v-w[w.length-1])===1)a.push(act('place',`Wire ${j+1} · append`,{target:j,card:i,side:'R'}));}});});break;
 case '003':
  if(s.grid.some(x=>x!=null))a.push(act('bank',`Bank grid · ${tenScore(s.grid)} pts`));
  s.grid.forEach((v,j)=>{if(v===null){each((n,i)=>a.push(act('place',`Grid cell ${j+1}`,{target:j,card:i})));if(s.deck.length)a.push(act('seal',`Blind Seal · cell ${j+1}`,{target:j}));}});break;
 case '005':
  s.furnaces.forEach((f,j)=>{if(f.heat){a.push(act('bank',`Bank furnace ${j+1} · ${furnaceValue(f)} pts`,{target:j}));if(f.heat>=9&&f.heat<=11&&s.deck.length)a.push(act('stoke',`STOKE furnace ${j+1} · blind draw`,{target:j}));each((n,i)=>a.push(act('vent',`Vent furnace ${j+1} −${n}`,{target:j,card:i})));}
   each((n,i)=>{if(f.heat+n<=12)a.push(act('feed',`Feed furnace ${j+1} +${n}`,{target:j,card:i}));});});break;
 case '006':
  each((n,i)=>a.push(act('place',`Place ${n} on track`,{card:i})));
  if(s.track.pot)a.push(act('bank',`Bank track · ${s.track.pot} pts`));
  if(s.track.direction&&s.track.blinds<2&&s.deck.length)a.push(act('blind',`Blind reverse · risk ${s.track.pot} pts`));break;
 case '007':
  each((n,i)=>a.push(act('move',`Advance ${n} spaces`,{card:i})));
  if(s.pot&&s.seals)a.push(act('bank',`Bank ${s.pot} pts · use seal`));
  if(s.pot&&s.deck.length)a.push(act('surge',`SURGE · risk ${s.pot} pts`));break;
 case '008':
  if(s.meter.pot)a.push(act('bank',`Bank ${s.meter.pot} pts`));
  each((n,i)=>{const p=s.meter.pos+n;if(Math.abs(p)<=6)a.push(act('safe',`Safe move ${n>0?'+':''}${n}`,{card:i}));else if(Math.abs(p)<=10&&s.deck.length&&s.meter.overloads<2)a.push(act('overload',`OVERLOAD ${n>0?'+':''}${n}`,{card:i}));});break;
 case '009':
  each((n,i)=>s.board.forEach((_,j)=>a.push(act('place',`Replace ${['left','center','right'][j]} with ${n}`,{card:i,target:j}))));
  if(s.pot)a.push(act('bank',`Bank ${s.pot} pts`));
  if(s.pot&&s.last&&s.last===pattern(s.board)&&s.deck.length&&s.chips>0)for(const stake of ['half','all'])a.push(act('press',`PRESS · risk ${stake} of pot`,{stake}));break;
 case '011':
  s.jars.forEach((j,k)=>{if(j.cards.length)a.push(act('cash',`Cash jar ${k+1} · ${oddValue(j)} pts`,{target:k}));
  if(s.deck.length&&j.cards.length>=2&&j.cards.length<6&&j.blinds<2)a.push(act('blind',`Blind jar ${k+1}`,{target:k}));
  each((n,i)=>{if(!j.cards.includes(n))a.push(act('place',`Add ${n} to jar ${k+1}`,{card:i,target:k}));});});break;
 case '012':
  each((n,i)=>{s.grid.forEach((_,j)=>a.push(act('move',`Replace tile ${j+1} with ${n}`,{card:i,target:j})));if(s.pot)a.push(act('cash',`Discard ${n} & bank ${s.pot}`,{card:i}));});
  if(s.dares&&s.deck.length&&s.pot)s.grid.forEach((_,j)=>a.push(act('dare',`DARE · blind tile ${j+1}`,{target:j})));break;
 case '013':
  each((n,i)=>{if(sum(s.kiln.cards)+n<=10)a.push(act('feed',`Feed ${n} into furnace`,{card:i}));if(s.kiln.cards.length)a.push(act('sell',`Sell furnace; discard ${n}`,{card:i}));});
  if(s.kiln.cards.length&&s.sparks&&s.deck.length)a.push(act('fire',`FIRE · risk ${s.kiln.pot} pts`));break;
 case '014':
  each((n,i)=>{for(const side of ['L','R'])if(n>s.lo&&n<s.hi)a.push(act('fold',`Move ${side==='L'?'LOW':'HIGH'} to ${n}`,{card:i,side}));a.push(act('cash',`Cash ${s.pot} · discard ${n}`,{card:i}));});
  if(s.pot&&s.dives&&s.deck.length)a.push(act('dive',`DIVE · risk ${s.pot} pts`));break;
 case '015':
  s.pans.forEach((p,j)=>{if(p.length<3)each((n,i)=>a.push(act('place',`Place ${n} on ${j?'right':'left'} pan`,{card:i,target:j})));});
  if(s.pans.some(p=>p.length))a.push(act('bank',`Bank load · ${panVal(s)} pts`));
  if(s.chips&&s.deck.length&&sum(s.pans.map(p=>p.length))>=3)s.pans.forEach((p,j)=>{if(p.length<3)a.push(act('press',`PRESS ${j?'right':'left'} pan`,{target:j}));});break;
 case '016':
  each((n,i)=>s.wheels.forEach((_,j)=>a.push(act('place',`Rotate dial ${targetName(j)} by ${n}`,{card:i,target:j}))));
  if(s.pot)a.push(act('bank',`Bank ${s.pot} pts`));
  if(s.pot&&s.tokens&&s.deck.length)s.wheels.forEach((v,j)=>{if(v)a.push(act('risk',`OVERDRIVE dial ${targetName(j)}`,{target:j}));});break;
 case '018':
  s.grid.forEach((v,j)=>{if(v===null){each((n,i)=>a.push(act('place',`Plant ${n} at cell ${j+1}`,{card:i,target:j})));if(s.grafts&&s.pot>0&&gridNeighbours[j].filter(k=>s.grid[k]!=null).length>=2)a.push(act('graft',`GRAFT cell ${j+1} · ${Math.round(graftOdds(s.grid,j)*100)}% success`,{target:j}));}else each((n,i)=>a.push(act('prune',`Burn ${n} · prune cell ${j+1}`,{card:i,target:j})));});
  connectedGroups(s.grid).filter(g=>g.length>=2).forEach(g=>a.push(act('harvest',`Harvest ${g.length} cells · +${10*g.length*g.length}`,{cells:g.join(','),target:g[0]})));
  if(s.banks&&s.pot)a.push(act('bank',`BANK ${s.pot} points · ${s.banks} seals left`));break;
 case '017':
  each((n,i)=>{s.bells.forEach((v,j)=>{if(v===null)a.push(act('place',`Set bell ${targetName(j)} to ${n}`,{card:i,target:j}));});a.push(act('burn',`BURN ${n} & advance bells`,{card:i}));});
  if(s.pot&&!s.pledge)a.push(act('bank',`Bank ${s.pot} pts`));
  if(s.pot&&!s.pledge&&s.tokens&&s.deck.length&&s.bells.some(Boolean))each((n,i)=>a.push(act('pledge',`PLEDGE · discard ${n}, reveal Fate`,{card:i})));break;
 }
 return a;
}
function perform(source,action){
 const options=legal(source);if(!options.some(a=>a.type===action.type&&a.card===action.card&&a.target===action.target&&a.side===action.side&&a.stake===action.stake&&a.cells===action.cells))return source;
 const s=structuredClone(source);s.turns++;
 const t=action.target,i=action.card,side=action.side,type=action.type;
 let n=0,old=0,extra='';
 switch(s.id){
 case '001':{
  const finish=(j,blind=false)=>{const v=twinValue(s.vaults[j]);const reward=v*(blind?2:1);bank(s,reward);s.discard.push(...s.vaults[j].map(x=>x.value));s.vaults[j]=[];return reward;};
  if(type==='place'){n=spent(s,i);s.vaults[t].push({side,value:n});refill(s);if(s.vaults[t].length===4){extra=` · resolved for ${finish(t)} points`;}}
  if(type==='bank'){extra=` +${finish(t)} points`;}
  if(type==='blind'){n=draw(s);s.vaults[t].push({side,value:n});extra=` drew ${n}; ${finish(t,true)} points`;}
  break;}
 case '002':{
  const finish=j=>{const pts=wireValue(s.wires[j]);bank(s,pts);s.discard.push(...s.wires[j]);s.wires[j]=[];return pts;};
  if(type==='place'){n=spent(s,i);if(side==='L')s.wires[t].unshift(n);else s.wires[t].push(n);refill(s);if(s.wires[t].length===5)extra=` · auto-bank +${finish(t)}`;}
  if(type==='bank')extra=` +${finish(t)} pts`;
  if(type==='pulse'){const w=s.wires[t];n=draw(s);const success=Math.abs(n-w[0])===1||Math.abs(n-w[w.length-1])===1;if(success)bank(s,(sum(w)+n)*10);extra=success?` revealed ${n} · double payout!`:` revealed ${n} · chain burned`;s.discard.push(...w,n);s.wires[t]=[];}
  break;}
 case '003':{
  const clear=()=>{s.discard.push(...s.grid.filter(x=>x!=null));s.grid=Array(9).fill(null);};
  if(type==='place'){n=spent(s,i);s.grid[t]=n;refill(s);if(s.grid.every(x=>x!=null)){extra=` · auto-bank +${bank(s,tenScore(s.grid))}`;clear();}}
  if(type==='bank'){extra=` +${bank(s,tenScore(s.grid))} points`;clear();}
  if(type==='seal'){old=lines(s.grid);n=draw(s);s.grid[t]=n;const success=lines(s.grid)>old;if(success)bank(s,4*tenScore(s.grid));extra=success?` revealed ${n} · new line ×4!`:` revealed ${n} · Seal failed`;clear();}
  break;}
 case '005':{
  let f=s.furnaces[t];if(type==='feed'||type==='vent'){n=spent(s,i);if(type==='feed')f.heat+=n;else {f.heat=Math.max(0,f.heat-n);if(!f.heat)s.furnaces[t]={heat:0,sparks:0};}refill(s);}
  if(type==='bank'){extra=` +${bank(s,furnaceValue(f))} points`;s.furnaces[t]={heat:0,sparks:0};}
  if(type==='stoke'){n=draw(s);if(f.heat+n<=12){f.heat+=n;f.sparks++;extra=` revealed ${n} · success ×${4**f.sparks}`;}else{s.furnaces[t]={heat:0,sparks:0};extra=` revealed ${n} · BURN!`;}}
  break;}
 case '006':{
  const tr=s.track;if(type==='place'||type==='blind'){
   n=type==='place'?spent(s,i):draw(s);const d=sign(n-tr.last);if(type==='blind'){
    if(d&&d!==tr.direction){tr.combo=Math.min(8,tr.combo*2);tr.pot=2*(tr.pot+Math.abs(n-tr.last)*tr.combo);tr.last=n;tr.direction=d;tr.blinds++;extra=` ${n} · reversed ×2`;if(tr.blinds===2){bank(s,tr.pot);s.track={last:3,direction:0,combo:1,pot:0,blinds:0};extra+=' · auto-bank';}}
    else{s.track={last:3,direction:0,combo:1,pot:0,blinds:0};extra=` ${n} · failed, lost track`;}}
   else if(d){tr.combo=tr.direction&&tr.direction!==d?Math.min(8,tr.combo*2):1;tr.pot+=Math.abs(n-tr.last)*tr.combo;tr.last=n;tr.direction=d;}if(type==='place')refill(s);
  }else if(type==='bank'){extra=` +${bank(s,tr.pot)}`;s.track={last:3,direction:0,combo:1,pot:0,blinds:0};}break;}
 case '007':{
  if(type==='bank'){extra=` +${bank(s,s.pot)}`;s.pot=0;s.combo=1;s.surges=0;s.seals--;}
  else {n=type==='move'?spent(s,i):draw(s);s.pos=(s.pos+n)%7;const success=[0,2,4].includes(s.pos);if(success){s.pot+=n*s.combo;if(type==='surge'){s.pot*=2;s.surges++;}s.combo=Math.min(8,s.combo*2);if(type==='surge'&&s.surges===2){bank(s,s.pot);s.pot=0;s.surges=0;s.combo=1;extra=' · second SURGE auto-banked';}}
  else {extra=` · missed beacon, lost ${s.pot}`;s.pot=0;s.combo=1;s.surges=0;}if(type==='move')refill(s);}break;}
 case '008':{
  const m=s.meter;if(type==='bank'){extra=` +${bank(s,m.pot)} points`;s.meter=newMeter();}
  else {n=spent(s,i);const gain=v=>{const sg=sign(v);m.combo=m.last&&m.last!==sg?Math.min(4,m.combo*2):1;m.last=sg;return Math.abs(v)*m.combo;};m.pos+=n;m.pot+=gain(n);
  if(type==='overload'){const hidden=draw(s);m.pos+=hidden;extra=` revealed ${hidden}`;if(Math.abs(m.pos)<=6){m.pot=3*(m.pot+gain(hidden));m.overloads++;extra+=' · recovered ×3';if(m.overloads===2){bank(s,m.pot);s.meter=newMeter();extra+=' · auto-bank';}}else{bank(s,Math.floor(m.pot*0.25));s.meter=newMeter();extra+=' · failed, salvaged 25%';}}refill(s);}break;}
 case '009':{
  if(type==='place'){n=spent(s,i);old=s.board[t];s.discard.push(old);s.board[t]=n;if(t===1&&n!==old){const p=pattern(s.board);if(p){s.combo=s.last&&s.last!==p?Math.min(8,s.combo*2):1;s.pot+=(Math.abs(n-s.board[0])+Math.abs(n-s.board[2]))*s.combo;s.last=p;}else{s.combo=1;s.last=null;}}refill(s);}
  if(type==='bank'){extra=` +${bank(s,s.pot)}`;s.pot=0;s.combo=1;s.last=null;}
  if(type==='press'){s.chips--;const stake=action.stake==='half'?Math.ceil(s.pot/2):s.pot;n=draw(s);s.discard.push(s.board[1]);s.board[1]=n;const p=pattern(s.board);if(p&&p!==s.last){s.combo=Math.min(8,s.combo*2);s.pot+=(Math.abs(n-s.board[0])+Math.abs(n-s.board[2]))*s.combo+stake;s.last=p;extra=` reveal ${n} · success!`;}else{s.pot-=stake;s.combo=1;s.last=null;extra=` reveal ${n} · lost ${stake}`;}}
  break;}
 case '011':{
  const jar=s.jars[t],clear=()=>{s.discard.push(...jar.cards);s.jars[t]={cards:[],blinds:0};};
  if(type==='place'){n=spent(s,i);jar.cards.push(n);refill(s);}
  if(type==='cash'){extra=` +${bank(s,oddValue(jar))}`;clear();}
  if(type==='blind'){n=draw(s);if(jar.cards.includes(n)){extra=` ${n} duplicate · lost ${oddValue(jar)}`;clear();s.discard.push(n);}else{jar.cards.push(n);jar.blinds++;extra=` ${n} unique · multiplier ×${1+jar.blinds}`;}}
  break;}
 case '012':{
  if(type==='cash'){n=spent(s,i);s.discard.push(n);bank(s,s.pot);s.pot=0;s.streak=0;refill(s);}
  else{n=type==='move'?spent(s,i):draw(s);if(type==='dare')s.dares--;const before=seamLinks(s.grid);s.discard.push(s.grid[t]);s.grid[t]=n;const made=seamLinks(s.grid).filter(x=>!before.includes(x)).length;if(made){s.streak=Math.min(3,s.streak+1);s.pot+=5*made*2**(s.streak-1);if(type==='dare')s.pot*=2;extra=` +${made} links${type==='dare'?' · ×2':''}`;}else{s.pot=Math.floor(s.pot/2);s.streak=0;extra=` no new links · halved pot`;}if(type==='move')refill(s);}
  break;}
 case '013':{
  if(type==='feed'){n=spent(s,i);s.kiln.pot+=n*(s.kiln.cards.length+1);s.kiln.cards.push(n);refill(s);}
  if(type==='sell'){n=spent(s,i);bank(s,s.kiln.pot);extra=` +${s.kiln.pot} pts (discarded ${n})`;s.kiln={cards:[],pot:0};refill(s);}
  if(type==='fire'){n=draw(s);s.sparks--;const heat=sum(s.kiln.cards)+n;if(heat>=7&&heat<=10){s.kiln.pot=3*(s.kiln.pot+n*(s.kiln.cards.length+1));s.kiln.cards.push(n);extra=` reveal ${n} · FIRE ×3!`;}else{extra=` reveal ${n} · collapsed (lost ${s.kiln.pot})`;s.kiln={cards:[],pot:0};}}
  break;}
 case '014':{
  const reset=()=>{s.lo=0;s.hi=10;s.depth=0;s.pot=0;s.pendingDive=null;};
  if(type==='fold'){n=spent(s,i);const lo=side==='L'?n:s.lo,hi=side==='R'?n:s.hi;s.pot+=foldVal(lo,hi,s.depth);s.lo=lo;s.hi=hi;s.depth++;refill(s);}
  if(type==='cash'){n=spent(s,i);bank(s,s.pot);reset();refill(s);}
  if(type==='dive'){n=draw(s);s.dives--;if(n>s.lo&&n<s.hi){s.pendingDive=n;extra=` revealed ${n} · choose a boundary for ×3`; }else{extra=` revealed ${n} · lost ${s.pot}`;reset();}}
  if(type==='resolve'){n=s.pendingDive;const lo=side==='L'?n:s.lo,hi=side==='R'?n:s.hi;s.pot=3*(s.pot+foldVal(lo,hi,s.depth));s.lo=lo;s.hi=hi;s.depth++;s.pendingDive=null;extra=` · DIVE success ×3!`;}
  break;}
 case '015':{
  const clear=()=>{s.discard.push(...s.pans.flat());s.pans=[[],[]];s.bonus=0;};
  if(type==='place'){n=spent(s,i);s.pans[t].push(n);refill(s);}
  if(type==='bank'){extra=` +${bank(s,panVal(s))} points`;clear();}
  if(type==='press'){n=draw(s);s.chips--;old=panVal(s);s.pans[t].push(n);if(Math.abs(sum(s.pans[0])-sum(s.pans[1]))<=2){s.bonus++;extra=` reveal ${n} · success ×${3**s.bonus}`;}else{extra=` reveal ${n} · lost ${old}`;clear();}}
  break;}
 case '016':{
  if(type==='place'){n=spent(s,i);s.wheels[t]=(s.wheels[t]+n)%7;if(s.wheels[t]===0)extra=` · CLICK +${click(s,t)}`;refill(s);}
  if(type==='bank'){extra=` +${bank(s,s.pot)} points`;s.pot=0;s.streak=0;s.lastClick=-1;}
  if(type==='risk'){n=draw(s);s.tokens--;if(s.wheels[t]+n>=7&&s.wheels[t]+n<=9){s.wheels[t]=(s.wheels[t]+n)%7;if(s.wheels[t]===0)click(s,t);s.pot*=3;extra=` reveal ${n} · Overdrive ×3!`;}else{extra=` reveal ${n} · lost ${s.pot}`;s.pot=0;s.streak=0;s.lastClick=-1;s.wheels[t]=0;}}
  break;}
 case '018':{
  if(type==='place'){n=spent(s,i);s.grid[t]=n;refill(s);extra=` · planted ${n}`;}
  else if(type==='prune'){n=spent(s,i);old=s.grid[t];s.grid[t]=null;s.discard.push(n,old);refill(s);extra=` · spent ${n} to remove ${old}`;}
  else if(type==='harvest'){const cells=action.cells.split(',').map(Number);const reward=10*cells.length*cells.length;s.pot+=reward;cells.forEach(j=>{s.discard.push(s.grid[j]);s.grid[j]=null;});extra=` · +${reward} points`;}
  else if(type==='bank'){bank(s,s.pot);extra=` · secured ${s.pot}`;s.pot=0;s.banks--;}
  else if(type==='graft'){const chance=graftOdds(s.grid,t);n=Math.floor(Math.random()*6)+1;s.grid[t]=n;s.grafts--;const links=gridNeighbours[t].filter(j=>s.grid[j]!=null&&Math.abs(s.grid[j]-n)===1).length;if(links>=2){s.pot*=4;extra=` · Fate ${n}, ${links} connections, ×4! (${Math.round(chance*100)}% odds)`;}else{extra=` · Fate ${n}, ${links} connections, lost ${s.pot}`;s.pot=0;}}
  break;}
 case '017':{
  if(type==='bank'){extra=` +${bank(s,s.pot)} points`;s.pot=0;}
  else if(type==='pledge'){n=spent(s,i);const fate=draw(s);s.hand.push({value:fate,fate:true});s.tokens--;s.pledge=3;extra=` reveal Fate ${fate} · 3 ticks to synchronize`;}
  else{const card=spent(s,i);n=card.value;if(type==='place')s.bells[t]={original:n,remaining:n,fate:card.fate};const ringing=[];s.bells=s.bells.map(b=>{if(!b)return null;if(b.remaining===1){ringing.push(b);return null;}return {...b,remaining:b.remaining-1};});
  if(ringing.length)s.pot+=10*ringing.length**2;
  if(s.pledge){if(ringing.length===3&&ringing.some(b=>b.fate)){s.pot*=3;s.pledge=0;s.hand=s.hand.map(c=>({...c,fate:false}));s.bells=s.bells.map(b=>b?{...b,fate:false}:null);extra=' · Fate triple ring ×3!';}
  else if(ringing.some(b=>b.fate)){chimeFail(s);extra=' · Fate rang alone · lost pot';}
  else {s.pledge--;if(!s.pledge){chimeFail(s);extra=' · Fate deadline expired';}}}
  if(s.deck.length)s.hand.push({value:draw(s),fate:false});}
  break;}
 }
 // All games consume exactly their finite deck, with one mandatory terminal resolution.
 if(!s.deck.length&&!s.hand.length&&!s.finished&&s.pendingDive==null){
  switch(s.id){
   case '001':s.vaults.forEach(v=>bank(s,twinValue(v)));break;
   case '002':s.wires.forEach(w=>bank(s,wireValue(w)));break;
   case '003':bank(s,tenScore(s.grid));break;
   case '005':s.furnaces.forEach(f=>bank(s,furnaceValue(f)));break;
   case '006':bank(s,s.track.pot);break;
   case '007':bank(s,s.pot);s.pot=0;break;
   case '008':bank(s,s.meter.pot);break;
   case '009':bank(s,s.pot);s.pot=0;break;
   case '011':s.jars.forEach(j=>bank(s,oddValue(j)));break;
   case '012':bank(s,s.pot);s.pot=0;break;
   case '013':bank(s,s.kiln.pot);break;
   case '014':bank(s,s.pot);s.pot=0;break;
   case '015':bank(s,panVal(s));break;
   case '016':bank(s,s.pot);s.pot=0;break;
   case '017':if(s.pledge)chimeFail(s);bank(s,s.pot);s.pot=0;break;
   case '018':connectedGroups(s.grid).filter(g=>g.length>=2).forEach(g=>bank(s,10*g.length*g.length));bank(s,s.pot);s.pot=0;break;
  }end(s);
 }else log(s,`${action.label}${extra}`);
 return s;
}
function view(s){
 const z=(title,values,detail='')=>({title,values:values.map(v=>String(v)),detail});
 let zones=[],pot=s.pot||0,stats=[];
 const add=(k,v)=>stats.push({key:k,value:String(v)});
 switch(s.id){
 case '001':zones=s.vaults.map((v,i)=>z(`Vault ${i+1}`,v.map(x=>`${x.side}:${x.value}`),`Payout ${twinValue(v)} · ${v.length}/4`));break;
 case '002':zones=s.wires.map((w,i)=>z(`Wire ${i+1}`,w,`Bank ${wireValue(w)} · ${w.length}/5`));break;
 case '003':zones=[z('3 × 3 sum-ten grid',s.grid.map(x=>x??'·'),`${lines(s.grid)} matching lines · bank ${tenScore(s.grid)}`)];break;
 case '005':zones=s.furnaces.map((f,i)=>z(`Furnace ${i+1}`,[`HEAT ${f.heat}/12`,`SPARKS ${f.sparks}`],`Bank ${furnaceValue(f)} points`));break;
 case '006':zones=[z('Oscillating track',[s.track.last,`×${s.track.combo}`,s.track.direction===1?'↑':s.track.direction===-1?'↓':'—'],`Current pot ${s.track.pot} · blind successes ${s.track.blinds}/2`)];pot=s.track.pot;break;
 case '007':zones=[z('Beacon ring',[0,1,2,3,4,5,6].map(x=>x===s.pos?`[${x}]`:x),`Current ${s.pos} · beacons 0, 2, 4 · combo ×${s.combo}`)];add('Seals',s.seals);break;
 case '008':zones=[z('Signed meter',[s.meter.pos,`×${s.meter.combo}`],`Safe zone −6…+6 · Overloads ${s.meter.overloads}/2`)];pot=s.meter.pot;break;
 case '009':zones=[z('Three-slot pattern',s.board,`Pattern ${pattern(s.board)||'—'} · last ${s.last||'—'} · combo ×${s.combo}`)];add('Press chips',s.chips);break;
 case '011':zones=s.jars.map((j,i)=>z(`Jar ${i+1}`,j.cards,`Cash ${oddValue(j)} · blind successes ${j.blinds}/2`));break;
 case '012':zones=[z('2 × 2 link board',s.grid,`${seamLinks(s.grid).length} links · streak ${s.streak}`)];add('Dares',s.dares);break;
 case '013':zones=[z('Glass furnace',s.kiln.cards,`Heat ${sum(s.kiln.cards)}/10 · stored pot ${s.kiln.pot}`)];pot=s.kiln.pot;add('Sparks',s.sparks);break;
 case '014':zones=[z('Narrowing window',[s.lo,'→',s.hi],`Depth ${s.depth} · ${s.pendingDive!=null?`Revealed ${s.pendingDive}: choose boundary`:'only interior numbers fit'}`)];add('Dives',s.dives);break;
 case '015':zones=s.pans.map((p,i)=>z(`${i?'Right':'Left'} pan`,p,`Weight ${sum(p)} · ${p.length}/3 slots`));add('Press chips',s.chips);add('Press bonus',`×${3**s.bonus}`);add('Load value',panVal(s));break;
 case '016':zones=s.wheels.map((w,i)=>z(`Dial ${targetName(i)}`,[w],`Wraps modulo 7 · last CLICK ${s.lastClick===i?'here':'elsewhere'}`));add('Overdrives',s.tokens);add('CLICK streak',s.streak);break;
 case '018':zones=[z('3 × 3 root network',s.grid.map(x=>x??'·'),`${connectedGroups(s.grid).filter(g=>g.length>=2).length} harvestable groups · adjacent numbers differ by one`)];add('BANK seals',s.banks);add('GRAFT tokens',s.grafts);break;
 case '017':zones=s.bells.map((b,i)=>z(`Bell ${targetName(i)}`,b?[`${b.remaining} ticks`,b.fate?'FATE':`${b.original} card`]:['—'],b?'Rings at 0':'Empty'));add('Pledges',s.tokens);if(s.pledge)add('Fate deadline',s.pledge);break;
 }
 return {zones,pot,stats,score:s.score,deck:s.deck.length,hand:s.hand.length};
}
export const prototypeIds=['001','002','003','005','006','007','008','009','011','012','013','014','015','016','017','018'];
export function createPrototype(id,random){if(!prototypeIds.includes(id))throw new Error('Unknown prototype: '+id);return initial(id,random);}
export const prototypeActions=legal;
export const prototypeStep=perform;
export const prototypeView=view;
