import {gsap} from 'gsap';

// Visual effects deliberately do not mutate the game engine. Call onComplete once
// the action has landed so screenshots, counters and the deterministic rules agree.
const center = (node,rootBounds) => {
  const rect=node.getBoundingClientRect();
  return {x:rect.left-rootBounds.left+rect.width/2,y:rect.top-rootBounds.top+rect.height/2};
};
const reduceMotion=()=>typeof window!=='undefined'&&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function makeCardClone(source,action,nextCard,root) {
  const b=source.getBoundingClientRect(),stage=root.getBoundingClientRect();
  const flip=action.type==='flip';
  const node=flip?document.createElement('div'):source.cloneNode(true);
  if(flip){
    node.className='sg-card sg-card-cloud sg-flying-card sg-flying-flip';
    node.innerHTML='<span class="sg-card-icon">✦</span><strong>?</strong>';
  }else node.classList.add('sg-flying-card');
  const width=flip?Math.min(95,Math.max(72,b.width*1.65)):b.width;
  const height=flip?Math.min(115,Math.max(92,b.height*1.55)):b.height;
  const start={x:b.left-stage.left+(b.width-width)/2,y:b.top-stage.top+(b.height-height)/2};
  node.style.left=start.x+'px';
  node.style.top=start.y+'px';
  node.style.width=width+'px';
  node.style.height=height+'px';
  node.setAttribute('aria-hidden','true');
  root.appendChild(node);
  return {node,start,width,height,flip,nextCard};
}

export function animateCardTravel({root,source,action,nextCard,onComplete}) {
  if(!root||!source||reduceMotion()){onComplete();return ()=>{};}
  const visual=makeCardClone(source,action,nextCard,root);
  const {node,start,width,height,flip}=visual;
  const stage=root.getBoundingClientRect();
  const destination=root.querySelector('.sg-gauge-wrap')||root;
  const target=center(destination,stage);
  target.y-=Math.min(40,destination.getBoundingClientRect().height*.13);
  const endX=target.x-width/2,endY=target.y-height/2;
  const controlX=(start.x+endX)/2+(action.type==='flip'?38:-36);
  const controlY=Math.min(start.y,endY)-Math.max(48,stage.height*.1);
  const originalOpacity=source.style.opacity;
  const progress={value:0};
  let stopped=false;
  const press=gsap.to(source,{scale:.95,duration:.11,yoyo:true,repeat:1,ease:'power1.inOut'});
  const reveal=()=>{
    if(!flip)return;
    const value=nextCard;
    node.classList.remove('sg-card-leaf','sg-card-cloud','sg-card-drop');
    node.classList.add(value<0?'sg-card-cloud':'sg-card-leaf');
    node.innerHTML='<span class="sg-card-icon">✦</span><strong>'+
      (value>0?'+':'')+String(value)+'</strong>';
  };
  let revealed=false;
  const tween=gsap.to(progress,{value:1,duration:.58,ease:'power2.inOut',onUpdate:()=>{
    if(stopped)return;
    const p=progress.value,q=1-p;
    if(flip&&p>.42&&!revealed){revealed=true;reveal();}
    const x=q*q*start.x+2*q*p*controlX+p*p*endX;
    const y=q*q*start.y+2*q*p*controlY+p*p*endY;
    const scale=(1+.12*Math.sin(Math.PI*p))*(1-.42*p);
    const tilt=(flip?360:action.type==='steer'?-17:12)*p;
    node.style.transform='translate3d('+(x-start.x)+'px,'+(y-start.y)+'px,0) rotate('+
      tilt+'deg) scale('+scale+')';
    node.style.opacity=String(p>.78?1-(p-.78)/.22:1);
    if(p>.15)source.style.opacity='.35';
  },onComplete:()=>{
    if(stopped)return;
    stopped=true;source.style.opacity=originalOpacity;
    gsap.set(source,{clearProps:'scale'});
    node.remove();onComplete();
  }});
  return ()=>{
    stopped=true;tween.kill();press.kill();
    gsap.set(source,{clearProps:'scale'});
    source.style.opacity=originalOpacity;node.remove();
  };
}

export function animateBankIntoJar({root,fromScore,toScore,onCount,onComplete}){
  if(!root||reduceMotion()||toScore<=fromScore){
    onCount(toScore);onComplete();return ()=>{};
  }
  const badge=root.querySelector('.sg-pot-pill');
  const jar=root.querySelector('.sg-jar-art')||root.querySelector('.sg-jar');
  if(!badge||!jar){
    onCount(toScore);onComplete();return ()=>{};
  }
  const stage=root.getBoundingClientRect(),start=center(badge,stage),end=center(jar,stage);
  const amount=toScore-fromScore,quantity=Math.min(9,Math.max(5,Math.ceil(amount/3)));
  const nodes=[],tweens=[];
  let stopped=false;
  for(let i=0;i<quantity;i++){
    const chip=document.createElement('span');
    chip.className='sg-flying-gold';
    chip.textContent='★';
    chip.setAttribute('aria-hidden','true');
    const x0=start.x+(i-quantity/2)*2,y0=start.y+(i%3)*2;
    chip.style.left=x0+'px';chip.style.top=y0+'px';
    root.appendChild(chip);nodes.push(chip);
    const state={p:0};
    const finalX=end.x+(i%4-1.5)*11,finalY=end.y+14+(i%3)*5;
    const bendX=(x0+finalX)/2+23+(i%3)*5;
    const bendY=Math.min(y0,finalY)-62-(i%4)*7;
    const tween=gsap.to(state,{p:1,duration:.67,delay:i*.064,ease:'power2.inOut',onUpdate:()=>{
      if(stopped)return;
      const p=state.p,q=1-p;
      const x=q*q*x0+2*q*p*bendX+p*p*finalX;
      const y=q*q*y0+2*q*p*bendY+p*p*finalY;
      const scale=1-.63*p;
      chip.style.transform='translate3d('+(x-x0)+'px,'+(y-y0)+'px,0) rotate('+
        (p*260)+'deg) scale('+scale+')';
      chip.style.opacity=String(p>.85?1-(p-.85)/.15:1);
    },onComplete:()=>chip.remove()});
    tweens.push(tween);
  }
  const counter={value:fromScore};
  tweens.push(gsap.to(counter,{value:toScore,duration:.78,delay:.22,ease:'power2.out',onUpdate:()=>{
    if(!stopped)onCount(Math.round(counter.value));
  }}));
  const jarTween=gsap.to(jar,{
    scale:1.055,transformOrigin:'50% 65%',duration:.22,delay:.4,repeat:1,yoyo:true,ease:'sine.inOut'
  });
  tweens.push(jarTween);
  const endTime=.73+(quantity-1)*.064;
  const done=gsap.delayedCall(endTime+.08,()=>{
    if(stopped)return;
    stopped=true;gsap.set(jar,{clearProps:'scale,transformOrigin'});onCount(toScore);onComplete();
  });
  tweens.push(done);
  return ()=>{
    stopped=true;
    for(const tween of tweens)tween.kill();
    for(const node of nodes)node.remove();
    gsap.set(jar,{clearProps:'scale,transformOrigin'});
  };
}
