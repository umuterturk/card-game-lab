import {gsap} from 'gsap';

// All motions are presentation only. The game transaction is calculated once
// before this module is called; interrupting an animation never changes rules.
const reducedMotion=()=>typeof window!=='undefined'&&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const point=(node,root)=>{
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
};
const removeNodes=nodes=>nodes.forEach(node=>node?.remove());

function flyingCard(source,root,isFlip){
  const r=source.getBoundingClientRect(),b=root.getBoundingClientRect();
  const clone=isFlip?document.createElement('div'):source.cloneNode(true);
  if(isFlip){
    clone.className='sgv-card sgv-card-flip sgv-flying-card';
    clone.innerHTML='<span class="sgv-card-glyph">✦</span><strong>?</strong>';
  }else clone.classList.add('sgv-flying-card');
  clone.removeAttribute('disabled'); // Flying ghost stays vivid while original buttons are locked.
  const width=isFlip?Math.max(64,Math.min(92,root.clientWidth*.25)):r.width;
  const height=isFlip?Math.max(83,Math.min(113,root.clientHeight*.16)):r.height;
  const x=r.left-b.left+(r.width-width)/2;
  const y=r.top-b.top+(r.height-height)/2;
  Object.assign(clone.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'});
  clone.setAttribute('aria-hidden','true');
  root.appendChild(clone);
  return {clone,start:{x:x+width/2,y:y+height/2}};
}
function potChip(root,origin,value){
  const chip=document.createElement('span');
  chip.className='sgv-pot-fly';
  chip.setAttribute('aria-hidden','true');
  chip.textContent='+'+value;
  Object.assign(chip.style,{left:origin.x+'px',top:origin.y+'px'});
  root.appendChild(chip);
  return chip;
}

export function animateCardAction({
  root,source,action,view,onMeter,onPot,onFactors,onSnap,onComplete,firstFactorAwards=[]
}){
  if(!root||!source||reducedMotion()){
    if(view.snap){onMeter(view.to);onSnap();onMeter(0);}
    else {onMeter(view.to);onPot(view.rawPotAfter);}
    onFactors(view.factorsAfter);
    onComplete();
    return ()=>{};
  }
  const {clone,start}=flyingCard(source,root,action.type==='flip');
  const centerNode=root.querySelector('.sgv-flight-center');
  const potNode=root.querySelector('.sgv-pending-pot');
  const center=centerNode?point(centerNode,root):{x:root.clientWidth/2,y:root.clientHeight*.43};
  const tray=potNode?point(potNode,root):{x:root.clientWidth*.25,y:root.clientHeight*.63};
  const nodes=[clone],animations=[];
  const originalOpacity=source.style.opacity;
  const centerX=center.x-start.x,centerY=center.y-start.y;
  let alive=true;
  const clean=()=>{
    source.style.opacity=originalOpacity;
    gsap.set(source,{clearProps:'scale'});
    removeNodes(nodes);
  };
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;
    clean();
    onComplete();
  }});
  source.style.opacity='.36';
  animations.push(gsap.fromTo(source,{scale:1},{scale:.96,duration:.08,yoyo:true,repeat:1}));
  tl.to(clone,{x:centerX,y:centerY,scale:1.13,
    rotation:action.type==='flip'?160:-5,duration:.23,ease:'power2.out'},0);
  tl.call(()=>{
    if(!alive)return;
    if(action.type==='flip'){
      clone.className='sgv-card sgv-flying-card '+(view.signedCard<0?'sgv-card-cloud':'sgv-card-leaf');
      clone.innerHTML='<span class="sgv-card-glyph">✦</span><strong>'+
        (view.signedCard>0?'+':'')+view.signedCard+'</strong>';
    }
    // A mystery Flip reveals its value before the meter moves.
    // Known Steer cards move the meter immediately on tap.
    onMeter(view.to);
  },[],action.type==='flip'?.22:.08);
  if(view.snap){
    // The attempted meter target is shown at the boundary before returning to 0.
    tl.to(clone,{x:centerX+(view.to>=0?130:-130),y:centerY-18,
      scale:.45,rotation:view.to>=0?35:-35,opacity:0,
      duration:.30,ease:'power3.in'},.24);
    tl.call(()=>{if(alive){onSnap();onMeter(0);onPot(view.rawPotAfter);onFactors(view.factorsAfter);}},[],.53);
    tl.call(()=>{},[],.91);
  }else{
    if(view.addedToPot>0){
      const coin=potChip(root,center,view.addedToPot);
      nodes.push(coin);
      gsap.set(coin,{opacity:0,scale:.6});
      tl.to(coin,{x:tray.x-center.x,y:tray.y-center.y,
        opacity:1,scale:1.12,duration:.28,ease:'power2.out'},.24);
      tl.to(coin,{opacity:0,scale:.52,duration:.12},.50);
    }
    tl.to(clone,{x:tray.x-start.x,y:tray.y-start.y,
      scale:.12,rotation:action.type==='flip'?330:5,opacity:0,
      duration:.34,ease:'power2.in'},.25);
    tl.call(()=>{if(alive)onPot(view.rawPotAfter);},[],.54);
    if(view.rewards.length){
      tl.call(()=>{
        if(!alive)return;
        animations.push(flyMultiplierRewards({
          root,rewards:view.rewards,firstFactorAwards
        }));
      },[],.34);
      tl.call(()=>{if(alive)onFactors(view.factorsAfter);},[],.76);
      tl.call(()=>{},[],.86);
    }else{
      tl.call(()=>{if(alive)onFactors(view.factorsAfter);},[],.55);
      tl.call(()=>{},[],.62);
    }
  }
  return ()=>{
    alive=false;tl.kill();
    for(const animation of animations){
      if(typeof animation==='function')animation();
      else animation?.kill?.();
    }
    clean();
  };
}

