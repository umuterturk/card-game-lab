# Kindling: React implementation spec (CGL-20261030-01)

**Rules source (final):** `/workspace/cardlab/experiments/CGL-20261030-01/design-v2.md` (frozen, approved).
**Authoritative engine:** `/workspace/cardlab/experiments/CGL-20261030-01/sim.py`, `class Game` (lines 27–140). Where this spec gives code-level detail, it comes from that class.
**Report:** `/workspace/cardlab/experiments/CGL-20261030-01/report.md` (PASS).
**Fixtures:** re-generated on the box on 2026-10-30 by running `sim.py` (deal and replay of seed 7003).

---

## 1. Overview and goal

Kindling is a solitaire card game for one player, with no opponent and no hidden hand. It lasts exactly **40 turns** (called "Takes").

Each turn you take one card from a 3-card face-up market and add it to one of three **Fires**. A card can go on a Fire only if its rank is 1–3 higher than the Fire's top card. When a Fire has 3 or more cards you may **Kindle** it: you score n² points (doubled if the suit matches the Fire's bottom card), gain a Spark, and the Fire empties.

If the card you take fits no Fire, it **Smothers** your largest Fire. That Fire's cards are lost and the taken card starts a new Fire there.

**Goal:** the highest final score after 40 Takes. Tiers: **Ash < 130**, **Win ≥ 130**, **Masterful ≥ 200**.

## 2. Components (exact)

- **40 cards:** ranks A(=1), 2–10 in each of 4 suits. There are no J, Q or K, and every card is unique.
  - Code id `c ∈ 0..39`, with `rank = c % 10 + 1` and `suit = Math.floor(c / 10)`.
  - Suit index order: `0 = H (♥), 1 = D (♦), 2 = S (♠), 3 = C (♣)`.
  - Card name: `('A' if rank==1 else rank) + 'HDSC'[suit]`, e.g. id 36 = `7C`.
- **Sparks:** a counter. You start with 3. The doc mentions "about 15 tokens" as physical components, but the code has **no cap** (see §12).
- **Three Fires, A, B and C** (index 0, 1, 2), left to right. The order matters only for the Smother tie-break.
- **Market:** slots 1, 2 and 3 (index 0, 1, 2).
- **Deck:** face down.
- **Discard pile:** face up.
- **Score:** Kindle points.

Kindle value table (n = number of cards in the Fire after placing):

| n | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|
| plain | 9 | 16 | 25 | 36 | 49 | 64 |
| Double | 18 | 32 | 50 | 72 | 98 | 128 |

The formula is n² (×2 if Double) for any n.

## 3. Setup (step by step)

1. Shuffle the 40 card ids uniformly. This is `deck[0..39]`.
2. The market is `deck[0], deck[1], deck[2]` (slot 1, 2, 3). Set `pos = 3`, so the deck now holds 37 unseen cards.
3. Fires A, B and C are all empty (`null`).
4. Sparks = 3, score = 0, turn = 0 (Takes completed), discard = [].

## 4. Turn state machine (one Take; repeated until the market is empty)

```
TURN_START ─► CHOOSE (slot, fire, kindle?) ─► RESOLVE (pay → place|smother → kindle?) ─► REFILL ─► (market empty? GAME_OVER : TURN_START)
```

All of a Take's choices are made in a single action (this is how the code does it). A UI may collect them in sub-steps, but it must submit one atomic `TAKE`.

### 4.1 Definitions

- `fits(fire, r)` is true when `fire === null` **or** `1 <= r - fire.top <= 3`. Suit is irrelevant to fitting.
  - A Fire with top 10 is "dead": nothing fits it.
  - An empty Fire accepts any card.
- The **Smother target** is evaluated only when all three Fires are non-empty, so a Smother can never happen while any Fire is empty. It is the index `i` that maximises the tuple `(fire.n, fire.top, -i)`:
  - first the most cards;
  - then the highest top card;
  - then the leftmost (A before B before C).

