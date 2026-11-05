import {newOverswing,stepOverswing,overswingActions} from '../external/engines.js';

// First bite-sized level: 10 ordinary cards, 3 in hand, no abilities.
// The original Overswing engine owns the full movement, Pot, Bank, and SNAP logic.
export const FIRST_LEVEL=Object.freeze({
  target:24,maxSnaps:2,
  deck:Object.freeze([2,21,4,12,23,10,22,3,20,5]),
  handSize:3,
  rules:Object.freeze({snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true})
});
export function newRound(){return {
  game:newOverswing({mode:'short',seed:20261104,deckOverride:FIRST_LEVEL.deck,initialHandSize:FIRST_LEVEL.handSize}),
  snaps:0,turn:0,event:{id:0,type:'start'}
};}
export function stepFirstLevel(old,action){
  if(old.snaps>=FIRST_LEVEL.maxSnaps||old.game.status!=='playing'||old.game.deal.T>=FIRST_LEVEL.target)return old;
  const legal=overswingActions(old.game,FIRST_LEVEL.rules);
  if(!legal.some(a=>a.type===action?.type&&
    (a.type!=='steer'||a.index===action.index)&&
    (a.type!=='bank'||a.dropIndex===action.dropIndex)))return old;
  const next=stepOverswing(old.game,action,FIRST_LEVEL.rules);
  if(next===old.game)return old;
  const snapped=!!next.lastAction?.snap;
  const victory=next.deal.T>=FIRST_LEVEL.target;
  const kind=victory?'win':snapped?'snap':action.type==='bank'?'bank':next.lastAction?.swung?'cross':action.type;
  return {game:next,snaps:old.snaps+(snapped?1:0),turn:old.turn+1,
    event:{id:old.turn+1,type:kind,message:next.last}};
}
