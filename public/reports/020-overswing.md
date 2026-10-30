# Overswing (v6): React implementation spec (CGL-20261029-23)

**Rules source (final):** `/workspace/cardlab/experiments/CGL-20261029-23/design-v6.md` (sections B–E).
**Authoritative engine:** `/workspace/cardlab/experiments/CGL-20261029-23/sim_v6.py`: `apply_card` (lines 30–38) and `play()` (lines 62–181).
**Report:** `/workspace/cardlab/experiments/CGL-20261029-23/report-v6.md`.
**Fixtures:** re-verified on the box on 2026-10-30. The §H deal (seed 12) was replayed with v6 rules and gives T = 534 (script `/tmp/os_h.py`).

---

## 1. Overview and goal

Overswing is a solitaire push-your-luck game. It is played as a **3-deal Match** (the official game) or as a single deal (the "Short game").

You flip cards to move a pendulum coin S between −10 and +10:
- red cards push it +rank;
- black cards push it −rank.

A card that carries S **across or onto zero** is a *swing*. A swing raises the multiplier W (more when it starts farther from zero, up to W = 5, i.e. ×6). The swing card also jumps into your Hand if there is room.

You can **Steer** with Hand cards and **Bank** at any time for Pot × (1 + W). If |S| would pass 10, the pendulum **Snaps** and the Pot is lost.

**Goal:**
- **Match:** M = T₁ + T₂ + T₃. Win if M ≥ **1500**; Masterful if M ≥ **2100**.
- **Short game (1 deal):** Win if T ≥ **500**; Masterful if T ≥ **800**.

## 2. Components (exact)

- **40 cards:** A(=1)…10 in ♥ ♦ ♠ ♣.
  - Code id: `id = suit*10 + rank − 1`, with suit order **H=0, D=1, S=2, C=3**.
  - **Signed value:** ♥/♦ = **+rank**; ♠/♣ = **−rank**. That gives 20 positive cards (two each of +1…+10) and 20 negative cards.
- **S (pendulum):** an integer from −10 to +10. It resets to 0 at the start of every Swing.
- **W (multiplier):** an integer from 0 to 5 (payout ×1…×6). It resets to 0 at the start of every Swing.
- **Pot:** face-up cards scored this Swing. P = Σ **ranks** (unsigned).
- **Hand:** 0–3 face-up cards, with a **hard cap of 3**.
- **Discard pile:** face up.
- **Score:** T (this deal) and M (Match total).

## 3. Setup (each deal)

1. Shuffle all 40 cards. This is the Deck (face down).
2. Deal `deck[0], deck[1]` face up to the Hand. The Deck now holds 38 cards (`pos = 2`).
3. T = 0, discard = [].
4. Start Swing 1: S = 0, W = 0, Pot = [].

**Match:** run 3 independent deals, each reshuffling all 40 cards. Nothing carries over except M.

## 4. State machine

```
DEAL_START ─► SWING_START(S=0,W=0,pot=[]) ─► STEP* ─► SWING_END (Bank | Snap)
SWING_END: if deck non-empty → SWING_START else DEAL_END
DEAL_END: Short game → GAME_OVER; Match → next deal (3 deals) → GAME_OVER
```

### 4.1 Legal actions at a STEP (from `play()`)