const FIRST_AWARD_LABELS={swing:'CROSS BONUS',flip:'FLIP STREAK',jackpot:'JACKPOT'};

export function flyMultiplierRewards({root,rewards,firstFactorAwards=[]}){
  if(!root||!rewards?.length||reducedMotion())return ()=>{};
  const marker=root.querySelector('.sgv-meter-marker')||root.querySelector('.sgv-meter-track');
  if(!marker)return ()=>{};
  const start=point(marker,root),nodes=[],tweens=[];
  for(const [index,{kind,value}] of rewards.entries()){
    const target=root.querySelector('[data-factor="'+kind+'"]');
    if(!target)continue;
    const end=point(target,root);
    const chip=document.createElement('span');
    chip.className='sgv-bonus-flyer';
    chip.textContent='×'+value;
    chip.setAttribute('aria-hidden','true');
    Object.assign(chip.style,{left:start.x+'px',top:start.y+'px',marginLeft:'-21px',marginTop:'-16px'});
    root.appendChild(chip);nodes.push(chip);
    const delay=index*.055;
    const flight=gsap.timeline({onComplete:()=>chip.remove()});
    flight.fromTo(chip,{opacity:0,scale:.75},{opacity:1,scale:1.14,duration:.10},delay);
    flight.to(chip,{x:end.x-start.x,y:end.y-start.y,
      scale:.60,duration:.30,ease:'power2.inOut'},delay+.10);
    flight.to(chip,{opacity:0,scale:.2,duration:.10},delay+.40);
    flight.call(()=>{
      const bounce=gsap.fromTo(target,{scale:.88},
        {scale:1,duration:.26,ease:'back.out(2.1)'});
      tweens.push(bounce);
    },[],delay+.40);
    tweens.push(flight);
    if(firstFactorAwards.includes(kind)){
      const tip=document.createElement('span');
      tip.className='sgv-factor-tip';
      tip.textContent=FIRST_AWARD_LABELS[kind]||'BONUS';
      Object.assign(tip.style,{left:end.x+'px',top:end.y+28+'px'});
      tip.setAttribute('aria-hidden','true');
      root.appendChild(tip);nodes.push(tip);
      tweens.push(gsap.fromTo(tip,{opacity:0,y:4},{
        opacity:1,y:0,duration:.16,delay:delay+.3,
        onComplete:()=>gsap.to(tip,{opacity:0,duration:.2,delay:.52,onComplete:()=>tip.remove()})
      }));
    }
  }
  return ()=>{
    for(const t of tweens)t.kill?.();
    removeNodes(nodes);
    for(const {kind} of rewards){
      const pill=root.querySelector('[data-factor="'+kind+'"]');
      if(pill)gsap.set(pill,{clearProps:'scale'});
    }
  };
}

/**
 * A Snap destroys only the unbanked Pot. Short falling coins make the
 * loss visible without changing any engine value or touching the chest.
 */
