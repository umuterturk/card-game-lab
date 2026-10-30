# Bondstone: React implementation spec (CGL-20261030-03)

**Rules source (final):** `/workspace/cardlab/experiments/CGL-20261030-03/design-v1.md`, sections B–D (approved; text-only edits).
**Authoritative engine:** `/workspace/cardlab/experiments/CGL-20261030-03/sim.py`: `judge()` and `class Game` (lines 15–69).
**Report:** `/workspace/cardlab/experiments/CGL-20261030-03/report.md` (PASS to paper prototype).
**Fixtures:** re-verified on the box on 2026-10-30 by running `sim.Game(27)`.

---

## 1. Overview and goal

Bondstone is a solitaire placement game played in exactly **40 turns**. Each turn you get a face-up **Stone** (with the next two cards shown as **Previews**). You either **Set** it into an empty cell of a 3×3 **Wall**, or **Mortar** it away (3 uses per game).

When a Set fills a row or column, that line is judged:
- three of a suit, or three consecutive ranks, is a **Bond** and scores sum × **Rise**;
- anything else is a **Fault**, which **Cracks** the Rise back to 1.

Every judged line is cleared.

**Goal:** the highest score after 40 turns. Design targets (D9): **Win ≥ 700**, **Masterful ≥ 1000**, **"Rubble" < 300**. See §12: the report proposes lower targets.

## 2. Components (exact)

- **Deck:** 40 cards, A(=1)–10 in ♠ ♥ ♦ ♣.
  - Code id: `id = suit*10 + rank − 1`, with suit order **♠=0, ♥=1, ♦=2, ♣=3**.
  - Note that this suit order differs from the other lab games.
- **Wall:** 9 cells, numbered 0–8 row-major:
  ```
  0 1 2
  3 4 5
  6 7 8
  ```
- **Lines** (6 of them; no diagonals): rows `(0,1,2) (3,4,5) (6,7,8)` and columns `(0,3,6) (1,4,7) (2,5,8)`. Each cell lies in exactly one row and one column.
- **Rise:** an integer from 1 to 6. It starts at 1.
- **Mortar:** 3 tokens, never replenished.
- **Rubble:** a face-up discard pile.
- **Score.**

## 3. Setup

1. Shuffle the 40 cards into `deck[0..39]`.
2. Wall all empty, Rise = 1, Mortar = 3, Score = 0, t = 0, rubble = [].
3. The visible cards are `deck[t]` (the Stone), `deck[t+1]` (Preview 1) and `deck[t+2]` (Preview 2).

## 4. Turn state machine (t = 0..39)

```
SHOW (Stone + up to 2 Previews) ─► CHOOSE (Set cell | Mortar) ─► JUDGE ─► SCORE ─► RISE ─► CLEAR ─► t+=1 ─► (t==40 ? GAME_OVER : SHOW)
```

### 4.1 Legal actions (`Game.legal()`)

- **Set(cell)** for every empty cell. There are always at least 3 empty cells (D6).
- **Mortar** if `mortar > 0`. It is illegal at 0 tokens.

### 4.2 Resolve (`Game.outcome` + `apply`)

**Mortar:**
- `mortar -= 1`; the Stone goes to the rubble;
- nothing else changes (Rise, wall and score unchanged).

**Set(a):**
1. Place the Stone in cell a.
2. **Judge:** for each of the (at most 2) lines through `a`, in the order row then column, check whether the line is now full. Judge only full lines, with `judge(cards)`:
   - `suitSame` = all 3 cards share a suit;
   - `run` = the sorted ranks are r, r+1, r+2 (Ace = 1 only, **no wrap**, so 9-10-A is not a run; A-2-3 is);
   - suitSame && run → **pure**, value = **2 × sum of ranks**;
   - suitSame only → **suit**, value = sum;
   - run only → **run**, value = sum;
   - otherwise → **fault**, value 0.
3. **Score:** `pts = (Σ values of the Bond lines) × rise`, using the Rise **before** this turn's change.
   - A cross that is Bond + Fault **still scores the Bond**.
4. **Rise:**
   - if any judged line is a fault → `rise = 1` (a **Crack**);
   - else `rise = min(6, rise + nb)`, where nb = number of Bonds judged (1, or 2 for a cross);
   - if no line was full, Rise is unchanged.
5. **Clear:** every judged line (Bond or Fault) is removed to the rubble. In a cross, the shared cell is removed once (5 cards).
   - In the code, rubble order is by ascending cell index; this is cosmetic.
6. `t += 1`. The Previews shift; at the end they shrink 2 → 1 → 0.

### 4.3 End (D8)

After the 40th card has been Set or Mortared, the game ends. Cards left on the wall score 0, and unused Mortar scores 0. **Final score = Score.**

## 5. Scoring formulas, with worked examples

