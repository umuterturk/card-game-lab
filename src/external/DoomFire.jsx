import React,{useEffect,useRef} from 'react';
import {createDoomFire,stepDoomFire,paintDoomFire} from './doomFire.js';

// Tiny canvas sprite, blown up with image-rendering:pixelated.
// 15 FPS maximum. Pauses offscreen, in background tabs, and for reduced motion.
export default function DoomFire({className='',width=96,height=40}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext?.('2d',{alpha:true});
    if(!ctx)return;
    canvas.width=width;canvas.height=height;
    ctx.imageSmoothingEnabled=false;
    const image=ctx.createImageData(width,height);
    const state=createDoomFire(width,height,Date.now());
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let visible=true,raf=0,last=0,observer=null;
    const draw=()=>{stepDoomFire(state);paintDoomFire(state,image.data);ctx.putImageData(image,0,0);};
    // Warm up the fire field even on reduced-motion devices so it has a static sprite.
    for(let i=0;i<height;i++)stepDoomFire(state);
    paintDoomFire(state,image.data);ctx.putImageData(image,0,0);
    function frame(time){
      raf=0;
      if(!visible||document.hidden||motion?.matches)return;
      if(time-last>=66){
        draw();last=time;
      }
      raf=window.requestAnimationFrame(frame);
    }
    function sync(){
      const shouldRun=visible&&!document.hidden&&!motion?.matches;
      if(!shouldRun){
        if(raf)window.cancelAnimationFrame(raf);
        raf=0;last=0;
      }else if(!raf)raf=window.requestAnimationFrame(frame);
    }
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        visible=!!entries[0]?.isIntersecting;sync();
      },{threshold:0.01});
      observer.observe(canvas);
    }
    document.addEventListener('visibilitychange',sync);
    if(motion?.addEventListener)motion.addEventListener('change',sync);
    else motion?.addListener?.(sync);
    sync();
    return ()=>{
      if(raf)window.cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener('visibilitychange',sync);
      if(motion?.removeEventListener)motion.removeEventListener('change',sync);
      else motion?.removeListener?.(sync);
    };
  },[width,height]);
  return <canvas ref={canvasRef} className={'os8-doom-fire '+className}
    width={width} height={height} aria-hidden="true" role="presentation"/>;
}
