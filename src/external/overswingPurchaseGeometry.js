import {bankBurstPoints} from './overswingFlipFlight.js';

// BANK flies from an action to Gold. A purchase reuses the same coin path,
// with Gold as the source and the item as the destination.
export function purchaseFlightPoints(target,root){
  if(!target?.getBoundingClientRect||!root?.querySelector)return null;
  const scope=target.closest?.('.os8-history-overlay, .oj-shell')||root;
  const wallet=scope.querySelector('[data-oj-treasury]')||
    root.querySelector('[data-oj-treasury]');
  if(!wallet?.getBoundingClientRect)return null;
  return {style:bankBurstPoints(
    wallet.getBoundingClientRect(),target.getBoundingClientRect())};
}
