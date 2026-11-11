# Bee Hop — The Pollen Trail (prototype)

Independent, mobile-first experiment inside Card Game Lab at `/bee-hop.html`. The existing catalog, Overswing and Swing Casual entries are unchanged.

## Mechanics

- Exactly one bee and sparse pollen on a rectangular grid.
- The bee may move horizontally or vertically, never diagonally.
- Every move must cross **exactly one** pollen; the bee can approach it through any number of empty cells.
- After crossing it, the player chooses **any empty landing cell** farther along the same line, stopping before another pollen or the edge. Landing immediately beyond is not mandatory.
- Crossed pollen is removed. Collect **all** pollen to win. If no jump is legal while pollen remains, the board is stuck.
- Undo, restart, and one-move solver hints are available. No scores, magic, or lives in this mechanics-first prototype.

## Solver and generator

`src/bee-hop/puzzle.js` is dependency-free and exports legalMoves, playMove, statusOf, solvePuzzle, generatePuzzle, verifyPath, and five deterministic levels. The **reverse construction** starts with the final bee position and repeatedly picks a predecessor position, placing one pollen between predecessor and current destination with no existing pollen along the segment. Reverse that sequence to obtain a legal all-pollen capture path. The generator independently validates the witness and checks the puzzle with a memoized exact DFS solver, rejecting candidates that cannot be verified.

Generator samples deterministic candidates using a fixed seed per level and chooses a layout with a target random-policy success rate. The reported random win rate is a rough difficulty proxy, **not** a measured human success rate or proof of optimal level design.

| Level | Board | Pollen | Seed |
|---|---|---:|---:|
| 1: First Flight | 3×3 | 2 | 101 |
| 2: Sunny Meadow | 5×5 | 4 | 202 |
| 3: Crosswinds | 7×6 | 6 | 303 |
| 4: Clover Maze | 9×7 | 9 | 404 |
| 5: Golden Orchard | 11×9 | 12 | 505 |

`node --test tests/bee-hop.test.mjs` validates jump rules, blocked paths, determinism, dimensions, independent solver wins, and successful capture paths. To regenerate a level, edit its seed or parameters in `LEVEL_SPECS`; no handcrafted winning path is needed.

## Future experiments

- Level quality: measure forced choices, distinct winning solutions, shortest successful route, meaningful landing alternatives, and first-try success.
- Large-grid mobile ergonomics: the 11-wide board has small touch targets; investigate zoom/panning or row expansion.
- Add magic cards only once the basic jumping loop demonstrates sufficient strategic variety.
