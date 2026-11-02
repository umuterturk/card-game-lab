// Low-resolution, Doom-style heat diffusion. No assets, shaders, or per-frame allocations.
// Low heat values render as translucent gray smoke; hot values render as flame.
export const DOOM_FIRE_MAX=36;
export const DOOM_FIRE_PALETTE=Object.freeze(Array.from({length:DOOM_FIRE_MAX+1},(_,i)=>{
  if(i===0)return Object.freeze([0,0,0,0]);
  if(i<=8)return Object.freeze([86+i*4,78+i*3,81+i*2,Math.min(110,16+i*10)]);
  if(i<=13)return Object.freeze([100+i*4,61+i*2,60+i,135]);
  if(i<=22)return Object.freeze([Math.min(241,155+i*4),28+Math.floor(i*1.4),18,195]);
  if(i<=29)return Object.freeze([255,Math.min(210,28+(i-21)*19),34,220]);
  if(i<=34)return Object.freeze([255,Math.min(245,177+(i-29)*14),55+(i-29)*20,245]);
  return Object.freeze([255,250,200+(i-35)*30,250]);
}));
export function createDoomFire(width=96,height=40,seed=12345){
  if(!Number.isInteger(width)||!Number.isInteger(height)||
     width<8||height<8||width>256||height>128)
    throw new RangeError('Invalid Doom fire grid size');
  const intensity=new Uint8Array(width*height);
  intensity.fill(DOOM_FIRE_MAX,(height-1)*width);
  return {width,height,intensity,seed:seed>>>0};
}
function nextRandom(state){
  state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;
  return state.seed;
}
export function stepDoomFire(state){
  const {width:w,height:h,intensity:heat}=state;
  // Read each lower row before it is modified, so one buffer is enough.
  // Sampling neighbouring columns causes dancing flames and drifting smoke.
  for(let y=0;y<h-1;y++){
    const row=y*w,below=(y+1)*w;
    for(let x=0;x<w;x++){
      const random=nextRandom(state),wind=(random>>>15)%3-1;
      const sourceX=Math.min(w-1,Math.max(0,x+wind));
      const cooling=(random>>>24)%3;
      const source=heat[below+sourceX];
      heat[row+x]=source>cooling?source-cooling:0;
    }
  }
  const floor=(h-1)*w;
  for(let x=0;x<w;x++){
    const random=nextRandom(state);
    heat[floor+x]=DOOM_FIRE_MAX-((random>>>28)&3);
  }
  return state;
}
export function paintDoomFire(state,rgba){
  const heat=state.intensity;
  if(rgba.length!==heat.length*4)throw new RangeError('Invalid frame buffer size');
  for(let i=0,j=0;i<heat.length;i++,j+=4){
    const shade=DOOM_FIRE_PALETTE[heat[i]];
    rgba[j]=shade[0];rgba[j+1]=shade[1];rgba[j+2]=shade[2];rgba[j+3]=shade[3];
  }
  return rgba;
}
