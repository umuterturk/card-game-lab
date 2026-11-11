# Bee Hop — Honeycomb Puzzle Design (40-level prototype)

Playable page: `bee-hop.html` (GitHub Pages: `https://umuterturk.github.io/card-game-lab/bee-hop.html`). This remains isolated from Overswing, Swing Casual and the Card Game Lab catalog.

## Gameplay

One bee explores an odd-row-offset rectangular honeycomb. Its movement is computed in **six axial directions**. Every move crosses exactly one pollen flower. The bee may pass over empty cells before the first pollen and may land on **any empty cell after** that pollen, until the next pollen or board edge. A capture removes one pollen. Collect all pollen to win; getting stuck means undoing or restarting.

Legal landing positions are visible and clickable **without Hint**. Tapping a pollen filters the landings to that capture, and tapping the bee resets the filter. Undo, Restart and a one-move solver Hint are available. A zoom control on larger boards helps mobile tapping.

## Design: 40 levels, 8 waves of 5

- **Levels 1–5**: linear onboarding. Level 1 starts at 3×3. The remaining tutorial levels are 4×4: a 3×3 hex grid has too few distinct solvable multi-capture challenges to teach five distinct difficulty steps.
- **Levels 6–10**: Wave 1, 5×5.
- **Levels 11–15**: Wave 2, 6×5.
- **Levels 16–20**: Wave 3, 7×6.
- **Levels 21–25**: Wave 4, 8×7.
- **Levels 26–30**: Wave 5, 9×7.
- **Levels 31–35**: Wave 6, 10×8.
- **Levels 36–40**: Wave 7, 11×9.

After onboarding, board size remains **constant throughout each five-level wave**. A wave boss appears at levels **10, 15, 20, 25, 30, 35, and 40**. The exact difficulty index increases within each wave, peaks at its boss, then decreases at the beginning of the next larger-board wave, while the wave baseline trends upward.

All 40 puzzles are fixed, reproducible, and solver-certified. Their coordinates and exact analyses are stored in `src/bee-hop/levels.generated.js`. The engine does **not** generate hundreds of candidates on every page load.

## Generator

Files:

- `src/bee-hop/rules.js`: immutable movement, captures and solvability solver.
- `src/bee-hop/puzzleEvaluator.js`: exhaustive dynamic-programming decision DAG.
- `src/bee-hop/generator.js`: seeded backward construction and candidate scoring.
- `src/bee-hop/levelSpecs.js`: 40 level design targets and wave definitions.
- `src/bee-hop/levels.generated.js`: committed static results.
- `scripts/generate-bee-hop-levels.mjs`: offline reproducible generation script.

Every proposed puzzle is built **backward from a successful capture sequence**. The exact evaluator then traverses the forward state DAG and counts routes. A final independent solver verifies the winning path. Generation never accepts truncated metrics or an unverified puzzle.

## Exact difficulty analysis

A state is `{bee position, set of remaining pollen}`. Capturing one pollen on every move makes the state graph acyclic. Subproblems are memoized, and `BigInt` counts sequences exactly.

- **Legal landings:** All landing cells permitted by the six-direction rules.
- **Immediate continuations:** Legal landings that reach the winning state or leave at least one next legal move. A final winning move is therefore *not* incorrectly excluded.
- **Winning routes:** Distinct complete sequences of captured pollen and landing cells that clear the board. This is an exact count of winning paths, not merely unique final states.
- **Real paths:** Distinct continuation trajectories after pruning immediate dead-end moves; a state where no moves can continue contributes one endpoint. This includes extended traps that only become obvious after further moves.
- **Total paths:** All distinct terminal sequences, including immediately fatal moves.
- **Forks:** Reachable states containing at least two immediate continuations.
- **Traps:** Continuation moves that ultimately cannot win, plus the depth reached along failed routes.

The **difficulty index** weighs pollen count, the ratio of real paths to winning routes, decision forks, and trap depth. This is a deterministic level-design proxy—not a measured human first-try success rate. Onboarding and waves are selected to rise monotonically on this index within each group, with easier starts after bosses.

## Tests and validation

`node --test tests/bee-hop.test.mjs` checks all 40 levels: solvability, exact metric parity, distinct pollen, progressive difficulty, wave boundaries and bosses, direct landing without Hint, and a handcrafted six-landings/two-continuations example. The exact evaluator is also cross-checked against an independent brute-force sequence enumerator.

The full repository runs `npm test`, `npm run build`, and release checks on GitHub Actions before publishing.

## Future tuning

These exact graph metrics ensure mathematical properties, but a puzzle with fewer winning paths is not necessarily harder for human players. Collect human playtest telemetry: success without hints, retries, move reversals, time to first meaningful action, hint requests and drop-offs. Then recalibrate the score, and consider semantic equivalence of different landing routes (same pollen capture order) as an additional optional metric. Avoid adding power-ups before the basic route-planning loop proves engaging.