### 4.2 Legal actions (exact generator, from `Game.legal()`)

For each market index `k` (0..market.length−1) holding card `c` with rank `r`:

1. **Cost precondition:** `k == 0` is free. `k ≥ 1` costs 1 Spark and is **illegal if sparks == 0**.
2. Let `F` be the list of Fire indices `i` where `fits(fires[i], r)`.
3. If `F` is non-empty, then for each `i` in `F`:
   - `(k, i, kindle=false, smother=false)` is legal;
   - let `n = (fires[i] === null ? 1 : fires[i].n + 1)`; if `n >= 3`, then `(k, i, kindle=true, smother=false)` is also legal.
4. If `F` is empty, exactly one action is legal: `(k, smotherTarget(), kindle=false, smother=true)`.

Consequences:
- **Choosing a card that fits nothing is legal even when another market card fits.** The Smother is a consequence of which card you take; you may take it voluntarily.
- If a card fits several Fires, you choose any one of them. You may not put a fitting card on a non-fitting Fire.
- You can never choose the Smother target yourself.

### 4.3 Resolve (exact order, from `Game.step`)

1. Remove the card from the market: `c = market.splice(k, 1)[0]`. If `k > 0`, then `sparks -= 1`.
2. **Smother branch** (`smother == true`):
   - the target Fire's cards all go to the discard pile and score 0;
   - Fire `i` becomes a new Fire `{bottomSuit: suit(c), top: rank(c), n: 1, cards: [c]}`;
   - there is no Kindle and no other penalty.
3. **Place branch:**
   - if Fire `i` is empty, create `{bottomSuit: suit(c), top: rank(c), n: 1, cards: [c]}`;
   - otherwise set `top = rank(c)`, `n += 1` and push `c`.
4. **Kindle** (only if `kindle == true`; requires `n >= 3`, and only on the Fire just placed on):
   - `double = (suit(c) === fire.bottomSuit)`, where `bottomSuit` is the suit of the Fire's first card;
   - `pts = n * n * (double ? 2 : 1)`;
   - `score += pts`, `sparks += 1`;
   - the Fire's cards go to the discard pile and the Fire becomes `null`.
   - A Kindle **is** legal on the 40th Take.
5. `turn += 1`.
6. **Refill (D5):** if `pos < 40`, append `deck[pos]` to the end of the market and do `pos++`. The remaining cards keep their order and slide toward slot 1.
   - Invariant: `market.length === Math.min(3, 40 - turn)`.
   - The market shrinks 3 → 2 → 1 on Takes 38, 39 and 40.
7. **Game over** when `market.length === 0` (always exactly after Take 40).

### 4.4 Information (D7)

Everything is public except the order of the deck. Unseen set U = `deck[pos..39]`. At the start of Take t, |U| = max(0, 37 − (t − 1)).

## 5. Scoring formulas, with worked numbers

- **Kindle:** `n² × (2 if placed card's suit == Fire's bottom card suit else 1)`.
  - Fire C = 2♦ (bottom), 3♠, and you place 4♦: n = 3, Double → 3² × 2 = **18**.
  - Fire B = 5♦(bottom) 6♠ 7♠ 9♠, and you place 10♦: n = 5, Double → 5² × 2 = **50** (seed 7003, Take 10).
  - A plain n=3 Kindle (seed 7003, Take 19: 8♣ on the Fire 2♥ 5♣, ♥ bottom) = **9**.
- **Final score (D6):** `final = score (Kindle points) + Σ over open Fires of n + sparks`.
  - Example (seed 7003 replay end): Kindle points 177 + open-Fire cards (1+1+1) + Sparks 1 = **181**.
- **Tiers:** final < 130 is Ash; ≥ 130 is Win; ≥ 200 is Masterful.

## 6. Bust / fail / reset conditions

- **Smother** is the only "bust": the target Fire's cards are lost (worth 0) and the Fire resets to 1 card (the taken card).
- **Spending Sparks** to take slot 2 or 3 is the only cost. At 0 Sparks only slot 1 is legal.
- There is no game-loss condition other than finishing with a low score.

