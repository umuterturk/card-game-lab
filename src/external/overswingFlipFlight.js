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
