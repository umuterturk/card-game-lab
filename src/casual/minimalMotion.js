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
    coin.className='sgv-fluid-drop sgv-lost-drop';
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

// Presentation-only choreography. Geometry is measured from real bottle lips:
// first bring the Pot mouth above the Bank mouth, then pour a short stream.
// Payouts and legal moves continue to come exclusively from the engine.
export function animateBankPour({
  root,source,potValue,fromScore,toScore,onPourProgress,onTake,onCount,onComplete
}){
  const settle=()=>{
    onPourProgress?.(0);
    onTake();
    onCount(toScore);
    onComplete();
  };
  if(!root||!source||reducedMotion()||toScore<=fromScore){
    settle();return ()=>{};
  }
  const bank=root.querySelector('.sgv-chest-body');
  const mouth=root.querySelector('.sgv-chest-mouth');
  const lip=source.querySelector('.sgv-pot-pour-lip');
  if(!bank||!mouth||!lip){
    settle();return ()=>{};
  }

  // Measure the *rotated* source lip without showing that rotation.
  // This works regardless of iPhone viewport size or safe-area insets.
  const bankPoint=point(mouth,root);
  const bankRect=bank.getBoundingClientRect();
  const angle=56;
  gsap.set(source,{rotation:angle,transformOrigin:'50% 72%'});
  const rotatedLip=point(lip,root);
  gsap.set(source,{rotation:0});
  const targetLip={
    x:bankPoint.x-Math.min(40,bankRect.width*.20),
    y:bankPoint.y-Math.min(27,bankRect.height*.20)
  };
  const approach={x:targetLip.x-rotatedLip.x,y:targetLip.y-rotatedLip.y};

  let alive=true,glowTween;
  const nodes=[],tweens=[];
  const cleanup=()=>{
    for(const tween of tweens)tween.kill?.();
    removeNodes(nodes);
    gsap.set(source,{clearProps:'x,y,rotation,transformOrigin'});
    gsap.set(bank,{clearProps:'scale'});
    const glow=root.querySelector('.sgv-chest-glow');
    if(glow)gsap.set(glow,{clearProps:'scale,opacity'});
  };
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;
    onPourProgress?.(0);
    onTake();
    onCount(toScore);
    cleanup();
    onComplete();
  }});

  // 1. Lift toward the receiving mouth, then tip right into pouring position.
  tl.to(source,{x:approach.x*.48,y:approach.y*.82,rotation:24,
    duration:.26,ease:'power2.out'},0);
  tl.to(source,{x:approach.x,y:approach.y,rotation:angle,
    duration:.27,ease:'power2.inOut'},.23);

  // 2. Draw a SHORT connecting stream from the arrived lip to the open jar.
  tl.call(()=>{
    if(!alive)return;
    const start=point(lip,root),end=point(mouth,root);
    const doc=root.ownerDocument;
    const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('sgv-pour-stream');
    svg.setAttribute('viewBox','0 0 '+root.clientWidth+' '+root.clientHeight);
    svg.setAttribute('width',root.clientWidth);
    svg.setAttribute('height',root.clientHeight);
    svg.setAttribute('aria-hidden','true');
    root.appendChild(svg);nodes.push(svg);
    const dx=end.x-start.x,dy=end.y-start.y;
    const d='M '+start.x+' '+start.y+' C '+(start.x+dx*.36)+' '+(start.y-8)+
      ', '+(end.x-dx*.25)+' '+(end.y-Math.max(6,dy*.20))+', '+end.x+' '+end.y;
    for(const [kind,width] of [['sgv-pour-stream-glow','9'],['sgv-pour-stream-core','4.5']]){
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',d);
      path.setAttribute('class',kind);
      path.setAttribute('stroke-width',width);
      path.setAttribute('fill','none');
      path.setAttribute('stroke-linecap','round');
      svg.appendChild(path);
      const length=path.getTotalLength();
      gsap.set(path,{strokeDasharray:length,strokeDashoffset:length});
      tweens.push(gsap.to(path,{strokeDashoffset:0,duration:.15,ease:'power1.in'}));
    }
    tweens.push(gsap.to(svg,{opacity:0,duration:.20,delay:.88}));
    const splash=doc.createElement('span');
    splash.className='sgv-pour-splash';
    splash.setAttribute('aria-hidden','true');
    Object.assign(splash.style,{left:end.x+'px',top:(end.y+6)+'px'});
    root.appendChild(splash);nodes.push(splash);
    tweens.push(gsap.fromTo(splash,{opacity:0,scale:.55},
      {opacity:.95,scale:1,duration:.22,repeat:2,yoyo:true,delay:.12}));
    tweens.push(gsap.to(splash,{opacity:0,duration:.18,delay:.83}));
  },[],.51);

  // 3. A single progress value drives BOTH liquid volumes, starting as the
  // stream reaches the jar. The Pot starts draining immediately, not at the end.
  const transfer={value:0},gain=toScore-fromScore,initialPot=Math.max(0,potValue||0);
  tl.to(transfer,{value:1,duration:.83,ease:'power1.inOut',
    onUpdate:()=>{
      if(!alive)return;
      onPourProgress?.(Math.max(0,initialPot*(1-transfer.value)));
      onCount(Math.round(fromScore+gain*transfer.value));
    }},.63);

  // 4. Small earned-value acknowledgement near the surface, never a giant popup.
  const earned=root.ownerDocument.createElement('span');
  earned.className='sgv-bank-score-fly';
  earned.textContent='+'+gain;
  earned.setAttribute('aria-hidden','true');
  Object.assign(earned.style,{left:bankPoint.x+'px',top:(bankPoint.y+20)+'px'});
  root.appendChild(earned);nodes.push(earned);
  tl.fromTo(earned,{opacity:0,scale:.8,y:5},
    {opacity:1,scale:1.06,y:-9,duration:.21,ease:'back.out(1.7)'},.96);
  tl.to(earned,{opacity:0,y:-23,duration:.26,ease:'power2.in'},1.25);

  const glow=root.querySelector('.sgv-chest-glow');
  if(glow){
    glowTween=gsap.fromTo(glow,{opacity:.25,scale:.96},
      {opacity:.66,scale:1.05,duration:.25,repeat:1,yoyo:true,paused:true});
    tweens.push(glowTween);
  }
  tl.call(()=>{
    if(!alive)return;
    glowTween?.play();
    tweens.push(gsap.fromTo(bank,{scale:.99},
      {scale:1,duration:.26,ease:'back.out(1.5)'}));
  },[],.85);

  // The bottle settles only after the transferred fluid has drained.
  tl.to(source,{x:0,y:0,rotation:0,duration:.34,ease:'power2.inOut'},1.50);
  tl.call(()=>{},[],1.88);
  return ()=>{
    alive=false;tl.kill();cleanup();
  };
}
