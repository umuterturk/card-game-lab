// Pure state transitions for the two playable proof-of-concept games.
export const numbers = () => Array.from({ length: 24 }, (_, i) => Math.floor(i / 4) + 1);
export const storms = () => Array.from({ length: 14 }, (_, i) => Math.floor(i / 2) + 1);
export function shuffled(input, random = Math.random) {
  const values = [...input];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
const log = (s, message) => ({ ...s, message, history: [message, ...s.history].slice(0, 16) });
const take = (arr) => {const copy = [...arr]; const value = copy.pop(); return [copy, value];};
const refill = (deck, hand) => {const cards = [...hand];const rest=[...deck]; while (cards.length < 3 && rest.length) cards.push(rest.pop()); return [rest,cards];};
export const emptyShip = () => ({ cargo: [], shield: null, storms: 0, sealed: false });
export const shipValue = ship => ship.cargo.length ? ship.cargo.reduce((n, v) => n * v, 1) * 3 ** ship.storms : 0;
export function initStorm(random = Math.random, override = {}) {
  const [deck, hand] = refill(shuffled(numbers(), random), []);
  return { deck, hand, weather: shuffled(storms(),random), seenWeather: [], ships: [emptyShip(), emptyShip()], score: 0, burns: 0, success: 0, message: 'Choose a card, then load it as cargo or shield.', history: [], ...override };
}
export function stormChance(s, shipIndex) {
  const ship=s.ships[shipIndex];
  if (ship.shield == null || !s.weather.length) return 0;
  return s.weather.filter(v => v + ship.storms <= ship.shield).length / s.weather.length;
}
export function stormStep(s, action) {
  const ship = s.ships[action.ship];
  if (!ship) return s;
  let next = { ...s, hand: [...s.hand], deck: [...s.deck], weather: [...s.weather], ships: s.ships.map(x => ({ ...x, cargo: [...x.cargo] })) };
  const target = next.ships[action.ship];
  const label = `Ship ${action.ship + 1}`;
  if (action.type === 'cargo' || action.type === 'shield') {
    const index=action.card;
    if (!Number.isInteger(index) || index < 0 || index >= next.hand.length) return s;
    if (action.type === 'cargo' && (target.sealed || target.cargo.length >= 3)) return s;
    if (action.type === 'shield' && (!target.cargo.length || target.shield != null || target.storms >= 6)) return s;
    const [card] = next.hand.splice(index, 1);
    if (action.type === 'cargo') target.cargo.push(card); else target.shield=card;
    [next.deck, next.hand] = refill(next.deck,next.hand);
    next = log(next, `${label}: loaded ${card} as ${action.type}.`);
  } else if (action.type === 'bank') {
    if (!target.cargo.length) return s;
    const gain=shipValue(target); next.score+=gain;next.ships[action.ship]=emptyShip();
    next=log(next, `${label}: banked ${gain.toLocaleString()} points.`);
  } else if (action.type === 'storm') {
    if (target.cargo.length < 2 || target.shield == null || !next.weather.length || target.storms >= 6) return s;
    const [rest,weather] = take(next.weather);next.weather=rest;
    next.seenWeather=[...s.seenWeather,weather];target.sealed=true;
    if (weather + target.storms <= target.shield) {
      target.storms++;target.shield=null;next.success++;
      next=log(next, `${label}: storm ${weather} survived! Payout is now ×${3**target.storms}.`);
    } else {
      const lost=shipValue(target);next.ships[action.ship]=emptyShip();next.burns++;
      next=log(next, `${label}: storm ${weather} breached the shield. Lost ${lost.toLocaleString()} points.`);
    }
  } else return s;
  if (!next.hand.length && !next.deck.length && next.ships.every(x => !x.cargo.length))
    next=log(next, `Voyage complete! Final score: ${next.score.toLocaleString()}.`);
  return next;
}
export const targets = [7,9,11];
export function initShort(random = Math.random, override = {}) {
  const [deck, hand] = refill(shuffled(numbers(),random),[]);
  return {deck,hand,lanes:[[],[],[]],score:0,pot:0,streak:0,deadline:null,pendingChoice:false,completed:0,failed:0,message:'Select a card and place it on a contract.',history:[],...override};
}
export const laneSum = lane => lane.reduce((n,v)=>n+v,0);
export function shortStep(s, action) {
  let next = {...s, deck:[...s.deck],hand:[...s.hand],lanes:s.lanes.map(a=>[...a])};
  if (s.pendingChoice) {
    if (action.type === 'bank') {
      next.score+=next.pot;const gain=next.pot;next.pot=0;next.streak=0;next.pendingChoice=false;next.deadline=null;
      return log(next, `Banked ${gain} points. The contracts stay as they are.`);
    }
    if (action.type === 'carry') {
      next.pendingChoice=false;next.deadline=2;
      return log(next,'Carry accepted. Complete a contract within two placements.');
    }
    return s;
  }
  if (action.type==='place') {
    const { card, lane }=action;
    if (!Number.isInteger(card) || card<0 || card>=s.hand.length || !Number.isInteger(lane) || lane<0 || lane>2) return s;
    const value=next.hand[card];
    if (laneSum(next.lanes[lane]) + value > targets[lane]) return s;
    next.hand.splice(card,1);next.lanes[lane].push(value);
    if (next.deadline !== null) next.deadline--;
    if (laneSum(next.lanes[lane])===targets[lane]) {
      const gain=targets[lane]*2**next.streak;
      next.pot+=gain;next.completed++;next.streak++;
      next.lanes[lane]=[];next.deadline=null;
      if (next.streak===3) {
        const paid=next.pot;next.score+=paid;next.pot=0;next.streak=0;next.pendingChoice=false;
        next=log(next, `Contract ${targets[lane]} completed (+${gain}). Triple chain! Auto-banked ${paid}.`);
      } else {
        next.pendingChoice=true;
        next=log(next, `Contract ${targets[lane]} completed (+${gain}). Bank or Carry?`);
      }
    } else if (next.deadline===0) {
      const lost=next.pot;next.pot=0;next.streak=0;next.deadline=null;next.failed++;
      next=log(next, `Fuse expired. Lost ${lost} unbanked points.`);
    } else next=log(next, `Placed ${value} in contract ${targets[lane]}.`);
    // The player must decide Bank/Carry BEFORE seeing the replacement card.
    if (!next.pendingChoice) [next.deck,next.hand]=refill(next.deck,next.hand);
    return shortEnd(next);
  }
  if (action.type==='scrap') {
    const {card,lane}=action;
    if(!Number.isInteger(card)||card<0||card>=s.hand.length||!Number.isInteger(lane)||lane<0||lane>2)return s;
    const [value]=next.hand.splice(card,1);
    const lost=next.pot;
    if(lost) next.failed++;
    next.pot=0;next.streak=0;next.deadline=null;next.lanes[lane]=[];
    [next.deck,next.hand]=refill(next.deck,next.hand);
    next=log(next, `Scrapped ${value} and cleared contract ${targets[lane]}.${lost?` Lost ${lost} points.`:''}`);
    return shortEnd(next);
  }
  return s;
}
export function shortEnd(s) {
  if(s.pendingChoice) return s;
  if (s.deck.length || s.hand.length) return s;
  if (s.pot) {
    const next={...s,pot:0,streak:0,deadline:null,failed:s.failed+1};
    return log(next,`Run ended. ${s.pot} unbanked points were lost. Final score: ${s.score}.`);
  }
  return log(s,`Run complete! Final score: ${s.score}.`);
}
export function shortAfterChoice(s,action) {
  const choice=shortStep(s,action);
  if (choice===s) return s;
  let next={...choice};
  [next.deck,next.hand]=refill(next.deck,next.hand);
  return shortEnd(next);
}
