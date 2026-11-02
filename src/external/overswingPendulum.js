// Low-FPS, quantized pendulum motion. Entirely visual: never changes game state.
// SNAP swings to the limit and recoils to the resolved (usually zero) position.
export const PENDULUM_FPS=12;
export const PENDULUM_REGULAR_MS=440;
export const PENDULUM_SNAP_MS=750;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function pixelPendulumFrame(from,target,progress,limit=10,snapTo=null){
  if(!Number.isFinite(from)||!Number.isFinite(target)||
     !Number.isFinite(progress)||!Number.isFinite(limit)||limit<=0)
    throw new TypeError('Invalid pendulum animation input');
  const t=clamp(progress,0,1);
  if(t===1)return target;
  const frames=Math.floor(t*(PENDULUM_SNAP_MS/1000*PENDULUM_FPS));
  if(snapTo!==null&&Number.isFinite(snapTo)){
    const hit=Math.sign(snapTo||from||1)*limit;
    const tick=clamp(frames,0,8);
    if(tick<=4)return from+(hit-from)*(tick/4);
    if(tick===5)return hit;
    return hit+(target-hit)*((tick-5)/3);
  }
  // Explicit quantization makes a small, arcade-like series of frozen poses.
  const step=Math.floor(t*7)/7;
  return from+(target-from)*step;
}
