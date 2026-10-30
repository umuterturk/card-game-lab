# Undertow (v4): React implementation spec (CGL-20261030-06)

**Rules source (final):** `/workspace/cardlab/experiments/CGL-20261030-06/design-v4.md`, sections B–E.
**Authoritative engine:** `/workspace/cardlab/experiments/CGL-20261030-06/sim_v4.py`, `ref4_play_log()` (lines 24–58). This is the Python reference that re-checks every C-engine game; the report says it matches on 500/500 games per policy. Helpers come from `sim.py` (`deal`, `suit`, `rank`, `tsuit`, `trank`) and `count_live` (sim_v4.py line 20).
**Report:** `/workspace/cardlab/experiments/CGL-20261030-06/report-v4.md`.
**Fixture:** re-verified on the box on 2026-10-30. The §H deal (seed 7) replayed through `ref4_play_log` gives **182**.

---

## 1. Overview and goal

Undertow is a solitaire rowing game played in exactly **12 turns**. Each turn a **Tide** court card (J/Q/K = 11/12/13) pulls against you. You play Crew cards (A–10) to:
- **Break** the Tide (one card of its suit makes the Tide count 0);
- **Anchor** (+1 to your permanent Line);
- **Row** (up to 3 cards summed).

The margin m goes to **Catch** if positive, or to **Strain** if negative.

High Strain (6+) triggers a **Check** that may **Crack** you: Catch is halved and Strain is lost. Surviving a check while a cracking card was still possible ("live") makes that Strain **Deep**, which scores double.

**Goal:** Score = Catch + 3 × Strain + 3 × Deep. Tiers: **Survived < 140**, **Win ≥ 140**, **Masterful ≥ 165**.

## 2. Components (exact)

- **Crew deck:** 40 cards, A(=1)–10 in four suits.
  - Code id `c ∈ 0..39`, with `rank = c%10+1` and `suit = floor(c/10)`.
  - Suit order: **S=0 (♠), H=1 (♥), D=2 (♦), C=3 (♣)**.
- **Tide deck:** 12 court cards.
  - Code id `x ∈ 0..11`, with `suit = floor(x/3)` (same S H D C order) and `rank = 11 + x%3` (J=11, Q=12, K=13).
- **Hull:** the bottom Crew card (`crew[39]`), face down.
- **Line:** a count of Anchored cards. The Anchored cards stay in the Line area.
- **Counters:**
  - Strain (track 0–10; 11+ always Cracks);
  - Deep (tokens, about 10);
  - Catch;
  - turn number (1–12).
- **Discard pile:** face up.

## 3. Setup (exact, from `deal(seed)` + `ref4_play_log`)

1. Shuffle the Tide (12) and the Crew (40) separately.
   - The code uses one RNG and shuffles the **Tide first, then the Crew**.
2. Hull = `crew[39]` (face down, never drawn).
3. Hand = `crew[0..3]` (4 cards). Draw pointer `ci = 4`.
4. Preview = `tide[0]` (face up).
5. Line = 0, Strain = 0, Catch = 0, Deep = 0. `seen = {crew[0..3]}`.

## 4. Turn state machine (t = 0..11, turn number = t+1)

```
TIDE ─► DRAW ─► ACT (player) ─► RESOLVE (+CHECK, automatic) ─► CLEANUP (player keeps ≤4) ─► next turn | GAME_OVER after turn 12
```

1. **TIDE.**
   - The Tide is `tide[t]`, and the new Preview is `tide[t+1]` (none on turn 12).
   - Let `ts` = the Tide's suit and `tr` = its rank.
2. **DRAW.**
   - Draw `k = 3` cards (`k = 2` on turn 12): `crew[ci .. ci+k-1]` go to the hand, and all are added to `seen`. Then `ci += k`.
   - The hand now has at most 7 cards (≤ 4 kept + 3).
   - After turn 12's draw, `ci = 39`, so only the Hull is undrawn.
3. **ACT (one player action).** Choose disjoint subsets of the hand; each card has at most one use.
   - **Break:** 0 or 1 card, which **must be of suit `ts`**. If used, the Tide counts 0 this turn.
   - **Anchor:** 0 or 1 card, of any suit or rank. `line += 1` **before** m is computed, so it counts this turn.
   - **Row:** 0–3 cards, of any suit. Stroke = Σ ranks. Rowing nothing is a legal **Sacrifice**.
