import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS, LEVEL_SPECS, generatePuzzle, legalMoves, playMove, solvePuzzle, statusOf, verifyPath} from '../src/bee-hop/puzzle.js';

test('pollen capture requires one pollen and offers alternative landings', () => {
  const s = {width: 6, height: 1, bee: 0, pollen: [2]};
  assert.deepEqual(legalMoves(s), [
    {from: 0, over: 2, to: 3},
    {from: 0, over: 2, to: 4},
    {from: 0, over: 2, to: 5}
  ]);
  const next = playMove(s, {from: 0, over: 2, to: 4});
  assert.equal(next.bee, 4);
  assert.deepEqual(next.pollen, []);
  assert.equal(statusOf(next), 'won');
  assert.equal(playMove(s, {from: 0, over: 2, to: 1}), s);
});

test('a second pollen blocks landing past the first', () => {
  const s = {width: 7, height: 1, bee: 0, pollen: [2, 4]};
  assert.deepEqual(legalMoves(s), [{from: 0, over: 2, to: 3}]);
});

test('all five levels are deterministic, increasing and independently solvable', () => {
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
    if (i) assert.ok(level.width > LEVELS[i-1].width && level.height > LEVELS[i-1].height);
  });
});

test('undo can restore a prior state and stuck boards have no moves', () => {
  const s = {width: 3, height: 3, bee: 0, pollen: [8]};
  assert.equal(statusOf(s), 'stuck');
  assert.deepEqual(legalMoves(s), []);
  const level = LEVELS[0];
  const first = legalMoves(level)[0];
  const after = playMove(level, first);
  assert.notEqual(after, level);
  assert.equal(level.pollen.length, after.pollen.length + 1);
});
