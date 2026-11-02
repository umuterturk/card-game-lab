// Presentation-only classification of completed swing actions.
// The engine remains the sole source of truth for ZERO BREAK and SNAP.
export function swingImpactForAction(action){
  if(!action||(action.type!=='steer'&&action.type!=='flip'))return null;
  if(action.snap===true)return {kind:'snap',side:action.to<0?'left':'right'};
  if(action.zeroBreak===true)return {kind:'zero',side:'center'};
  return null;
}