- **Run Bond:** 8♦ 9♣ 10♣ → value 27. At Rise 1 → **27**, then Rise 2 (seed 27, T6).
- **Suit Bond:** 7♠ 10♠ 9♠ → value 26. At Rise 2 → **52**, then Rise 3, score 79 (seed 27, T7).
- **Pure Bond:** 4♦ 5♦ 6♦ → 2 × 15 = 30 per Rise point.
- **Clean cross** (D8b): Rise 3, 5♥ set in the centre.
  - Row 4♣ 5♥ 6♦ is a run, value 15; column 2♥ 5♥ 9♥ is a suit, value 16.
  - (15 + 16) × 3 = **93**, then Rise 3 + 2 = **5**. 5 cards are cleared.
- **Bond + Fault cross** (D8b): the same, but the column is 2♠ 5♥ 9♥ (a Fault).
  - Score 15 × 3 = **45** first, then Crack → Rise **1**.
- **Real Bond + Fault** (seed 27, T15): 9♦ set at cell 0 at Rise 3.
  - Row 9♦ 5♣ 4♠ is a Fault; column 9♦ 5♦ 4♦ is a Suit (18).
  - +**54** → score 133, Rise 1.

## 6. Bust / fail / reset

- A **Fault** in any judged line resets Rise to 1 (a Crack). At most one Crack per turn.
- Score never decreases.
- Rise never goes below 1 or above 6.

## 7. End of game / final score

Exactly 40 turns. Final = accumulated Score. Classification: see §12.

## 8. Randomness

- The only random event is the initial shuffle.
- Python: `random.Random(seed).shuffle(d)` on `[(r,s) for s in 0..3 for r in 1..10]`. This gives the same permutation as shuffling ids 0..39. It is not reproducible in JS without an MT19937 port.
- **Recommendation:** mulberry32 + Fisher–Yates, plus `deckOverride` for fixtures.

```ts
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

**Fixture: Python seed 27 deck** (ids with suit order ♠♥♦♣, then names):
```
[39,9,6,38,31,27,8,3,23,19,34,24,10,0,28,14,1,32,13,22,37,20,2,15,25,7,5,36,29,26,11,33,21,16,35,4,12,18,17,30]
10♣ 10♠ 7♠ 9♣ 2♣ 8♦ 9♠ 4♠ 4♦ 10♥ 5♣ 5♦ A♥ A♠ 9♦ 5♥ 2♠ 3♣ 4♥ 3♦ 8♣ A♦ 3♠ 6♥ 6♦ 8♠ 6♠ 7♣ 10♦ 7♦ 2♥ 4♣ 2♦ 7♥ 6♣ 5♠ 3♥ 9♥ 8♥ A♣
```

## 9. Edge cases and tie-breaks (from the code)

- Only lines **through the placed cell** are judged.
- A line becomes full only via the placed cell, because no full line ever survives a turn.
- With 6 cards on the wall, every row and column has exactly 2, so any Set is a forced cross.
- **Invariants** (asserted after every turn):
  - at most 6 cards on the wall;
  - no full line on the wall;
  - 1 ≤ Rise ≤ 6; Mortar ≥ 0;
  - card conservation (wall + rubble + remaining deck = 40).
- **Equal ranks** (e.g. 4♥ 4♣ 4♠) are not a run; if the suits are mixed, the line is a Fault.
- **Order on the wall is irrelevant** for runs; ranks are sorted.
- **Mortar** never judges anything and never changes Rise.
- **Previews:** on the last two turns fewer Previews are shown (D7).
- There are no hidden choices other than the shuffle.

## 10. Data model and reducer (TypeScript)

```ts
type CardId = number; // 0..39, rank = id%10+1, suit = floor(id/10): 0♠ 1♥ 2♦ 3♣
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]] as const;
type LineKind = 'pure'|'suit'|'run'|'fault';
interface BondstoneState {
  deck: CardId[]; t: number;                 // stone = deck[t]
  wall: (CardId|null)[];                     // length 9
  rise: 1|2|3|4|5|6; mortar: number; score: number;
  rubble: CardId[];
  lastResult?: { cell: number|'mortar'; lines: { line: number; kind: LineKind; value: number }[]; pts: number; riseBefore: number; riseAfter: number };
  status: 'playing'|'over';
}
type BondstoneAction =
  | { type: 'NEW_GAME'; seed?: number; deckOverride?: CardId[] }
  | { type: 'SET'; cell: number }            // 0..8, must be empty
  | { type: 'MORTAR' };                      // requires mortar > 0
