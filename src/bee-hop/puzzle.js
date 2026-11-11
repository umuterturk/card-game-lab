/** Pure rules, solver and deterministic reverse-play generator for Bee Hop. */
export const DIRECTIONS = Object.freeze([[0, 1], [1, 0], [0, -1], [-1, 0]]);

export const LEVEL_SPECS = Object.freeze([
  {id: 1, name: 'First Flight', width: 3, height: 3, pollen: 2, seed: 101},
  {id: 2, name: 'Sunny Meadow', width: 5, height: 5, pollen: 4, seed: 202},
  {id: 3, name: 'Crosswinds', width: 7, height: 6, pollen: 6, seed: 303},
  {id: 4, name: 'Clover Maze', width: 9, height: 7, pollen: 9, seed: 404},
  {id: 5, name: 'Golden Orchard', width: 11, height: 9, pollen: 12, seed: 505}
]);

const index = (row, column, width) => row * width + column;
const rowOf = (cell, width) => Math.floor(cell / width);
const columnOf = (cell, width) => cell % width;
const inBounds = (r, c, w, h) => r >= 0 && r < h && c >= 0 && c < w;

/** A legal jump goes in a straight cardinal direction over exactly one pollen.
 * It can travel through empty squares before and after it; all landing squares
 * beyond that pollen, up to the next pollen or board edge, are valid. */
export function legalMoves(state) {
  const {width, height, bee, pollen} = state;
  const occupied = new Set(pollen);
  const moves = [];
  for (const [dr, dc] of DIRECTIONS) {
    let r = rowOf(bee, width) + dr, c = columnOf(bee, width) + dc;
    while (inBounds(r, c, width, height) && !occupied.has(index(r, c, width))) {
      r += dr; c += dc;
    }
    if (!inBounds(r, c, width, height)) continue;
    const captured = index(r, c, width);
    r += dr; c += dc;
    while (inBounds(r, c, width, height) && !occupied.has(index(r, c, width))) {
      moves.push({from: bee, over: captured, to: index(r, c, width)});
      r += dr; c += dc;
    }
  }
  return moves;
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

/** Exhaustive depth-first solver, memoized by the positions that actually
 * affect future moves. Solved paths contain fully legal actions. */
export function solvePuzzle(state, {maxStates = 250000} = {}) {
  let visited = 0, truncated = false;
  const dead = new Set();
  const go = (current) => {
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

/** Build a guaranteed winning path BACKWARDS: place a single pollen between
 * a preceding bee square and the next square. We avoid every already-placed
 * pollen along this segment. Reversing the construction creates a legal
 * sequence that captures exactly one pollen per move. */
function reverseBuild(spec, rng) {
  const {width, height} = spec;
  let bee = Math.floor(rng() * width * height);
  const pollen = [];
  const witness = [];
  for (let step = 0; step < spec.pollen; step++) {
    const occupied = new Set(pollen);
    const candidates = [];
    const tr = rowOf(bee, width), tc = columnOf(bee, width);
    for (const [dr, dc] of DIRECTIONS) {
      for (let length = 2; length < Math.max(width, height); length++) {
        const sr = tr + dr * length, sc = tc + dc * length;
        if (!inBounds(sr, sc, width, height)) break;
        const source = index(sr, sc, width);
        if (occupied.has(source)) break;
        const between = [];
        for (let offset = 1; offset < length; offset++) {
          const spot = index(tr + dr * offset, tc + dc * offset, width);
          if (occupied.has(spot)) break;
          between.push(spot);
        }
        if (between.length !== length - 1) break;
        for (const over of between) candidates.push({source, over, dest: bee});
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
  let at = state;
  for (const move of moves) {
    const next = playMove(at, move);
    if (next === at) return false;
    at = next;
  }
  return statusOf(at) === 'won';
}

/** Deterministic, bounded candidate search. The generator's witness proves a
 * solution exists; the independent solver checks it. A sampled random policy
 * estimates difficulty, rather than pretending the raw branching factor is
 * difficulty. Returns a safe fallback candidate even if the preferred
 * random-success band is not available. */
export function generatePuzzle(spec, {candidates = 120, randomTrials = 80} = {}) {
  const rng = randomGenerator(spec.seed);
  let chosen = null, bestRank = -Infinity;
  for (let attempt = 0; attempt < candidates; attempt++) {
    const candidate = reverseBuild(spec, rng);
    if (!candidate || !verifyPath(candidate, candidate.witness)) continue;
    const opening = legalMoves(candidate).length;
    if (spec.pollen >= 4 && opening < 2) continue;
    const winRate = estimateRandomSuccess(candidate, randomTrials, spec.seed + 1999);
    // More complex levels prefer a low blind-win rate; openings with at least
    // two choices are rewarded, avoiding completely forced initial puzzles.
    const target = [1, .55, .24, .08, .015][spec.id - 1] ?? .05;
    const rank = -Math.abs(winRate - target) * 10 + Math.min(4, opening) * .17;
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

export const LEVELS = Object.freeze(LEVEL_SPECS.map(spec => Object.freeze(generatePuzzle(spec))));