export function animateSnapLoss(root,lostPot){
  if(!root||!lostPot||reducedMotion())return ()=>{};
  const tray=root.querySelector('.sgv-pending-pot');
  if(!tray)return ()=>{};
  const origin=point(tray,root),coins=[],tweens=[];
  const count=Math.min(7,Math.max(3,Math.ceil(lostPot/2)));
  for(let i=0;i<count;i++){
    const coin=document.createElement('span');
    coin.className='sgv-flying-gold sgv-lost-coin';
    coin.setAttribute('aria-hidden','true');
    Object.assign(coin.style,{left:origin.x+'px',top:origin.y+'px'});
    root.appendChild(coin);coins.push(coin);
    const dx=(i-(count-1)/2)*18;
    const tw=gsap.fromTo(coin,{scale:1,opacity:.95,x:0,y:0},
      {scale:.57,opacity:0,x:dx,y:54+(i%3)*12,rotation:dx*2,
       duration:.42,delay:i*.035,ease:'power2.in',
       onComplete:()=>coin.remove()});
    tweens.push(tw);
  }
  return ()=>{
    for(const tw of tweens)tw.kill();
    removeNodes(coins);
  };
}

export function animateFactorReset(root){
  if(!root||reducedMotion())return ()=>{};
  const targets=Array.from(root.querySelectorAll('.sgv-multiplier-pill'));
  const tw=gsap.fromTo(targets,{y:0,filter:'saturate(1)'},
    {y:4,filter:'saturate(.55)',duration:.14,yoyo:true,repeat:1,
      onComplete:()=>gsap.set(targets,{clearProps:'y,filter'})});
  return ()=>{tw.kill();gsap.set(targets,{clearProps:'y,filter'});};
}

export function bankGoldIntoGlass({root,source,fromScore,toScore,onTake,onCount,onComplete}){
  if(!root||!source||reducedMotion()||toScore<=fromScore){
    onTake();onCount(toScore);onComplete();return ()=>{};
  }
  const chest=root.querySelector('.sgv-chest-body');
  if(!chest){onTake();onCount(toScore);onComplete();return ()=>{};}
  const origin=point(source,root),dest=point(chest,root);
  dest.y+=chest.getBoundingClientRect().height*.17;
  let alive=true;
  const nodes=[],tweens=[];
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;onCount(toScore);removeNodes(nodes);onComplete();
  }});
  const quantity=Math.min(12,Math.max(6,Math.ceil((toScore-fromScore)/4)));
  for(let i=0;i<quantity;i++){
    const coin=document.createElement('span');
    coin.className='sgv-flying-gold';coin.setAttribute('aria-hidden','true');
    Object.assign(coin.style,{left:origin.x+'px',top:origin.y+'px'});
    root.appendChild(coin);nodes.push(coin);
    const x=dest.x-origin.x+((i*17)%65-32);
    const y=dest.y-origin.y+((i*13)%31-15);
    const delay=i*.035;
    tl.to(coin,{x:x*.48+((i%3)-1)*35,y:Math.min(y,-70)-24-(i%4)*12,
      scale:1.25,rotation:i*25,duration:.27,ease:'sine.out'},delay+.12);
    tl.to(coin,{x,y,scale:.42,rotation:i*25+140,opacity:0,
      duration:.39,ease:'power2.in'},delay+.39);
  }
  tl.call(()=>{if(alive)onTake();},[],.15);
  const displayed={value:fromScore};
  // The counter starts only as coins reach the glass, not while they are airborne.
  tl.to(displayed,{value:toScore,duration:.55,ease:'power2.out',
    onUpdate:()=>{if(alive)onCount(Math.round(displayed.value));}},.77);
  const reward=document.createElement('span');
  reward.className='sgv-bank-score-fly';
  reward.textContent='+'+(toScore-fromScore);
  reward.setAttribute('aria-hidden','true');
  Object.assign(reward.style,{left:dest.x+'px',top:(dest.y-50)+'px'});
  root.appendChild(reward);nodes.push(reward);
  tl.fromTo(reward,{opacity:0,scale:.7,y:13},
    {opacity:1,scale:1.13,y:-9,duration:.23,ease:'back.out(2)'},.80);
  tl.to(reward,{opacity:0,y:-30,duration:.28,ease:'power2.in'},1.08);
  const glow=root.querySelector('.sgv-chest-glow');
  if(glow)tweens.push(gsap.fromTo(glow,{opacity:.3,scale:.94},
    {opacity:1,scale:1.16,duration:.29,repeat:1,yoyo:true,paused:true}));
  tl.call(()=>{
    if(!alive)return;
    if(glow)tweens[0]?.play();
    tweens.push(gsap.fromTo(chest,{scale:.95},
      {scale:1,duration:.36,ease:'elastic.out(1,.48)'}));
  },[],.87);
  tl.call(()=>{},[],1.42);
  return ()=>{
    alive=false;tl.kill();for(const t of tweens)t.kill?.();removeNodes(nodes);
    gsap.set(chest,{clearProps:'scale'});
    if(glow)gsap.set(glow,{clearProps:'scale,opacity'});
  };
}