4. **RESOLVE.**
   ```
   m = Σ rank(row) + line − (broken ? 0 : tr) − (t + 1)
   if m > 0: catch += m
   if m < 0: strain += −m          (m == 0: nothing)
   ```
5. **CHECK** (only if `m < 0` **and** `strain >= 6` after adding; i.e. "Strain rose to 6 or more"):
   1. Note `count` = the number of **unseen** Crew cards of suit `ts` with rank ≤ `min(strain − 5, 10)`. Unseen = not in `seen`; the Hull is always unseen.
   2. The check card `cc` = `crew[ci]` (the next draw, flipped face up) on turns 1–11, or `crew[39]` (the Hull) on turn 12.
   3. **Crack** if `strain > 10` **or** (`suit(cc) == ts` and `rank(cc) <= strain − 5`).
   4. **On a Crack:**
      - `catch = floor(catch / 2)`, `strain = 0`, `deep = 0`;
      - if `t <= 2` (turns 1–3), the player's keeps are **all discarded** (the hand after clean-up is empty).
   5. **Survived and `count > 0`:** `deep += −m`. The Strain just taken becomes Deep.
   6. **Survived and `count == 0`:** nothing more; it is ordinary Strain.
6. **CLEANUP.**
   - The Break and Row cards are discarded. The Anchor card stays in the Line.
   - The player chooses **≤ 4** of the remaining unplayed cards to keep; the rest are discarded.
   - The check card (if any) is still on the deck, face up; it becomes the first card of the next draw.
   - After an early Crack (turns 1–3), keep = [] is forced.
7. After turn 12: **GAME_OVER**. `score = catch + 3*strain + 3*deep`.

## 5. Scoring, with worked numbers

- **m formula** (seed 7, turn 1): Tide Q♦, Break 6♦, Anchor 2♥ (line 1), Row 10♠ → m = 10 + 1 − 0 − 1 = **+10**, Catch 10.
- **Sacrifice** (turn 6): Tide Q♥ broken by 3♥, row nothing, line 4 → m = 0 + 4 − 0 − 6 = **−2**. Strain 2, no check (2 < 6).
- **Live check survived** (turn 9):
  - Tide J♠ not broken, Anchor 2♦ (line 5), Row 8♠ → m = 8 + 5 − 11 − 9 = **−7**, so Strain = 9.
  - Count = unseen ♠ with rank ≤ 4 = {3♠} = **1** of u = 9 unseen (P(Crack) = 1/9).
  - Check card 7♣ → safe, and count > 0 → **Deep += 7**.
- **The same turn, if the check card had been 3♠** (verified by swapping 3♠ and 7♣ in the deck): Crack → Catch 93 → **46**, Strain 0, Deep 0. It is turn 9, so the keeps stay (AD 2S 9C 8H).
- **Final** (seed 7): Catch 134, Strain 9, Deep 7 → 134 + 27 + 21 = **182** (Masterful).
- Each Deep point is worth 6 in total: 3 as Strain plus 3 as Deep.

## 6. Bust / fail / reset

- **Crack:** Catch halved (rounded down), Strain 0 and Deep 0; on turns 1–3 the keeps are also lost.
- **Strain ≥ 11 always Cracks** at the check, regardless of the check card.
- There is no game loss; the tiers classify the final score.

## 7. End of game / final score

After turn 12's resolve (and check, if any): **Score = Catch + 3 × Strain + 3 × Deep.** Tiers: < 140 Survived; ≥ 140 Win; ≥ 165 Masterful.

## 8. Randomness

- The random events are the shuffles. The check flips are deterministic given the deck order.
- Python: `r = random.Random(seed); r.shuffle(tide); r.shuffle(crew)`, with tide = 0..11 and crew = 0..39. This cannot be reproduced in JS without an MT19937 port.
- **Recommendation:** mulberry32 + Fisher–Yates. Use **one** RNG stream, shuffle the tide then the crew (to mirror the order), and support `tideOverride`/`crewOverride` for fixtures.

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

**Fixture: Python seed 7**

Tide ids (then names):
```
[7,11,3,10,8,4,9,1,0,6,2,5]
QD KC JH QC KD QH JC QS JS JD KS KH
```

