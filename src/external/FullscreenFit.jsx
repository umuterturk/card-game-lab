import React,{useLayoutEffect,useRef,useState} from 'react';

// Scales the *whole* current screen only when necessary. No game element is clipped,
// including forced tutorial steps, relic choices and end-of-run actions.
export default function FullscreenFit({children}){
  const frame=useRef(null),content=useRef(null);
  const [scale,setScale]=useState(1);
  useLayoutEffect(()=>{
    const parent=frame.current,inner=content.current;
    if(!parent||!inner)return undefined;
    let raf=0;
    const fit=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const available=parent.clientHeight;
        const natural=inner.scrollHeight;
        if(!available||!natural)return;
        const next=Math.max(0.1,Math.min(1,available/natural));
        setScale(previous=>Math.abs(previous-next)>0.002?next:previous);
      });
    };
    fit();
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(fit):null;
    observer?.observe(parent);
    observer?.observe(inner);
    window.addEventListener('resize',fit);
    window.addEventListener('orientationchange',fit);
    window.visualViewport?.addEventListener('resize',fit);
    document.fonts?.ready?.then(fit);
    return ()=>{
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize',fit);
      window.removeEventListener('orientationchange',fit);
      window.visualViewport?.removeEventListener('resize',fit);
    };
  },[]);
  return <div ref={frame} className="ov-full-frame">
    <div ref={content} className="ov-full-surface"
      style={{transform:'scale('+scale+')'}}>{children}</div>
  </div>;
}
