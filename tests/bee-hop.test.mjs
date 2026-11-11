import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTIONS, LEVELS, LEVEL_SPECS, generatePuzzle, legalMoves, playMove,
  selectableMoves, solvePuzzle, statusOf, stepHex, verifyPath, estimateRandomSuccess} from '../src/bee-hop/puzzle.js';

test('six axial directions connect six neighboring honeycomb cells', () => {
  assert.equal(DIRECTIONS.length, 6);
  const width = 5, height = 5, at = 2 * width + 2;
  const neighbors = DIRECTIONS.map(d => stepHex(at, d, width, height));
  assert.equal(new Set(neighbors).size, 6);
  assert.deepEqual(neighbors.sort((a, b) => a - b), [6, 7, 11, 13, 16, 17]);
  for (const d of DIRECTIONS) {
    const next = stepHex(at, d, width, height);
    assert.equal(stepHex(next, [-d[0], -d[1]], width, height), at);
  }
  assert.equal(stepHex(0, [-1, 0], width, height), -1);
  assert.equal(stepHex(0, [0, -1], width, height), -1);
});

test('hex jump captures the first pollen and offers multiple landings', () => {
  const s = {width: 6, height: 3, bee: 6, pollen: [8]};
  assert.deepEqual(legalMoves(s), [
    {from: 6, over: 8, to: 9},
    {from: 6, over: 8, to: 10},
    {from: 6, over: 8, to: 11}
  ]);
  const next = playMove(s, {from: 6, over: 8, to: 10});
  assert.equal(next.bee, 10);
  assert.deepEqual(next.pollen, []);
  assert.equal(statusOf(next), 'won');
  assert.equal(playMove(s, {from: 6, over: 8, to: 7}), s);
});

test('both diagonal axes allow a capture, but the second pollen blocks further landing', () => {
  const w = 7, h = 7, from = 3*w+3;
  for (const d of DIRECTIONS) {
    const over = stepHex(stepHex(from, d, w, h), d, w, h);
    const to = stepHex(over, d, w, h);
    assert.notEqual(to, -1);
    const moves = legalMoves({width:w, height:h, bee:from, pollen:[over]});
    assert.ok(moves.some(m => m.over === over && m.to === to), `No jump on ${d}`);
  }
  const s = {width:7, height:3, bee:7, pollen:[9,11]};
  assert.deepEqual(legalMoves(s), [{from:7, over:9, to:10}]);
});

test('five seeded hex boards grow and each has an independently verified winning path', () => {
  const shapes = [[3,3],[5,5],[7,6],[9,7],[11,9]];
  LEVELS.forEach((level, i) => {
    assert.deepEqual([level.width, level.height], shapes[i]);
    assert.equal(level.pollen.length, LEVEL_SPECS[i].pollen);
    assert.ok(!level.pollen.includes(level.bee));
    assert.equal(new Set(level.pollen).size, level.pollen.length);
    assert.ok(verifyPath(level, level.witness));
    const solved = solvePuzzle(level);
    assert.equal(solved.solvable, true, `L${i+1} solver could not win`);
    assert.equal(solved.truncated, false);
    assert.equal(solved.moves.length, level.pollen.length);
    assert.ok(verifyPath(level, solved.moves));
    assert.deepEqual(generatePuzzle(LEVEL_SPECS[i]), level);
    if (i) {
      assert.ok(level.width > LEVELS[i-1].width);
      assert.ok(level.height > LEVELS[i-1].height);
      assert.ok(level.pollen.length > LEVELS[i-1].pollen.length);
    }
  });
});

test('stuck honeycomb positions have no legal moves; undo can restore state', () => {
  const s = {width:3, height:3, bee:0, pollen:[8]};
  assert.equal(statusOf(s), 'stuck');
  assert.deepEqual(legalMoves(s), []);
  const first = legalMoves(LEVELS[0])[0];
  const next = playMove(LEVELS[0], first);
  assert.notEqual(next, LEVELS[0]);
  assert.equal(LEVELS[0].pollen.length, next.pollen.length+1);
});


test('seeded random-policy success decreases from tutorial through expert', () => {
  const winRates = LEVELS.map(level => estimateRandomSuccess(level, 2000, 9000 + level.id));
  for (let i = 1; i < winRates.length; i++) {
    assert.ok(winRates[i] < winRates[i - 1], `Level ${i+1} was not harder than ${i} by the proxy`);
  }
});

test('landings are available immediately without selecting pollen or requesting a hint', () => {
  for (const level of LEVELS) {
    const moves = legalMoves(level);
    assert.ok(moves.length, 'Each level must offer a playable opening');
    assert.deepEqual(selectableMoves(moves), moves, 'All legal landing hexes must be shown by default');
    const directMove = selectableMoves(moves)[0];
    const after = playMove(level, directMove);
    assert.equal(after.pollen.length, level.pollen.length - 1, 'Tap-to-land must capture pollen without a hint');
    const focused = selectableMoves(moves, directMove.over);
    assert.ok(focused.length > 0);
    assert.ok(focused.every(move => move.over === directMove.over));
    assert.deepEqual(selectableMoves(moves, -1), []);
    assert.deepEqual(selectableMoves(moves, null), moves, 'Tap the bee to restore all landing choices');
  }
});
