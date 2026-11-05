// One shape and one intensity scale for both dealt and revealed cards.
// Direction is based on the signed engine value, never on card suit or ID.
export const CARD_ARROW_PATH='M8 20 H47 V7 L73 29 L47 51 V38 H8 Z';
export const cardDirection=value=>value<0?'left':'right';

// Higher absolute ranks get a stronger blue/green tint and edge.
// Cap safely for future cards beyond the initial Level 1 range.
export function cardAccentMix(value){
  const rank=Number.isFinite(value)?Math.min(10,Math.max(1,Math.abs(value))):1;
  return Math.round(18+(rank-1)/9*62)+'%';
}