## 7. End of game and final score

The game ends after the 40th Take, when the market is empty and the deck is empty. Compute `final` as in §5, then classify it as Ash, Win or Masterful.

## 8. Randomness

- The only random event is the initial shuffle.
- The Python sims use `random.Random(seed).shuffle(list(range(40)))` (Mersenne Twister and CPython's `_randbelow`). Reproducing that in JS would require porting MT19937 and CPython's shuffle exactly. **Do not try to match Python seeds.**
- **Recommendation:** use a seeded PRNG (mulberry32) with Fisher–Yates for replayable games. Also accept a `deckOverride: number[]` so the Python fixtures below can be loaded for tests.

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

**Fixture: Python seed 7003 deck (ids, then names):**
```
[36,14,25,26,13,11,28,22,32,19,1,23,0,29,39,27,37,6,34,35,12,15,4,30,10,16,2,38,33,3,20,21,9,8,18,24,17,5,31,7]
7C 5D 6S 7S 4D 2D 9S 3S 3C 10D 2H 4S AH 10S 10C 8S 8C 7H 5C 6C 3D 6D 5H AC AD 7D 3H 9C 4C 4H AS 2S 10H 9H 9D 5S 8D 6H 2C 8H
```

## 9. Edge cases and tie-breaks (from the code)

- **Smother tie-break:** key `(n, top, −index)`; the maximum wins.
- A Smother only happens when all three Fires are non-empty.
- **Dead Fire:** a Fire with top 10 accepts nothing.
- **Kindle choice** exists only on the Fire just placed on, and only if n ≥ 3 after placing. There is no Kindle after a Smother.
- **Holding a 3+ Fire** without Kindling is legal (it keeps growing, but it is exposed to Smother).
- **Double** compares the **placed** card's suit with the **bottom** card's suit. The suits of the middle cards are irrelevant.
- **Slot costs** apply to the slot index at Take time. When the market has 2 cards, slot 2 still costs 1 Spark.
- **Sparks** have no upper limit in the code.
- **Card conservation** (asserted every Take): market + deck remainder + discard + all Fire cards = all 40 ids.
- An Ace (rank 1) fits only an empty Fire, because nothing is below 1.

## 10. Data model and reducer (TypeScript)

```ts
type CardId = number;                       // 0..39; rank = id%10+1; suit = floor(id/10): 0H 1D 2S 3C
interface Fire { bottomSuit: 0|1|2|3; top: number; n: number; cards: CardId[] }
interface KindlingState {
  deck: CardId[];            // full 40-card order (hidden from UI except remaining count)
  pos: number;               // next deck index to refill from (starts 3)
  market: CardId[];          // length = min(3, 40 - turn)
  fires: [Fire|null, Fire|null, Fire|null];
  sparks: number;            // starts 3, no cap
  score: number;             // Kindle points
  turn: number;              // Takes completed, 0..40
  discard: CardId[];
  log: Array<{ t: number; card: CardId; slot: number; move: 'place'|'kindle'|'smother'; fire: number; pts?: number }>;
  status: 'playing'|'over';
}
type KindlingAction =
  | { type: 'NEW_GAME'; seed?: number; deckOverride?: CardId[] }
  | { type: 'TAKE'; slot: 0|1|2; fire: 0|1|2; kindle: boolean };   // smother is inferred: if the card fits no Fire, fire must equal smotherTarget()
```

Pure helpers: `rank`, `suit`, `fits(fire, r)`, `smotherTarget(fires)`, `legalActions(state)` (§4.2), `finalScore(state)`, `tier(final)`.

Reducer:
- `NEW_GAME`: build state per §3.
- `TAKE`: reject the action (return the state unchanged, or throw in dev) unless it is in `legalActions(state)`; otherwise apply §4.3. Infer `smother = no Fire fits`.
- When `turn === 40`, set `status = 'over'`.
- Keep the reducer deterministic: no RNG inside `TAKE`.

## 11. UI notes (hidden vs public)

- **Public:**
  - the 3 market cards and their slot costs;
  - each Fire's full stack (or at least bottom, top and n);
  - Sparks, score and the discard pile;
  - the deck's remaining count;
  - the composition of the unseen cards, which the rules allow players to count (D7).
- **Hidden:** the deck order only.
- **Suggested aids (not rules):**
  - highlight the Fires a market card fits;
  - preview "this card will SMOTHER Fire X (lose n cards)";
  - show the Kindle value (plain or Double) when n ≥ 3;
  - grey out slots 2 and 3 at 0 Sparks.

## 12. Discrepancies and unspecified points

**Doc vs code:** no rule discrepancy found. Text and engine agree on every rule above.

- **UNSPECIFIED — builder must decide:**
  - **Spark cap / supply.** The doc lists "about 15 Spark tokens" as components; the code has no cap. *Suggestion:* no cap (matches the sim).
  - **Optional extra tier.** The report suggests adding a "Blaze ≥ 250" tier (report.md §8). This is not in design-v2. *Suggestion:* show it as an optional badge only.
  - **UI flow for a Take** (one click versus card → Fire → Kindle prompt). *Suggestion:* click card → click Fire → if n ≥ 3, prompt Kindle / Hold. Smother is automatic with a confirm.

## 13. Acceptance tests (given state + action → expected)

| # | Given | Action | Expected |
|---|---|---|---|
| K1 | Fires: top4 n2, top7 n2, top9 n1 (all non-empty) | `smotherTarget` | index **1** (n ties at 2; top 7 > 4) |
| K2 | As K1, but Fire 0 top = 7 | `smotherTarget` | index **0** (n2, top7 tie → leftmost) |
| K3 | As K1, but Fire 2 n = 3 | `smotherTarget` | index **2** (most cards) |
| K4 | Fire top 7 | `fits` for ranks 8, 9, 10 / 7 / 6 | true / false / false |
| K5 | Fire top 10 | `fits` for any rank | false |
| K6 | Empty Fire | `fits` for rank 1 | true |
| K7 | sparks = 0 | `legalActions` | only actions with slot 0 |
| K8 | Seed-7003 fixture, new game | — | market = 7C 5D 6S, sparks 3, deck remaining 37 |
| K9 | Seed 7003 after Takes 1–3 (B = [5D,6S]); Take 4 variant: slot 1 7S → B with kindle=true | TAKE | n=3, 7S is not ♦ (bottom) → plain **+9**, sparks **4**, Fire B empty |
| K10 | Seed 7003 after Take 6: C = [2D,3S] (bottom D), sparks 1, slot 1 = 4D | TAKE slot 0 → C, kindle | +**18** (3²×2), score 18, sparks 2, C empty |
| K11 | All Fires full, card fits none | TAKE with `fire ≠ smotherTarget` | rejected |
| K12 | Seed 7003 after Take 13: A = [7C,10S] top10 n2, B = [2H] n1, C = [3C,4S] top4 n2; market slot 1 = AH | TAKE | Smother Fire **A** (n2 tie with C, top 10 > 4); A becomes [AH] n1 bottom H; 2 cards discarded |
| K13 | Full seed-7003 replay (40 moves below) | — | Kindles [18, 50, 9, 18, 32, 18, 32] = **177**; Smothers on Takes 14, 15, 16, 23, 24, 25, 40; Sparks 1; **final 181** (Win) |
| K14 | Any state after any TAKE | invariant | `market.length == min(3, 40−turn)` and card conservation |

**Seed-7003 replay moves** (`H_MOVES` in sim.py: (slot 1-based, Fire, kindle)):
```
(1,A,0)(1,B,0)(1,B,0)(1,B,0)(2,C,0)(3,C,0)(1,C,1)(1,B,0)(1,C,0)(1,B,1)
(1,B,0)(1,C,0)(2,A,0)(1,A,0)(1,C,0)(3,C,0)(1,C,0)(2,B,0)(1,B,1)(2,A,0)
(1,A,0)(1,B,0)(1,A,0)(1,C,0)(1,B,0)(1,A,0)(1,C,0)(1,A,0)(1,C,1)(1,B,0)
(3,A,1)(1,A,0)(1,A,0)(3,A,1)(1,A,0)(3,B,0)(1,B,1)(1,B,0)(1,C,0)(1,A,0)
```
For Smother Takes, the Fire letter in this list is ignored; the engine uses the forced target.

Per-Take trace (generated on the box by running `sim.Game(7003)` with these moves; Fires shown as bottom-suit/top/n; s = slot):
```
T01 7C s1 → A                       A C/7/1
T02 5D s1 → B                       B D/5/1
T03 6S s1 → B                       B D/6/2
T04 7S s1 → B (hold, n3)            B D/7/3
T05 2D s2 → C   sparks 2            C D/2/1
T06 3S s3 → C   sparks 1            C D/3/2
T07 4D s1 → C KINDLE n3 DOUBLE +18  score 18  sparks 2
T08 9S s1 → B                       B D/9/4
T09 3C s1 → C                       C C/3/1
T10 10D s1 → B KINDLE n5 DOUBLE +50 score 68  sparks 3
T11 2H s1 → B                       B H/2/1
T12 4S s1 → C                       C C/4/2
T13 10S s2 → A  sparks 2            A C/10/2
T14 AH  SMOTHER A (lost 2)          A H/1/1   (A n2 top10 beats C n2 top4)
T15 10C SMOTHER C (lost 2)          C C/10/1
T16 7H s3 SMOTHER C (lost 1) sp 1   C H/7/1   (all n1; C has top 10)
T17 8S → C                          C H/8/2
T18 5C s2 → B  sparks 0             B H/5/2
T19 8C → B KINDLE n3 plain +9       score 77  sparks 1
T20 3D s2 → A  sparks 0             A H/3/2
T21 6C → A                          A H/6/3
T22 6D → B                          B D/6/1
T23 5H SMOTHER A (lost 3)           A H/5/1
T24 AC SMOTHER C (lost 2)           C C/1/1
T25 AD SMOTHER B (lost 1)           B D/1/1
T26 7D → A                          A H/7/2
T27 3H → C                          C C/3/2
T28 9C → A                          A H/9/3
T29 4C → C KINDLE n3 DOUBLE +18     score 95  sparks 1
T30 4H → B                          B D/4/2
T31 10H s3 → A KINDLE n4 DOUBLE +32 score 127 sparks 1
T32 AS → A                          A S/1/1
T33 2S → A                          A S/2/2
T34 5S s3 → A KINDLE n3 DOUBLE +18  score 145 sparks 1
T35 9H → A                          A H/9/1
T36 6H s3 → B  sparks 0             B D/6/3
T37 9D → B KINDLE n4 DOUBLE +32     score 177 sparks 1
T38 8D → B                          B D/8/1
T39 2C → C                          C C/2/1
T40 8H SMOTHER A (lost 1)           A H/8/1   (all n1; A top 9 highest)
End: A H/8/1 | B D/8/1 | C C/2/1 → final 177 + 3 + 1 = 181 (Win)
```

## 14. Reference simulation numbers

Source: `/workspace/cardlab/experiments/CGL-20261030-01/report.md` (2000 deals, seeds 2026103010000–11999):

| Strategy | Mean |
|---|---|
| Random | 45.84 |
| SIMPLE | 100.66 |
| Best fixed rule | 102.84 |
| HumanProxy | 166.63 |
| d2 planner | 190.69 |
| **d3 planner** | **226.56** (median 224, SD 50.97; Win 97.95%, Masterful 69.2%) |
| d4 (200 deals) | 237.0 |

Use these numbers to sanity-check any bot opponent or hint system. They are not needed for the game itself.