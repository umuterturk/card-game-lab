/** Pure rules, exact solver and seeded reverse-play generator for Bee Hop.
 * The board is an odd-row-offset rectangle of pointy-top hexagonal cells.
 * We convert indexed (row, column) positions into axial coordinates for
 * movement; this avoids parity-specific directional mistakes.
 */
export const DIRECTIONS = Object.freeze([
  [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]
]); // [axial delta q, axial delta r]

export const LEVEL_SPECS = Object.freeze([
  {id: 1, name: 'First Flight', width: 3, height: 3, pollen: 2, seed: 101},
  {id: 2, name: 'Sunny Meadow', width: 5, height: 5, pollen: 4, seed: 202},
  {id: 3, name: 'Crosswinds', width: 7, height: 6, pollen: 6, seed: 303},
  {id: 4, name: 'Clover Maze', width: 9, height: 7, pollen: 9, seed: 404},
  {id: 5, name: 'Golden Orchard', width: 11, height: 9, pollen: 12, seed: 505}
]);

const rowOf = (cell, width) => Math.floor(cell / width);
const colOf = (cell, width) => cell % width;

/** Every direction is a constant offset in axial (q,r) coordinates. */
export function stepHex(cell, [dq, dr], width, height) {
  if (cell < 0 || cell >= width * height) return -1;
  const r = rowOf(cell, width), q = colOf(cell, width) - Math.floor(r / 2);
  const nextR = r + dr, nextCol = q + dq + Math.floor(nextR / 2);
  return nextR >= 0 && nextR < height && nextCol >= 0 && nextCol < width
    ? nextR * width + nextCol : -1;
}

/** A legal jump crosses the first pollen on one of six axial rays.
 * It may approach through empty hexes and land on ANY empty hex beyond
 * the pollen, stopping before a second pollen or the board boundary. */
export function legalMoves(state) {
  const {width, height, bee, pollen} = state;
  const occupied = new Set(pollen);
  const moves = [];
  for (const direction of DIRECTIONS) {
    let cell = stepHex(bee, direction, width, height);
    while (cell !== -1 && !occupied.has(cell)) cell = stepHex(cell, direction, width, height);
    if (cell === -1) continue;
    const over = cell;
    cell = stepHex(cell, direction, width, height);
    while (cell !== -1 && !occupied.has(cell)) {
      moves.push({from: bee, over, to: cell});
      cell = stepHex(cell, direction, width, height);
    }
  }
  return moves;
}

/** Keep every legal landing visible by default. A selected pollen optionally
 * narrows the highlights; hints are never required to make a move. */
export function selectableMoves(moves, selectedPollen = null) {
  return selectedPollen === null ? moves : moves.filter(move => move.over === selectedPollen);
}

export function playMove(state, move) {
  const legal = legalMoves(state).find(m => m.to === move?.to && m.over === move?.over && m.from === move?.from);
  if (!legal) return state;
  return {...state, bee: legal.to, pollen: state.pollen.filter(p => p !== legal.over)};
}

export function statusOf(state) {
  if (!state.pollen.length) return 'won';
  return legalMoves(state).length ? 'playing' : 'stuck';
}

/** Exact DFS of the reachable game states, memoized by bee + pollen positions. */
export function solvePuzzle(state, {maxStates = 300000} = {}) {
  let visited = 0, truncated = false;
  const dead = new Set();
  const go = current => {
    if (!current.pollen.length) return [];
    const key = current.bee + ':' + [...current.pollen].sort((a, b) => a - b).join(',');
    if (dead.has(key)) return null;
    if (visited++ >= maxStates) {truncated = true; return null;}
    for (const move of legalMoves(current)) {
      const solution = go(playMove(current, move));
      if (solution) return [move, ...solution];
    }
    if (!truncated) dead.add(key);
    return null;
  };
  const moves = go(state);
  return {solvable: !!moves, moves, visited, truncated};
}

function randomGenerator(seed) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6D2B79F5) >>> 0;
    let t = x;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Generate a constructive witness BACKWARDS. At each step choose a
 * predecessor and add exactly one pollen along a previously empty hex ray.
 * Reverse the resulting moves to obtain a valid pollen-clearing solution. */
function reverseBuild(spec, rng) {
  const {width, height} = spec;
  let bee = Math.floor(rng() * width * height);
  const pollen = [], witness = [];
  for (let step = 0; step < spec.pollen; step++) {
    const occupied = new Set(pollen), candidates = [];
    for (const direction of DIRECTIONS) {
      let at = bee;
      const intermediate = [];
      while (true) {
        at = stepHex(at, direction, width, height);
        if (at === -1 || occupied.has(at)) break;
        for (const over of intermediate) candidates.push({source: at, over, dest: bee});
        intermediate.push(at);
      }
    }
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    pollen.push(pick.over);
    bee = pick.source;
    witness.unshift({from: pick.source, over: pick.over, to: pick.dest});
  }
  return {width, height, bee, pollen: pollen.sort((a, b) => a - b), witness};
}

export function verifyPath(state, moves) {
  if (!Array.isArray(moves)) return false;
  let current = state;
  for (const move of moves) {
    const next = playMove(current, move);
    if (next === current) return false;
    current = next;
  }
  return statusOf(current) === 'won';
}

export function estimateRandomSuccess(state, trials, seed = 1234) {
  const rng = randomGenerator(seed);
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    let current = state;
    while (statusOf(current) === 'playing') {
      const moves = legalMoves(current);
      current = playMove(current, moves[Math.floor(rng() * moves.length)]);
    }
    if (statusOf(current) === 'won') wins++;
  }
  return wins / trials;
}

/** Deterministic candidate search: select puzzles with meaningful choices
 * and increasingly small random-play success rates. A verified witness and
 * independently found exact solution guarantee solvability. */
export function generatePuzzle(spec, {candidates = 120, randomTrials = 80} = {}) {
  const rng = randomGenerator(spec.seed);
  let chosen = null, bestRank = -Infinity;
  const target = [0.9, 0.5, 0.23, 0.07, 0.015][spec.id - 1] ?? 0.05;
  for (let attempt = 0; attempt < candidates; attempt++) {
    const candidate = reverseBuild(spec, rng);
    if (!candidate || !verifyPath(candidate, candidate.witness)) continue;
    const opening = legalMoves(candidate).length;
    if (spec.pollen >= 4 && opening < 2) continue;
    const winRate = estimateRandomSuccess(candidate, randomTrials, spec.seed + 1999);
    const rank = -Math.abs(winRate - target) * 10 + Math.min(4, opening) * 0.17;
    if (rank > bestRank) {
      chosen = {...candidate, id: spec.id, name: spec.name,
        randomWinRate: winRate, openingChoices: opening};
      bestRank = rank;
    }
  }
  if (!chosen) throw Error('No candidate puzzle for level ' + spec.id);
  const verified = solvePuzzle(chosen, {maxStates: 500000});
  if (!verified.solvable || verified.truncated) throw Error('Generator failed validation at level ' + spec.id);
  return {...chosen, solution: verified.moves};
}

export const LEVELS = Object.freeze(LEVEL_SPECS.map(spec => Object.freeze(generatePuzzle(spec))));