```

Pure helpers:
- `judge(cards) → {kind, value}`;
- `outcome(state, action)`, a preview with no mutation, useful for hover hints;
- `legal(state)`.

Reducer: validate, apply §4.2, and set `status = 'over'` when `t === 40`.

## 11. UI notes (hidden vs public)

- **Public:**
  - the Stone and the 2 Previews;
  - the wall, Rise, Mortar left and Score;
  - the rubble (inspectable at any time);
  - the deck count.
- **Unseen-card counts** are derivable and allowed (D10): "completing cards not yet seen ÷ cards not yet seen".
- **Hidden:** the deck order beyond Preview 2.
- **Suggested aids (not rules):**
  - hovering a cell previews the Bond/Fault result and points;
  - highlight "dead" 2-card lines (no completion possible);
  - show "Crack!" feedback.

## 12. Discrepancies and unspecified points

**Doc vs code (rules):** none. design-v1 D1–D8 and `sim.Game` agree. The engine's `DEFAULT_RULES = {cap: 6, mixed: 1, crossrise: 2, endbonus: 0}` reproduce the design exactly.

- **Targets: doc vs report.**
  - Design D9 says Win ≥ 700, Masterful ≥ 1000, Rubble < 300.
  - Report §7.2/§8 finds these too steep (Win 700 reached by SIMPLE 7.1%, BestFixed 19.2%, d3 70.6%). It proposes a **text-only** change: **Win ≥ 500, Masterful ≥ 800, optional "Keystone" ≥ 1000, Rubble < 200**.
  - This has not been adopted into the design text. **UNSPECIFIED — builder must decide.** *Suggestion:* make the tiers configurable; default to the design text (700/1000/<300) and offer the report's 500/800/1000/<200 as "recommended".
- **End bonus (+15 × final Rise):** exploratory only, **NOT a rule** (design §K, report §7.1). Do not implement it except behind an off-by-default experimental flag.
- **Mortar tip** (report §8): "Mortar a Stone that would only leave a dead line while your Rise is 4+". This is an optional teaching tip, not a rule.
- **UNSPECIFIED:**
  - animation/undo;
  - whether to show the outcome-preview hints;
  - rubble display order.

## 13. Acceptance tests

| # | Given | Action | Expected |
|---|---|---|---|
| B1 | `judge([4♦,5♦,6♦])` | — | pure, value 30 |
| B2 | `judge([2♥,5♥,9♥])` | — | suit, 16 |
| B3 | `judge([6♦,4♣,5♥])` | — | run, 15 (order irrelevant) |
| B4 | `judge([A♥,2♣,3♠])` | — | run, 6 |
| B5 | `judge([9♠,10♥,A♣])` | — | fault (no wrap) |
| B6 | `judge([4♥,4♣,4♠])` | — | fault |
| B7 | Rise 3; wall row 1 = 4♣ _ 6♦, column 1 = 2♥ _ 9♥; Stone 5♥ | SET 4 | pts 93, Rise 5, 5 cards cleared |
| B8 | As B7 but column 1 = 2♠ _ 9♥ | SET 4 | pts 45, Rise 1 |
| B9 | Rise 6, clean cross Bond+Bond | SET | Rise stays 6 (cap) |
| B10 | mortar 0 | MORTAR | rejected |
| B11 | Any wall | MORTAR | Rise and wall unchanged; mortar −1; Stone to rubble |
| B12 | Seed-27 fixture, new game | — | Stone 10♣, Previews 10♠ 7♠ |
| B13 | Seed-27 fixture, moves below | — | per-turn results as listed; after T15 score **133**, Rise 1, wall = A♥@4, 2♣@8, Mortar 1 |
| B14 | t = 38 | — | only 1 Preview shown; at t = 39, 0 Previews |
| B15 | After any action | — | invariants of §9 hold |

**B13 move list (seed 27)**, verified with `sim.Game(27)`:
```
T1  10♣ Set 0        T2 10♠ Set 4         T3 7♠ Set 1          T4 9♣ Set 3        T5 2♣ Set 8
T6  8♦ Set 6  → col (0,3,6) 10♣ 9♣ 8♦ RUN 27 ×1 = +27, Rise 2 (score 27)
T7  9♠ Set 7  → col (1,4,7) 7♠ 10♠ 9♠ SUIT 26 ×2 = +52, Rise 3 (score 79); wall now only 2♣@8
T8  4♠ Set 2         T9 4♦ Set 6          T10 10♥ MORTAR (2 left)
T11 5♣ Set 1         T12 5♦ Set 3         T13 A♥ Set 4         T14 A♠ MORTAR (1 left)
T15 9♦ Set 0  → row (0,1,2) 9♦ 5♣ 4♠ FAULT + col (0,3,6) 9♦ 5♦ 4♦ SUIT 18 ×3 = +54 → score 133, Crack → Rise 1
```

## 14. Reference simulation numbers

Source: `/workspace/cardlab/experiments/CGL-20261030-03/report.md` (2000 deals, seeds 2026103030000–2026103031999):

| Strategy | Mean |
|---|---|
| Random | 21.9 |
| Conservative | 230.4 |
| Aggressive | 292.1 |
| Adaptive | 323.8 |
| Greedy | 361.7 |
| SIMPLE | 363.2 |
| d1 planner | 449.0 |
| BestFixed | 478.8 |
| HP50 (HumanProxy mix) | 516.7 |
| HP25 (HumanProxy mix) | 599.2 |
| d2 planner | 655.8 |
| **d3 planner** | **835.0** (median 873, SD 227.1; ≥700 70.6%, ≥1000 25.1%) |
| d3X | 912.2 |

Example: the d3 planner scored 1016 on deal seed 2026103030000.