Crew ids (then names; index 39 = Hull):
```
[25,31,14,39,10,9,11,16,29,30,6,33,37,8,0,24,22,12,19,21,28,35,23,20,7,3,18,34,1,38,17,36,15,4,26,27,5,2,13,32]
6D 2C 5H 10C AH 10S 2H 7H 10D AC 7S 4C 8C 9S AS 5D 3D 3H 10H 2D 9D 6C 4D AD 8S 4S 9H 5C 2S 9C 8H 7C 6H 5S 7D 8D 6S 3S 4H 3C
```

## 9. Edge cases and clarifications (from code and D4)

- **Break** must be of the Tide's suit; it is otherwise illegal. At most one card.
- **Anchor** may be any card. Line has no maximum.
- **Row** cards: up to 3, of any suit. You may not reuse the Break or Anchor card.
- **No check** if Strain did not rise this turn (m ≥ 0), even if Strain is already ≥ 6.
- The **count** is taken *before* the flip. Because the check card is unseen in both cases, the count before and after the flip is identical.
- **u** (unseen Crew cards) = `40 − ci`, which includes the Hull. P(Crack) = count / u (D5).
- On a fresh deck, P(Crack) at Strain 6/7/8/10 = 1/40, 2/40, 3/40, 5/40.
- **Turn 12:** the only unseen card is the Hull. The count is therefore 0 or 1, and when it is 1 the Crack is certain. Turn 12 can never earn Deep.
- A **zero-count survival** gives no Deep; it is ordinary Strain.
- **Strain > 10** Cracks without regard to the check card (and no Deep).
- **Early-Crack discard** applies only for t ≤ 2 (turns 1–3).
- `ci` never exceeds 38 before turn 12, so a check card always exists.
- Invariant: at the end, `ci == 39`.
- There are no tie-breaks in the rules (single player, deterministic resolution).

## 10. Data model and reducer (TypeScript)

```ts
type CrewId = number; // 0..39 rank=id%10+1 suit=floor(id/10): 0S 1H 2D 3C
type TideId = number; // 0..11 suit=floor(id/3) rank=11+id%3 (J,Q,K)
interface UndertowState {
  tide: TideId[]; crew: CrewId[];      // crew[39] = Hull
  t: number;                           // 0..11 current turn index
  ci: number;                          // next draw index
  hand: CrewId[];                      // after DRAW: ≤7
  seen: Set<CrewId> | boolean[];       // dealt/drawn cards (Hull never)
  lineCards: CrewId[];                 // line = lineCards.length
  catch: number; strain: number; deep: number;
  discard: CrewId[];
  phase: 'act' | 'cleanup' | 'over';
  lastResolve?: { m: number; checked: boolean; count?: number; u?: number; checkCard?: CrewId; crack?: boolean; deepAdded?: number };
  earlyCrackDiscard: boolean;          // set when crack on t<=2 (forces keep = [])
}
type UndertowAction =
  | { type: 'NEW_GAME'; seed?: number; tideOverride?: TideId[]; crewOverride?: CrewId[] }
  | { type: 'ACT'; breakCard: CrewId | null; anchorCard: CrewId | null; row: CrewId[] }   // phase 'act'
  | { type: 'KEEP'; keep: CrewId[] };                                                     // phase 'cleanup', ≤4 of unplayed
```

**Reducer:**
- `NEW_GAME`: run §3, then the TIDE + DRAW of turn 1 → phase `act`.
- `ACT`:
  - validate per §4.3; apply §4.4–4.5;
  - move the Break and Row cards to the discard pile and the Anchor card to `lineCards`;
  - phase `cleanup`, or `over` if t == 11 (see §12).
- `KEEP`:
  - validate keep ⊆ unplayed, `|keep| ≤ 4`, and keep = [] if `earlyCrackDiscard`;
  - discard the rest;
  - `t++`, run TIDE + DRAW → phase `act`.

**Pure helpers:**
- `computeM(state, act)`;
- `countLive(strain, ts, seen)`;
- `pCrack = count/u`;
- `previewResolve(state, act)` for UI hints, without mutating state;
- `score(state)`, `tier(score)`.

## 11. UI notes (hidden vs public)

