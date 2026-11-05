import {gsap} from 'gsap';

// Gameplay is never decided by animation: callers validate & compute the next
// deterministic state BEFORE starting the motion, then commit once it finishes.
const reducedMotion=()=>typeof window!=='undefined'&&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const point=(node,root)=>{
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
};
const cleanupStyle=node=>{
  if(!node)return;
  gsap.set(node,{clearProps:'scale'});
  node.style.opacity='';
};

function flyingCard(source,root,action){
  const r=source.getBoundingClientRect(),b=root.getBoundingClientRect();
  const flip=action.type==='flip';
  const clone=flip?document.createElement('div'):source.cloneNode(true);
  if(flip){
    clone.className='sgv-card sgv-card-flip sgv-flying-card';
    clone.innerHTML='<span class="sgv-card-glyph">✦</span><strong>?</strong>';
  }else clone.classList.add('sgv-flying-card');
  const width=flip?Math.max(78,Math.min(98,root.clientWidth*.25)):r.width;
  const height=flip?Math.max(94,Math.min(116,root.clientHeight*.16)):r.height;
  const x=r.left-b.left+(r.width-width)/2;
  const y=r.top-b.top+(r.height-height)/2;
  Object.assign(clone.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'});
  clone.setAttribute('aria-hidden','true');
  root.appendChild(clone);
  return {clone,start:{x:x+width/2,y:y+height/2},width,height,flip};
}

export function flyCardThroughCenter({root,source,action,nextValue,onComplete}){
  if(!root||!source||reducedMotion()){onComplete();return ()=>{};}
  const {clone,start,width,height,flip}=flyingCard(source,root,action);
  const centerNode=root.querySelector('.sgv-flight-center');
  const chestNode=root.querySelector('.sgv-chest-mouth');
  const center=centerNode?point(centerNode,root):{x:root.clientWidth/2,y:root.clientHeight*.42};
  const mouth=chestNode?point(chestNode,root):{x:root.clientWidth/2,y:root.clientHeight*.61};
  const x1=center.x-start.x,y1=center.y-start.y;
  const x2=mouth.x-start.x,y2=mouth.y-start.y;
  const originalOpacity=source.style.opacity;
  let active=true;
  const lift=gsap.to(source,{scale:.95,duration:.08,yoyo:true,repeat:1,ease:'sine.inOut'});
  const tl=gsap.timeline({onComplete:()=>{
    if(!active)return;
    active=false;
    source.style.opacity=originalOpacity;
    cleanupStyle(source);
    clone.remove();
    onComplete();
  }});
  tl.to(clone,{
    x:x1,y:y1,
    scale:1.3,
    rotation:flip?175:-8,
    duration:.34,
    ease:'power2.out',
    onStart:()=>{source.style.opacity='.32';}
  });
  tl.call(()=>{
    if(!active)return;
    if(flip){
      clone.className='sgv-card sgv-flying-card '+(nextValue<0?'sgv-card-cloud':'sgv-card-leaf');
      clone.innerHTML='<span class="sgv-card-glyph">✦</span><strong>'+
        (nextValue>0?'+':'')+String(nextValue)+'</strong>';
    }
    const meter=root.querySelector('.sgv-meter-track');
    if(meter){
      gsap.fromTo(meter,{filter:'brightness(1.25)'},{
        filter:'brightness(1)',duration:.38,ease:'power1.out',
        onComplete:()=>gsap.set(meter,{clearProps:'filter'})
      });
    }
  });
  tl.to(clone,{
    x:x2,y:y2,scale:.12,rotation:flip?350:12,
    opacity:0,duration:.36,ease:'power2.in'
  });
  return ()=>{
    active=false;tl.kill();lift.kill();
    source.style.opacity=originalOpacity;cleanupStyle(source);clone.remove();
  };
}

export function bankGoldIntoGlass({root,source,fromScore,toScore,onCount,onComplete}){
  if(!root||!source||reducedMotion()||toScore<=fromScore){
    onCount(toScore);onComplete();return ()=>{};
  }
  const chest=root.querySelector('.sgv-chest-body');
  if(!chest){onCount(toScore);onComplete();return ()=>{};}
  const origin=point(source,root),dest=point(chest,root);
  dest.y+=chest.getBoundingClientRect().height*.19;
  const quantity=Math.min(9,Math.max(5,Math.ceil((toScore-fromScore)/3)));
  const nodes=[],tl=gsap.timeline({onComplete:()=>{
    if(!active)return;
    active=false;onCount(toScore);
    nodes.forEach(n=>n.remove());onComplete();
  }});
  let active=true;
  for(let i=0;i<quantity;i++){
    const coin=document.createElement('span');
    coin.className='sgv-flying-gold';
    coin.setAttribute('aria-hidden','true');
    coin.textContent='★';
    Object.assign(coin.style,{left:origin.x+'px',top:origin.y+'px'});
    root.appendChild(coin);nodes.push(coin);
    const x=(dest.x-origin.x)+((i*17)%65-32);
    const y=(dest.y-origin.y)+((i*13)%31-15);
    const delay=i*.052;
    tl.to(coin,{
      x:x*.5+((i%3)-1)*31,
      y:Math.min(y,-100)-55-(i%4)*13,
      scale:1.25,rotation:i*24,duration:.32,
      ease:'sine.out'
    },delay);
    tl.to(coin,{
      x,y,scale:.4,rotation:i*24+170,
      opacity:0,duration:.42,
      ease:'power2.in'
    },delay+.32);
  }
  const displayed={value:fromScore};
  tl.to(displayed,{value:toScore,duration:.82,ease:'power1.out',
    onUpdate:()=>{if(active)onCount(Math.round(displayed.value));}
  },.19);
  const glow=root.querySelector('.sgv-chest-glow');
  if(glow)tl.fromTo(glow,{opacity:.28,scale:.92},{
    opacity:1,scale:1.12,duration:.26,repeat:1,yoyo:true
  },.35);
  tl.call(()=>{
    if(chest)gsap.fromTo(chest,{scale:.97},{scale:1,duration:.45,ease:'elastic.out(1,.45)'});
  },[],.5);
  return ()=>{active=false;tl.kill();nodes.forEach(n=>n.remove());};
}

/**
 * A tier earned by the actual engine flies from the swing marker into the
 * corresponding hanging factor. Numbers in the pills always come from the
 * committed deal; the motion is cosmetic and never updates score or factors.
 */
export function flyMultiplierRewards({root,rewards}){
  if(!root||!rewards?.length||reducedMotion())return ()=>{};
  const originNode=root.querySelector('.sgv-meter-marker')||root.querySelector('.sgv-meter-track');
  if(!originNode)return ()=>{};
  const start=point(originNode,root),chips=[],tweens=[];
  rewards.forEach(({kind,value},index)=>{
    const target=root.querySelector('[data-factor="'+kind+'"]');
    if(!target)return;
    const end=point(target,root);
    const chip=document.createElement('span');
    chip.className='sgv-bonus-flyer';
    chip.textContent='×'+value;
    chip.setAttribute('aria-hidden','true');
    Object.assign(chip.style,{left:start.x+'px',top:start.y+'px',
      marginLeft:'-21px',marginTop:'-16px'});
    root.appendChild(chip);
    chips.push(chip);
    const delay=index*.09;
    const timeline=gsap.timeline({onComplete:()=>chip.remove()});
    timeline.fromTo(chip,{scale:.55,opacity:0},{
      scale:1.22,opacity:1,duration:.2,ease:'back.out(2)'
    },delay);
    timeline.to(chip,{
      x:end.x-start.x,y:end.y-start.y,scale:.72,
      duration:.51,ease:'power2.inOut'
    },delay+.19);
    timeline.to(chip,{scale:.25,opacity:0,duration:.13,ease:'sine.in'},delay+.69);
    timeline.call(()=>{
      const punch=gsap.fromTo(target,{scale:.89},{scale:1,duration:.4,
        ease:'elastic.out(1,.45)'});
      tweens.push(punch);
    },[],delay+.69);
    tweens.push(timeline);
  });
  return ()=>{
    for(const tween of tweens)tween.kill();
    for(const chip of chips)chip.remove();
    for(const {kind} of rewards){
      const target=root.querySelector('[data-factor="'+kind+'"]');
      if(target)gsap.set(target,{clearProps:'scale'});
    }
  };
}
