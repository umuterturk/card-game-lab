# Bee Hop — Honeycomb Trail (six-direction prototype)

Standalone mobile-first puzzle in Card Game Lab: `bee-hop.html`.
No shared game code or production flows for Overswing or Swing Casual are modified.

## Gameplay

- **One bee** on a staggered, pointy-top honeycomb grid of `width × height` hexagonal cells.
- Movement uses six directions along the three hexagonal axes (axial coordinates); there are **no square/cardinal movements**.
- The bee may travel through any number of empty hexes *before* a pollen flower.
- Every move must jump **exactly one pollen**; a second pollen blocks the continuation of that jump.
- The player chooses **any unoccupied hex beyond that pollen** on the same straight ray, up to the next pollen or board edge. They are not forced to land immediately behind it.
- The crossed pollen disappears. The level is won only after collecting *all* pollen. If no capture is possible, the player must undo or restart.
- Touch interaction: tap a glowing pollen target, then tap a green landing hex. The solver hint highlights a flower and a winning landing. Undo and restart are available.
- No magic cards, money, lives, scores or random movement: this iteration isolates the six-direction landing puzzle.

## Correct hexagon coordinates

Use **odd-r offset** coordinates to draw a rectangular honeycomb with odd rows shifted half a hex right; all gameplay movement uses **axial** coordinates to avoid parity errors:

- Indexed position: `row = floor(cell / width)`, `column = cell % width`.
- Convert to axial: `q = column - floor(row / 2)`, `r = row`.
- Directions `(dq, dr)` are `(1,0), (0,1), (-1,1), (-1,0), (0,-1), (1,-1)`.
- Convert back: `column = q + floor(r / 2)`. Out-of-range columns or rows terminate the ray.

The UI draws matching pointy-top hexagons with centers offset by half a column on odd rows, vertically spaced by 75% of hex height.

## Solvable generation and difficulty

`src/bee-hop/puzzle.js` is a pure module exporting `stepHex`, `legalMoves`, `playMove`, `statusOf`, `solvePuzzle`, `generatePuzzle`, `verifyPath`, and the five generated levels.

The generator **reverse-builds a winning path** from a final bee position. For each backward jump it adds one previously absent pollen along an empty axial segment and moves the bee to a new predecessor. The reversed sequence is a constructive solvability witness. An independent memoized DFS forward solver checks each chosen puzzle before it can be used.

For difficulty, the candidate sampler (120 deterministic attempts per level) selects among valid layouts using an estimated random-policy success rate and available opening choices. Difficulty is designed to rise across the five levels, but this is a **heuristic, not human playtesting**. A separate seeded evaluation of 25,000 random plays per level yields:

| Level | Dimensions | Pollen | Seed | Random-play wins |
| --- | --- | ---: | ---: | ---: |
| 1: First Flight | 3×3 | 2 | 101 | 100.0% |
| 2: Sunny Meadow | 5×5 | 4 | 202 | 44.0% |
| 3: Crosswinds | 7×6 | 6 | 303 | 12.7% |
| 4: Clover Maze | 9×7 | 9 | 404 | 2.2% |
| 5: Golden Orchard | 11×9 | 12 | 505 | 0.3% |

The statistics are reproducible, not predictive of real human success. A human who understands the puzzle should fare better than a random actor.

## Verification

`node --test tests/bee-hop.test.mjs` checks: six-direction movement and reversibility, hex axis jumping, selectable landing distances, blocked jumps, all five fixed sizes and increasing pollen counts, deterministic regeneration, witness paths, and independently solved winning routes.

To modify difficulty, change a `seed` or `pollen` in `LEVEL_SPECS`; rerun tests. The level is only published when the independent solver validates it.

## Open UX issue

A complete 11-column board on a narrow phone makes individual hex tap targets small. Two-step target/landing selection helps avoid unintended captures; future work should evaluate a board zoom or a large-hit-area interaction if playtesting finds the last level difficult to tap.