- **Public:**
  - the current Tide and the Preview;
  - the hand (yours);
  - Line, Catch, Strain, Deep (with tokens on the Deep points), the turn number;
  - the discard pile;
  - the face-up check card on top of the deck (visible during Clean-up);
  - the Tide cards already seen. The Tide composition (3 per suit) is countable.
- **The count is public information** (D4). Showing "count / u = P(Crack)" before committing an ACT is consistent with the rules.
- **Hidden:**
  - the Crew order;
  - the Hull's identity until turn 12, though by turn 12 it is known by elimination;
  - the Tide order beyond the Preview.
- **Suggested UI (not rules):**
  - drag cards into Break / Anchor / Row zones;
  - live m preview;
  - disable invalid Break cards;
  - a Sacrifice button;
  - a Clean-up dialog with a 4-card limit;
  - an animated check flip.

## 12. Discrepancies and unspecified points

**Doc vs code (rules):** none found. design-v4 D1–D5 and `ref4_play_log` agree.

Notes:
1. The doc's trigger "Strain rose to 6 or more" is coded as `m < 0 and strain >= 6`. The two are identical.
2. `example-v4.txt` prints the turn-4 Anchor as `0`, which is the id of A♠. This is a display quirk, not a rule difference.
3. **Teaching tip** (§E) is a *strategy*, not a rule. The doc says its literal coding matches C `FR_best` on 0/300 mismatching seeds. The report notes small tie-order differences (6/2000 deals) caused by hand-order tie details, which the doc says "are not rules". Do not implement the tip as a rule; it may be offered as a hint bot.
4. Designer self-check numbers (e.g. MC48 160.74 on seeds 42001–42500) differ from the Player report (158.9 on 2000 fresh seeds). The deals and engines differ; use the report numbers in §14.

**UNSPECIFIED — builder must decide:**
- **Turn-12 Clean-up.** The rules still say "keep ≤ 4", but nothing follows. *Suggestion:* skip it and go straight to GAME_OVER.
- **ACT entry UX:** one combined commit versus sequential zones. *Suggestion:* zones plus a single "Row!" commit.
- **Odds display** (count, u, P(Crack)) on by default or behind a toggle. *Suggestion:* toggle, on by default, because it is public info.
- **Match / multi-deal format.** Not in design-v4; any best-of-N or session format would be an addition. *Suggestion:* none by default.
- **Undo:** not specified. *Suggestion:* allow undo only within the ACT selection, before commit, since the check reveals information.

## 13. Acceptance tests

| # | Given | Action | Expected |
|---|---|---|---|
| U1 | Seed-7 fixture, NEW_GAME | — | Tide QD, Preview KC; initial hand 6D 2C 5H 10C; turn-1 draw AH 10S 2H → hand of 7; `ci = 7`; Hull 3C |
| U2 | Seed 7, T1 | ACT break 6D, anchor 2H, row [10S] | m = +10, catch 10, line 1 |
| U3 | T1 Tide QD | ACT break 2C (♣) | rejected (Break must be ♦) |
| U4 | Any | ACT row with 4 cards | rejected |
| U5 | Any | ACT with the same card in Break and Row | rejected |
| U6 | Seed 7, T6 (line 4, Tide Q♥) | ACT break 3H, row [] | m = −2, strain 2, no check |
| U7 | Seed 7, T9 (strain 2, line 4, Tide J♠) | ACT break null, anchor 2D, row [8S] | m = −7, strain 9, check: count 1 (3♠), u 9, check card 7♣ → no crack, deep **7**, catch 93 |
| U8 | As U7, but crew with 3♠ and 7♣ swapped | same ACT | check card 3♠ → **Crack**: catch 46, strain 0, deep 0; keeps allowed (turn 9) |
| U9 | Turn ≤ 3, strain becomes ≥ 6 and the check card cracks | ACT then KEEP non-empty | KEEP rejected; keep must be [] |
| U10 | strain 8 | ACT giving m = −3 | strain 11 → **Crack** regardless of the check card |
| U11 | strain 0, m = −6, Tide suit's Ace already seen | ACT | strain 6, count 0, no crack possible from the flip, deep += 0 |
| U12 | strain 9, ACT giving m ≥ 0 | ACT | no check (Strain did not rise) |
| U13 | m = 0 | ACT | catch, strain and deep unchanged; no check |
| U14 | Turn 12 check | ACT with m < 0, strain ≥ 6 | check card = Hull (`crew[39]`); count ∈ {0,1}; no Deep can be earned |
| U15 | Cleanup with 5 unplayed cards | KEEP 5 cards | rejected (max 4) |
| U16 | Full seed-7 replay (log below) | — | per-turn m 10,10,24,15,9,−2,6,19,−7,15,15,11; line 1,2,2,3,4,4,4,4,5,5,5,5; final catch 134, strain 9, deep 7, **score 182** (Masterful) |