| Condition | Legal actions |
|---|---|
| Pot is empty (only at a Swing's start) | **Flip** only (forced). The first card comes from S=0, so it never swings and always enters the Pot. |
| Deck empty **and** Hand empty | **Bank** only (forced) |
| Otherwise | **Flip** if the deck is non-empty; **Steer(i)** for any Hand card i (needs hand ≥ 1 and pot ≥ 1); **Bank** (needs pot ≥ 1) |

- Steering into a Snap is legal.
- At deck = 0 you may still Steer or Bank.

### 4.2 Applying a card v (Flip or Steer), exact (`apply_card(S, W, v)`)

```
S2 = S + v
if |S2| > 10:                    → SNAP            (|S2| == 10 is safe)
swung = S != 0 && (S2 == 0 || sign(S2) != sign(S))
g = swung ? min(floor(|S|/3), 5 - W) : 0           // gain measured from S BEFORE the card
S = S2; W = W + g                                   // W is updated BEFORE placement
```

Gain table (before the cap):

| \|S\| before the card | 1–2 | 3–5 | 6–8 | 9–10 |
|---|---|---|---|---|
| Gain | +0 | +1 | +2 | +3 |

### 4.3 Placement after a survived card

| Source | Swung? | Destination |
|---|---|---|
| Flip | yes | **Hand** if hand.length < 3 (automatic, no choice, even on a +0 swing and even at W=5); otherwise the **Pot** |
| Flip | no | **Pot** |
| Steer | yes | **Pot** (scores) |
| Steer | no | **Discard** (includes every Steer from S = 0) |

### 4.4 Snap (D3)

- All Pot cards **and** the card that caused the Snap go to the discard pile. The Swing scores 0.
- The **Hand keeps every card**, including swing cards caught earlier in this Swing.
- The Swing ends.

### 4.5 Bank (D4)

`T += P × (1 + W)`. The Pot goes to the discard pile and the Swing ends.

### 4.6 End of deck (D5, exceptional rule 1)

- When the deck is empty, Flip is illegal.
- When a Swing ends (Bank or Snap) with the deck empty, **the deal ends**. Cards left in the Hand score 0.
- There are exactly 38 flips per deal.

## 5. Scoring, with worked numbers (seed-12 deal, v6)

- **Bank** = P × (1 + W).
  - Swing 1 ends with P = 32 and W = 5 → **32 × 6 = 192**.
  - Swing 2: **35 × 6 = 210** (T = 402).
  - Swing 3: **33 × 4 = 132** (T = **534**, a Short-game Win).
- **Gain examples** (unit tests):
  - +7 → −2 is a swing from |7| → W +2.
  - +6 → −4 with W = 4 → capped: W becomes 5 (g = 1).
- **Match:** M = T₁ + T₂ + T₃. For example, 534 + 500 + 500 = 1534 is a Win (the illustrative sum is arithmetic only, not from a sim).

## 6. Bust / fail / reset

- **Snap** (|S′| > 10): the Pot and the card are lost and the Swing scores 0. S and W reset at the next Swing.
- Each **new Swing** resets S = 0, W = 0 and Pot = [].
- The **Hand** persists across Swings within a deal, but not across deals.

## 7. End of game / final score

- **Short game:** T after the deal. Tiers: < 500 none, ≥ 500 Win, ≥ 800 Masterful.
- **Match:** M after 3 deals. Tiers: ≥ 1500 Win, ≥ 2100 Masterful.

## 8. Randomness

- The only random event is the shuffle at the start of each deal.
- The Python sims use `random.Random(seed).shuffle(list(range(40)))`, which is not reproducible in JS without porting MT19937 and CPython's shuffle. **Do not try to match Python seeds.**
- **Recommendation:** use mulberry32 + Fisher–Yates, with a deal seed derived per deal (e.g. `matchSeed*3 + dealIndex`; this derivation is a suggestion). Also support `deckOverride` for the fixtures.

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

**Fixture: Python seed 12 deck** (ids with suit order H D S C, then names):
```
[32,2,6,29,12,15,34,16,31,1,13,35,26,3,18,10,5,11,27,4,28,21,37,38,7,19,36,14,25,20,8,39,23,0,24,9,22,33,17,30]
3♣ 3♥ 7♥ 10♠ 3♦ 6♦ 5♣ 7♦ 2♣ 2♥ 4♦ 6♣ 7♠ 4♥ 9♦ A♦ 6♥ 2♦ 8♠ 5♥ 9♠ 2♠ 8♣ 9♣ 8♥ 10♦ 7♣ 5♦ 6♠ A♠ 9♥ 10♣ 4♠ A♥ 5♠ 10♥ 3♠ 4♣ 8♦ A♣
```

## 9. Edge cases and tie-breaks (from the code)

- Landing exactly on 0 from S ≠ 0 **is** a swing.
- From S = 0, nothing is a swing.
- |S′| = 10 is safe; 11 snaps.
- A +0 swing (|S| ≤ 2), or any swing at W = 5, still counts as a swing: a flipped card is caught into the Hand if there is room, and a Steer card goes to the Pot.
- The W cap is applied to the gain: `g = min(floor(|S|/3), 5 − W)`.
- Steer index: the player picks any Hand card. Hand order is display only.
- No ties exist (single player). The only random event is the shuffle.
- Invariants (asserted every step):
  - deck remainder + hand + pot + discard = 40 unique cards;
  - hand ≤ 3; |S| ≤ 10; 0 ≤ W ≤ 5;
  - 38 flips per deal.

## 10. Data model and reducer (TypeScript)

```ts
type CardId = number; // 0..39, rank = id%10+1, suit = floor(id/10): 0H 1D 2S 3C
const value = (c: CardId) => (Math.floor(c / 10) <= 1 ? 1 : -1) * (c % 10 + 1);
interface DealState {
  deck: CardId[]; pos: number;          // next flip = deck[pos]; pos starts at 2
  hand: CardId[];                       // ≤ 3, face up
  pot: CardId[]; discard: CardId[];
  S: number; W: number;                 // per Swing
  T: number;                            // this deal
  swingNo: number;
  log: string[];
}
interface OverswingState {
  mode: 'short' | 'match';
  dealIndex: number;                    // 0..2
  dealTotals: number[];                 // finished deals
  deal: DealState;
  status: 'playing' | 'dealOver' | 'gameOver';
  lastEvent?: { kind: 'swing'|'snap'|'bank'|'catch'|'steerDiscard'; card?: CardId; g?: number; gain?: number };
}
type OverswingAction =
  | { type: 'NEW_GAME'; mode: 'short'|'match'; seed?: number; deckOverrides?: CardId[][] }
  | { type: 'FLIP' }
  | { type: 'STEER'; handIndex: number }
  | { type: 'BANK' }
  | { type: 'NEXT_DEAL' };              // Match only, after dealOver
```

Pure helpers:
- `applyCard(S, W, v): null | { S, W, g, swung }`, exactly as §4.2;
- `legal(deal)`, per §4.1;
- `pSnap(S, deckRemainder)` and `pSwing(...)` (D6) for optional UI hints.

Reducer:
- Validate each action against `legal`.
- `FLIP`/`STEER` → `applyCard` → Snap or placement (§4.3/§4.4).
- `BANK` per §4.5.
- After a Swing ends:
  - if `pos === 40`, the deal ends (`dealTotals.push(T)`, status `dealOver`, or `gameOver` for Short or after deal 3);
  - otherwise reset S, W and pot.
- The forced first Flip may be auto-dispatched by the UI or required as a click (see §12).

## 11. UI notes (hidden vs public)

- **Public:**
  - Hand (face up), Pot, discard pile;
  - S coin on a −10…+10 strip, W track 0–5, P, current bank value P×(1+W);
  - T and M, and the deck count.
- **Deck composition** is public by deduction (40 minus the visible cards). Showing exact P(Snap)/P(swing) from D6 is consistent with the rules.
- **Hidden:** the deck order only.
- **Suggested displays (not rules):**
  - each Hand card's Steer result (swing / discard / snap, and the W gain);
  - "next Flip: snap x/N, swing y/N";
  - an animation for a caught card.

## 12. Discrepancies and unspecified points

**Doc vs code (rules):** none. design-v6 D1–D5 and `sim_v6.play()` agree.

Non-rule discrepancies to be aware of:
1. `replay_H()` in sim_v6.py is still the **obsolete v5** script, ending at T = 456. Do **not** use it as a v6 fixture. The v6 §H line (T = 534) is verified separately, and the script is given in §13.
2. Design §H's "EV1" numbers use the v5 one-step-EV form (every card adds its rank to P). The v6 form is in D6. EV is a decision aid only, never a rule.

**UNSPECIFIED — builder must decide:**
- **Default mode** (Short vs Match). The doc recommends the Short game for a first play and calls the Match the official game. *Suggestion:* a mode picker, defaulting to Short for new players.
- **Forced actions** (first Flip of a Swing; Bank when deck and hand are empty): click or automatic. *Suggestion:* auto-perform with a visible animation.
- **Odds/EV helper** visibility. *Suggestion:* show snap/swing counts behind a toggle; never show EV as advice.
- **Per-deal seed derivation** in a Match. *Suggestion:* given in §8.

## 13. Acceptance tests

`applyCard` unit tests (from `sim_v6.unit_checks`):

| # | (S, W, v) | Expected (S′, W′, g, swung) |
|---|---|---|
| O1 | (7, 0, −9) | (−2, 2, 2, true) |
| O2 | (7, 0, −7) | (0, 2, 2, true): landing on 0 is a swing |
| O3 | (0, 2, −4) | (−4, 2, 0, false): from 0 never swings |
| O4 | (2, 0, −10) | (−8, 0, 0, true): +0 swing |
| O5 | (9, 0, −10) | (−1, 3, 3, true) |
| O6 | (6, 4, −10) | (−4, 5, 1, true): cap |
| O7 | (9, 5, −10) | (−1, 5, 0, true) |
| O8 | (5, 0, +6) | SNAP |
| O9 | (5, 0, +5) | (10, 0, 0, false): 10 is safe |
| O10 | (−10, 0, +10) | (0, 3, 3, true) |
| O11 | full 40-card deck, S = s (1..10) | P(snap) = s/20, P(swing) = (11−s)/20; mirrored for −s |

Engine and reducer tests:

| # | Given | Action | Expected |
|---|---|---|---|
| O12 | Swing start, pot empty | STEER or BANK | rejected; only FLIP is legal |
| O13 | Hand has 2 cards, S = +7, flip a −10 | FLIP | S −3, W 2, the card goes to the **Hand** (3 cards), P unchanged |
| O14 | Hand has 3 cards, swing flip | FLIP | the card goes to the **Pot** (P += rank) |
| O15 | S = 0, pot non-empty, Steer any card | STEER | the card is **discarded**; W unchanged |
| O16 | S = +3, W = 2, steer −3 | STEER | S 0, W 3, the card goes to the Pot |
| O17 | Pot P = 18, S = −7, flip −4 | FLIP | SNAP: the pot and card are discarded, T unchanged, Hand unchanged, new Swing (S 0, W 0) |
| O18 | deck empty, hand empty, pot non-empty | — | only BANK is legal |
| O19 | deck empty, a Swing ends | BANK | the deal ends; Hand cards score 0 |
| O20 | Seed-12 fixture, new deal | — | Hand {3♣, 3♥}, deck 38, T 0 |
| O21 | Seed-12 fixture, scripted v6 line below | — | Swing totals **192 / 210 / 132**, T = **534**, Hand {2♣, 9♠}, deck 18; next card 8♣ |

**O21 script (v6)**, per Swing. "F" = Flip, "S x" = Steer that card, "B" = Bank. The first F of each Swing is the forced one.

- **Swing 1:**
  - F 7♥ (0→+7)
  - F 10♠ (+7→−3, W 2, **caught**)
  - S 3♥ (−3→0, W 3, to Pot)
  - F 3♦ (+3)
  - S 3♣ (+3→0, W 4)
  - F 6♦ (+6)
  - S 10♠ (+6→−4, W 4→**5** capped)
  - B = **32×6 = 192**
- **Swing 2:**
  - F 5♣ (−5)
  - F 7♦ (−5→+2, W 1, caught)
  - F 2♣ (+2→0, +0 swing, caught)
  - F 2♥ (+2)
  - F 4♦ (+6)
  - F 6♣ (+6→0, W 3, caught; Hand full)
  - F 7♠ (−7, P 18)
  - S 7♦ (−7→0, W 5)
  - F 4♥ (+4)
  - S 6♣ (+4→−2, to Pot, P 35)
  - F 9♦ (−2→+7, +0 swing at W 5, **caught into Hand**)
  - B = **35×6 = 210** (T 402)
- **Swing 3:**
  - F A♦ (+1)
  - F 6♥ (+7)
  - F 2♦ (+9)
  - F 8♠ (+1, no swing)
  - F 5♥ (+6)
  - F 9♠ (+6→−3, W 2, caught)
  - F 2♠ (−5, P 24)
  - S 9♦ (−5→+4, W 3, P 33)
  - B = **33×4 = 132** (T **534**)

## 14. Reference simulation numbers

Source: `/workspace/cardlab/experiments/CGL-20261029-23/report-v6.md` (2000 deals, seeds 2026160000–2026161999; Match = 666 three-deal Matches):

| Strategy | Short-game mean | Win ≥500 / Masterful ≥800 |
|---|---|---|
| Random | 165.9 | 0.10% / 0% |
| BestThreshold (best of 20 fixed rules) | 401.4 | 26.50% / 1.80% |
| Adaptive | 459.1 | 38.40% / 3.05% |
| **Strategic_d3** | **604.8** (median 608.5, SD 207.4) | **69.40% / 17.30%** |

Match (Strategic_d3): mean **1814**, Win ≥1500 **82.28%**, Masterful ≥2100 **21.17%**.