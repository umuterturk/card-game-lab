// A FLIP is drawn from the hidden deck, then enters the Pot only if safe.
// Visual flight uses engine events; it never affects deck, score, or input.
export function flipFlightResult(action){
  if(action?.type!=='flip'||!Number.isInteger(action.card))return null;
  return {
    card:action.card,
    destination:action.snap?'snap':'pot',
    shielded:!!action.shielded,
    zeroBreak:!!action.zeroBreak
  };
}
export function flipFlightPoints(source,target,viewport){
  const finiteRect=r=>r&&[r.left,r.top,r.width,r.height].every(Number.isFinite);
  if(!finiteRect(source)||!finiteRect(target)||
    !Number.isFinite(viewport?.width)||!Number.isFinite(viewport?.height)||
    viewport.width<=0||viewport.height<=0)throw new TypeError('Invalid FLIP flight bounds');
  const center=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
  const start=center(source),end=center(target);
  const middle={x:viewport.width/2,
    y:Math.max(100,Math.min(viewport.height-120,viewport.height*.44))};
  // CSS transforms apply to an 82x116px card whose origin is the upper left.
  const x=point=>Math.round(point.x-41)+'px';
  const y=point=>Math.round(point.y-58)+'px';
  return {'--flip-start-x':x(start),'--flip-start-y':y(start),
    '--flip-center-x':x(middle),'--flip-center-y':y(middle),
    '--flip-end-x':x(end),'--flip-end-y':y(end)};
}

// STEER is a hand-card action, not a random draw. It can land in the Pot,
// be discarded on a non-crossing move, or break at the meter on SNAP.
export function steerFlightResult(action){
  if(action?.type!=='steer'||!Number.isInteger(action.card))return null;
  return {
    card:action.card,
    destination:action.snap?'snap':action.destination==='pot'?'pot':'discard',
    shielded:false,
    zeroBreak:!!action.zeroBreak,
    kind:'steer',
    reversed:!!action.polarityReversed
  };
}
export function cardFlightResult(action){
  const flip=flipFlightResult(action);
  return flip?{...flip,kind:'flip'}:steerFlightResult(action);
}
// Deliberately bounded particle budgets: very large BANKs feel bigger, but
// never allocate hundreds of DOM nodes on small phones.
export function bankCoinCount(points){
  if(!Number.isFinite(points)||points<=0)return 0;
  if(points<10)return 3;
  if(points<100)return 5;
  if(points<1000)return 9;
  if(points<10000)return 14;
  if(points<100000)return 20;
  return 28;
}
export function bankCoinBurst(action){
  if(action?.type!=='bank')return null;
  const amount=Number(action.points);
  const count=bankCoinCount(amount);
  return count?{amount,count}:null;
}

// Particle centers are derived from actual mounted controls, never fixed pixels.
export function bankBurstPoints(source,target){
  const finite=r=>r&&[r.left,r.top,r.width,r.height].every(Number.isFinite);
  if(!finite(source)||!finite(target))throw new TypeError('Invalid BANK coin bounds');
  const x=r=>Math.round(r.left+r.width/2-11)+'px';
  const y=r=>Math.round(r.top+r.height/2-11)+'px';
  return {
    '--bank-start-x':x(source),'--bank-start-y':y(source),
    '--bank-end-x':x(target),'--bank-end-y':y(target)
  };
}