**U16 action log** (Break / Anchor / Row / Keep), from `v4/example-v4.txt`:

| T | Tide | Break | Anchor | Row | Keep | Catch after | Strain (Deep) |
|---|---|---|---|---|---|---|---|
| 1 | QD | 6D | 2H | 10S | 2C 5H 10C AH | 10 | 0 |
| 2 | KC | AC | AH | 10C | 2C 5H 7H 10D | 20 | 0 |
| 3 | JH | 5H | – | 7H 10D 8C | 2C 7S 4C | 44 | 0 |
| 4 | QC | 4C | AS | 7S 9S | 2C 5D | 59 | 0 |
| 5 | KD | 3D | 2C | 10H | 5D 3H | 68 | 0 |
| 6 | QH | 3H | – | (Sacrifice) | 5D 2D 9D 6C | 68 | 2 |
| 7 | JC | 6C | – | 4D 5D | 2D 9D AD 8S | 74 | 2 |
| 8 | QS | 4S | – | 9H 9D 5C | 2D AD 8S | 93 | 2 |
| 9 | JS | – | 2D | 8S | AD 2S 9C 8H | 93 | 9 (7) |
| 10 | JD | AD | – | 5S 8H 7C | 2S 9C 6H | 108 | 9 (7) |
| 11 | KS | 2S | – | 6S 7D 8D | 9C 6H | 123 | 9 (7) |
| 12 | KH | 4H | – | 3S 6H 9C | – | 134 | 9 (7) |

## 14. Reference simulation numbers

Source: `/workspace/cardlab/experiments/CGL-20261030-06/report-v4.md`, "Strategy ladder" table (lines 184–199). The deals are fresh seeds 2026103070000+i. Win/Masterful = share of deals reaching ≥140 / ≥165; Crack = share of games with at least one Crack.

| Strategy | n | Mean ± SE | Median | SD | Win | Masterful | Crack | Deep at end |
|---|---|---|---|---|---|---|---|---|
| Random | 2000 | 29.4 ± 0.5 | 25 | 20.4 | 0% | 0% | 97.8% | 0.22 |
| Conservative | 2000 | 117.2 ± 0.7 | 123 | 29.3 | 16.5% | 3.8% | 19.6% | 0.73 |
| Adaptive | 2000 | 127.9 ± 0.7 | 139 | 32.3 | 49.7% | 3.8% | 21.8% | 0.55 |
| Aggressive | 2000 | 128.3 ± 0.9 | 143 | 39.0 | 56.7% | 13.6% | 32.0% | 1.64 |
| TIP (v4 teaching tip) | 2000 | 132.5 ± 0.6 | 140 | 27.6 | 50.7% | 3.3% | 13.9% | 0.40 |
| FR_best (best of 12,099 rules) | 2000 | 134.0 ± 0.7 | 142 | 31.1 | 56.7% | 8.6% | 18.2% | 1.33 |
| Strategic (1-step EV) | 2000 | 143.4 ± 0.9 | 159 | 41.0 | 72.4% | 38.4% | 30.2% | 6.64 |
| MC48, no risk allowed | 2000 | 147.7 ± 0.2 | 148 | 9.6 | 84.0% | 1.1% | 0.3% | 0.02 |
| MC16 planner | 2000 | 156.6 ± 0.4 | 160 | 18.0 | 87.9% | 36.7% | 11.7% | 5.42 |
| **MC48 planner** | 2000 | **158.9 ± 0.4** | 162 | 17.8 | **90.2%** | **43.0%** | 8.8% | 5.07 |
| Clairvoyant (NOT legal) | 1000 | 172.3 ± 0.4 | 174 | 12.6 | 98.6% | 76.5% | 1.6% | 8.12 |

Sanity targets for a JS port running the same policy on its own RNG:
- MC48 should come out near 159;
- Random play should come out near 29.