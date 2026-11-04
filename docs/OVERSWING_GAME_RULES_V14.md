# OVERSWING — Game Rules, Mechanics & Content Reference

**Implementation reference:** `umuterturk/card-game-lab`, `main` at tree/commit `4775ece5e9177a56fc9b48f4b813127052ea8972`  
**Reviewed:** 4 November 2026  
**Rules engine:** Overswing **v14** (`newOverswing().version === 14`)  
**Coverage:** actual source-code behavior of the campaign, quick modes, economy, Royal cards, relics, Tactics, reveals, scoring, and player-facing controls. This is **not** a design proposal. Where an interface description and the engine differ, the engine is authoritative.

> **Key distinction:** **Gate score** is collected immediately when BANK succeeds, but that gate's score is credited to **spendable Treasury Gold only if the entire gate passes**. A failed gate does not award that gate's provisional BANK total.

## 1. The game in one minute

Overswing is a single-player push-your-luck card game. Every card has a numerical value and moves a pendulum: **red = positive/right**, **black = negative/left**. You build a **Pot** of unbanked card points while accumulating three multipliers: **SWING**, **FLIP**, and **JACKPOT**. You may risk another card to improve the payout or **BANK** the Pot before an excessive move causes a **SNAP**.

Campaign progression has **12 levels**, each containing **3 gates** (36 gates in total). The player fights a named opponent at each level. A gate is passed only when the full deal ends and its total BANKed score meets or exceeds the gate target. Gate 3 is always a boss; each SNAP raises the boss target by **200**. The campaign changes starting hand size, pendulum bounds, maximum FLIPs, and BANK tax as the levels progress.

A typical gate: start with an ordinary hand → use **FLIP** (unseen deck draw into Pot) or **STEER** (chosen hand card) → build multipliers and Pot → **BANK** → repeat until the ordinary cards are exhausted → pass or fail. Royals, paid relics and consumable Tactics add options; they do not replace the core risk-versus-bank decision.

## 2. Exact core numbers

| Element | Implemented value |
|---|---|
| Ordinary ranks | Ace (1) through 10: **10 ranks per suit** |
| Ordinary suits | ♥, ♦, ♠, ♣: **4 suits** |
| Ordinary deck with no Royals | **40 cards**, each unique |
| Physical card pool with `N` equipped Royals | **40 total** = `40 − N` ordinary deck cards + `N` reserved Royals |
| Starting hand / refill capacity | **8** normally, **7** on level 2, **6** on levels 6, 10 and 12 |
| Minimum capacity after BANKs | **2** |
| Ordinary deck used for FLIP | **40 − N** cards, including opening hand, where `N = 0..3` |
| Initial unseen deck cards after hand dealt | `40 − N − initialHandSize` |
| Default pendulum bound | **−10 through +10**, inclusive |
| Restricted bounds | **±9** (levels 3 and 10); **±8** (levels 7 and 12) |
| FLIP cap | None normally; **18** (level 4), **14** (levels 8 and 11), **12** (level 12) |
| Base BANK tax | **0%**; level-specific **5%**, **10%**, **15%** as below |
| First BANK eligibility | Pot nonempty and **at least 2 FLIP/STEER card actions** since previous reset; special end-of-deck exception applies |
| Hand-cap cost of BANK | **−1** slot, unless the first BANK is protected by Vault Seal; never below **2** |
| Standard maximum consecutive Royal SUMMONs | **1**; **2** with Herald; engine supports validation up to **3** but no current content grants 3 |
| Maximum Tactics per gate | **2 different types**; each type at most once per gate |
| Paid relics | **One choice from 3 offers** before each gate, or skip |
| Royal purchase prices | **40,000 / 100,000 / 180,000 Gold** for J / Q / K |
| Replay prices | **100% / 150% / 200%** of that gate's base target, nearest 10 Gold |
| Paid replays per failed gate | Up to **3**; initial attempt + 3 purchased retries |
| Max same-suit Resonance bonus per swing | **+6 base Pot points** (earned in +2 increments) |
| King Crown at summon | **+100%** BANK bonus, decays **10 percentage points per FLIP/STEER** |
| Boss SNAP penalty | **+200 required score per SNAP**, including shield-protected SNAPs |

The game does **not** currently have progressive BANK tax based on the number of BANKs. `bankCount` is tracked, but a level's configured tax percentage applies equally to each BANK at that level.

## 3. Cards, hand, deck and discard

### 3.1 Ordinary cards

Card IDs `0..39` encode rank and suit. IDs `0..9` are Hearts, `10..19` Diamonds, `20..29` Spades, and `30..39` Clubs. Within each suit, the card's rank is `(id % 10) + 1`. **A = 1**; there are no ordinary Jack, Queen, or King cards.

| Suit | Color | Pendulum move for rank `r` | Examples |
|---|---|---|---|
| ♥ Hearts | Red | `+r` | A♥ = +1, 10♥ = +10 |
| ♦ Diamonds | Red | `+r` | 3♦ = +3 |
| ♠ Spades | Black | `−r` | 8♠ = −8 |
| ♣ Clubs | Black | `−r` | 10♣ = −10 |

Ordinary card movement and base Pot value are separate notions: a black 8 moves **−8** but contributes **+8 points** when deposited in the Pot.

### 3.2 Royal replacement and initial draw

The game shuffles 40 ordinary cards. When `N` Royal ranks are equipped (`N ≤ 3`), it removes the **first N ordinary cards of the shuffled sequence**, then uses the remaining `40−N` ordinary cards as the deal deck. The N Royal cards are held in a **separate reserve queue**, not mixed into that deck. Those removed ordinary cards are not playable in this gate. Physical card count is therefore still 40.

The initial hand draws the first **8, 7, or 6** cards from the reduced ordinary deck, according to the level. Royals **never appear in the opening hand** and **never appear as ordinary FLIPs**. The remaining ordinary cards are an unseen but deterministic deck.

For example, with all three Royals equipped on a standard level: **37 ordinary cards**, an opening hand of **8**, **29 unseen ordinary cards**, and **3 Royals waiting in the summon queue**.

### 3.3 Refill: precise trigger

The hand **does not refill after BANK**. After **any completed legal action**, the engine attempts an automatic ordinary refill, but only when **all three** conditions hold:

1. There is at least one ordinary card remaining in the deck.
2. There is **no ordinary card left in hand**.
3. The hand contains **zero or one** card (a single Royal may be preserved).

The engine then draws ordinary cards until reaching the current hand capacity or running out of ordinary cards. A refill increments the `ordinaryRefills` counter. A reduced hand capacity from BANK persists for the rest of that gate.

If the hand contains **two or more Royals**, refill is blocked; the **CARRY** choice resolves this. A hand with even one ordinary card remaining does not automatically top up. FLIP draws go **directly to the Pot**, not to the hand.

### 3.4 Card destinations

Cards may be in the **hand**, **unseen ordinary deck**, **Pot**, **discard**, or **Royal reserve**. A safe FLIP goes to the Pot. A safe STEER may go to the Pot or discard depending on the rules below. A SNAP discards its offending card and (unless protected) the Pot. A BANK discards the Pot after scoring. Summoning moves one Royal from reserve to hand without drawing from the ordinary deck.

## 4. Pendulum and failure rules

Define `S` as the current pendulum position (starts at `0`). A normal card action resolves `nextS = S + movement`.

- **Safe:** `−limit ≤ nextS ≤ +limit`. Touching the boundary is safe; passing it is not.
- **SNAP:** `abs(nextS) > limit`. The move fails, the offending card is discarded, the pendulum resets to `0`, and the current swing ends. The Pot is lost unless an Ember Shield is protecting a FLIP SNAP. Normal SNAP does **not** reduce hand capacity.
- **Strict zero crossing (SWING):** `S != 0`, `nextS != 0`, and their signs differ. Crossing from `+5` to `−3` qualifies; moving from `0` to `−3` does not.
- **ZERO BREAK:** previous `S != 0` and `nextS == 0`. The move is safe and may deposit the card, but **all three multipliers reset to ×1**. The Pot is retained. It grants no crossing bonus.

The default limit is ±10. Certain campaign levels restrict it to ±9 or ±8; the limit applies to ordinary and Royal actions alike.

### 4.1 SNAP with and without Ember Shield

**Unprotected SNAP:** current Pot cards and their Resonance are discarded; SWING, FLIP, JACKPOT, flip streak, position and card-action count are reset. Previously BANKed gate score remains intact. The triggering card is also discarded. The remaining hand is not reset.

**Protected FLIP SNAP:** the triggering FLIP card is discarded, the **Pot and Resonance remain**, and position/action count/all multipliers reset. The Shield is consumed whether the next FLIP is safe or snaps. Boss SNAP counters **still increase** for protected SNAPs. Shield does not protect STEER SNAPs.

## 5. Actions: legality and resolution

### 5.1 FLIP — unseen risk

**Legal if:** at least one ordinary deck card remains and the level's `maxFlips` limit (if present) has not been reached. Hand fullness does **not** block FLIP.

**Resolution:** take the next ordinary card from the hidden deck; increment `flips` and `plays`; apply its signed movement. On success, **always deposit the card in the Pot**, including noncrossing and Zero Break FLIPs. On SNAP, discard the flipped card and apply SNAP rules. FLIP does **not** fill a hand slot or refill the hand.

Multiplier effects for a **safe** FLIP:

- **Strict crossing:** increases SWING by the crossing gain and **JACKPOT +1 tier** (`+2` instead of +1 on the first qualifying FLIP crossing with Jackpot Spark). It **does not increase FLIP**. It sets the active noncrossing FLIP streak to 0.
- **Noncrossing, nonzero:** reduces SWING by **1 tier** (minimum SWING ×1); advances consecutive noncrossing FLIP streak by 1; raises the FLIP factor to at least `streak + 1`. JACKPOT is unchanged.
- **ZERO BREAK:** card goes to Pot, then resets all multipliers and the streak; no new FLIP/JACKPOT tier remains.

A FLIP consumes one of a level's limited FLIPs even if it snaps.

### 5.2 STEER — choose a card from hand

**Legal if:** there is a card in hand. Tap the actual hand card; there is no separate STEER button. A standard card moves by suit sign; a Queen has special direction handling.

**Resolution:** remove the chosen card from hand, increment `plays`, apply pendulum movement and the STEER-specific scoring rule:

A **safe STEER enters the Pot** if **any** of the following holds:

1. It is the **first FLIP/STEER card action of the current swing** (`plays` was 0 before the action).
2. It causes a **strict crossing**.
3. It causes **ZERO BREAK**.

Otherwise a safe STEER goes **directly to discard** (no Pot points from that card). A STEER of an ordinary or Royal card also terminates the consecutive noncrossing FLIP streak, but **does not erase the already earned FLIP or JACKPOT factor**.

- Strict crossing: normal SWING gain; **no JACKPOT gain** from STEER. Swing Coil adds **+1 extra SWING tier** on its first qualifying STEER crossing.
- Noncrossing, nonzero: SWING loses **1 tier** (minimum ×1), unless Steady Hand's one free noncrossing STEER is still available.
- Zero Break: card is deposited, then all multipliers reset.
- SNAP: offending card goes to discard and the SNAP rules apply.

**ROYAL exception:** Playing the Queen chooses a ±12 move independent of card suit (details in section 8). Polarity Switch can reverse ordinary, Jack or King STEER movement, not Queen movement.

### 5.3 BANK — secure the current Pot

**Legal if:** the Pot contains at least one card **and** either:

- At least **2** FLIP/STEER card actions were completed since the last BANK/SNAP, **or**
- The ordinary deck is exhausted **and** there are no ordinary cards left in hand (this permits settling a final Pot even with fewer than 2 card actions).

SUMMON and CARRY do not count toward the two-card-action requirement.

A BANK:

1. Calculates payout from current Pot, Resonance and multipliers, optional held King bonus, then level BANK tax.
2. Adds the **net payout** to the current gate's **BANKed score `T`**.
3. Discards all Pot cards, resets pendulum position and SWING/FLIP/JACKPOT factors, Resonance, flip streak and `plays`.
4. Discards **all Kings held in hand**, if any, and clears the King bonus.
5. Normally reduces hand capacity by **1**, to a floor of **2**. The first BANK with Vault Seal leaves capacity unchanged; that relic's charge is then spent.
6. If remaining hand cards exceed the new capacity, asks the player to **select one non-King card to discard**. A King discarded during BANK may already free enough space, so a separate selected discard is not always necessary.
7. Leaves the rest of the hand unchanged. **No automatic refill is granted merely because of BANK**; the general refill rule runs afterward only if the hand is genuinely empty of ordinary cards.

Every BANK on a level is subject to that level's configured tax. There is currently **no rising tax per successive BANK**.

### 5.4 SUMMON — call a Royal

**Legal if all of the following are true:**

- The first ordinary hand refill has **already happened** (`ordinaryRefills > 0`), so SUMMON cannot be used in the entire opening hand, even after making a free slot.
- At least one Royal is waiting in the queue.
- The hand has an empty slot (`hand.length < handCap`).
- Consecutive SUMMON count is below **1 normally**, or **2 with Herald**.

SUMMON moves the **next preordered Royal** from its reserve into hand. It does **not** change pendulum position, Pot, BANKed score, ordinary deck position, `plays`, or `flips`. It **resets the active FLIP streak**, but preserves the already accumulated FLIP/JACKPOT factors. Summoning a King initializes Crown to +100%. The Royal gets its own visual flight and sound cue.

A FLIP, STEER, or BANK resets the consecutive SUMMON counter to zero. CARRY does not reset that counter in the current engine. Herald increases only the consecutive limit; it does not add Royals to the queue.

### 5.5 CARRY — resolve several held Royals

CARRY is offered only if ordinary cards remain in the deck and the hand consists of **at least two cards, all Royals**. Choose **one Royal to keep**; all other held Royals go to discard. The ordinary-refill rule then fills the hand from the ordinary deck around the kept Royal.

With **only one Royal** left in hand, that Royal is automatically carried during a normal refill. With **multiple Royals**, the player must choose; the engine does not silently pick one. CARRY is a hand-management action and does not itself move the pendulum or contribute card-action count.

## 6. Three multipliers and Resonance

### 6.1 SWING multiplier

The engine stores SWING as a nonnegative tier count `W`; the displayed factor is **`W + 1`**.

A strict crossing earns:

```text
SWING tiers gained = max(1, floor(abs(previous S) / 3))
```

For example, crossing from previous magnitude **1–5** earns **+1**, magnitude **6–8** earns **+2**, and magnitude **9–10** earns **+3**. A restricted pendulum can reduce the reachable maximum. Swing Coil can add another +1 on its first eligible STEER crossing.

A safe noncrossing, nonzero FLIP or STEER normally spends **1 SWING tier**, never reducing the factor below ×1. Strict crossings add tiers without an artificial maximum; the limit comes from available cards and the pendulum. ZERO BREAK, BANK and SNAP reset SWING to ×1.

### 6.2 FLIP multiplier

- Initially **×1**.
- Each **consecutive safe noncrossing, nonzero FLIP** grows a streak: first ⇒ **×2**, second ⇒ **×3**, third ⇒ **×4**, etc.
- The engine uses `flipFactor = max(existingFlipFactor, flipStreak + 1)`, so a new smaller streak does not erase an earlier, higher FLIP factor.
- A strict-crossing FLIP **resets the streak** and grows JACKPOT instead; a STEER or SUMMON also ends the streak, while retaining the earned FLIP factor.
- ZERO BREAK, BANK and SNAP reset the FLIP factor to **×1**.

There is **no separate hard-coded cap** on the FLIP factor; the finite deck and action availability constrain it.

### 6.3 JACKPOT multiplier

- Initially **×1**.
- Each **safe strict-crossing FLIP** increases JACKPOT by **+1**: ×2, ×3, ×4, etc.
- The first crossing FLIP with an unspent Jackpot Spark increases JACKPOT by **+2** instead of +1.
- STEER crossings do **not** increase JACKPOT; ordinary noncrossing FLIPs do not decrease it.
- ZERO BREAK, BANK and SNAP reset JACKPOT to **×1**.

### 6.4 Suit Resonance

When a **STEER card is being deposited into the Pot**, if it matches the **suit of the last existing Pot card**, add **+2** to `resonancePoints`, to a maximum of **+6 per swing**. Resonance is **base Pot value**, so all multipliers (and Crown, if any) act on it. Only deposited STEER cards can trigger Resonance: FLIPs do not generate +2 even if their suits match.

Resonance clears after BANK or unprotected SNAP. A protected SNAP keeps the Pot **and its Resonance**, despite resetting multipliers.

## 7. Scoring: exact formulas and example

Define:

- `cardSum` = sum of **positive rank values** of cards currently in Pot (A=1 ... 10; J=11, Q=12, K=13).
- `resonance` = 0, 2, 4 or 6 extra Pot points from same-suit STEER deposits.
- `SWING = W + 1`, `FLIP = flipFactor`, `JACKPOT = jackpotFactor`.
- `crownPct` = currently held King's percentage bonus (**0..100**) if a King is still in hand; otherwise 0.
- `bankTaxPct` = level tax (**0, 5, 10 or 15**).

The engine computes:

```text
basePot       = cardSum + resonance
multiplier    = SWING × FLIP × JACKPOT
basePayout    = basePot × multiplier
grossBank     = floor(basePayout × (100 + crownPct) / 100)
netBank       = floor(grossBank × (100 − bankTaxPct) / 100)
newGateScore  = previousGateScore + netBank
```

It uses **integer flooring** for gross and taxed BANK payout. Unbanked potential payout is not earned until BANK is successfully performed. The BANK tax is applied **after** the Crown bonus.

**Worked example, no Resonance/Crown/tax:**

1. Start at `S=0`, with all factors ×1.
2. FLIP `+3` → `S=+3`, Pot 3, **FLIP ×2**.
3. FLIP `+2` → `S=+5`, Pot 5, **FLIP ×3**.
4. STEER `8♠` (`−8`) → `S=−3`: strict crossing from magnitude 5 earns **+1 SWING tier** (= ×2); 8 enters Pot. Pot = `3+2+8 = 13`.
5. Current multiplier = **SWING ×2 × FLIP ×3 × JACKPOT ×1 = ×6**.
6. BANK earns **`13 × 6 = 78`** Gold/score for this gate, resets factors, and normally reduces hand capacity from **8 to 7**. It does **not** refill the hand.

**Crown/tax example:** Pot base 25, three factors product ×8, King Crown currently +70%, level BANK tax 10% → `gross=floor(25×8×1.70)=340`; `net=floor(340×0.90)=306`.

## 8. Royal cards — three permanent ranks, special rules

Royals are permanent **rank unlocks**, bought in the Market or awarded at milestone clears. You can own and equip up to **three distinct ranks** (`J`, `Q`, `K`); each equipped rank contributes **exactly one** Royal to each gate's reserve. Its **suit and position in the summon order are randomized once per new game** and reused for all three gates. They are **not placed in the starting hand**.

| Royal | Rank / Pot points | Core ability | Price | Free milestone |
|---|---:|---|---:|---|
| **J — The Scout** | **11** | STEER ±11 by suit; on a **successful** STEER, reveal the exact next FLIP card | **40,000** | First clear of **Level 1** |
| **Q — The Mirror** | **12** | STEER either **+12 or −12**, independent of suit; UI auto-selects safe direction or least-bad forced SNAP | **100,000** | First clear of **Level 4** |
| **K — The Melting Crown** | **13** | Keep in hand to BANK for up to **+100%**; alternatively STEER ±13 by suit | **180,000** | First clear of **Level 8** |

**J / Scout:** Playing J safely shows the **next actual ordinary FLIP card**, including a visible card face on the FLIP button. If an automatic hand refill consumes deck cards, the preview advances to the next remaining card. If there is no next deck card, there is nothing to show. The Scout does not change the next card or guarantee a safe outcome. J's suit determines whether its ±11 STEER moves right or left.

**Q / Mirror:** The engine represents Q as either `+12` or `−12`. The UI first evaluates both options. If one is safe, it plays it automatically. If neither is safe, it automatically uses the direction producing the **smallest absolute overshoot**; a tie chooses `+12` for a red Queen and `−12` for a black Queen. A resulting forced SNAP still loses the Pot normally. With the currently allowed pendulum limits (±8, ±9, ±10), **both ±12 options cannot be safe simultaneously**, so the manual direction dialog is effectively unreachable in normal campaign rules. Q still has a suit for card identity and Resonance.

**K / Crown:** Summoning K starts a **+100% BANK bonus**. For every subsequent **FLIP or STEER card action while K remains held**, the bonus decays by **10 percentage points**, down to zero; at zero, the King automatically goes to discard. SUMMON/CARRY/BANK do not advance the decay clock. BANK applies the *current* bonus only if K is **still in hand** at payout time, then consumes/discards K. If K is STEERed, its Crown bonus is no longer available for that BANK; its ordinary suit determines a risky ±13 move, and a safe qualifying STEER can deposit **13** Pot points.

**Ownership is not wealth-threshold-based.** Simply accumulating 40k/100k/180k Gold does **not** automatically unlock a Royal. The live conditions are **purchase** or **specified level-clear milestone**. Royal ownership does **not** increase target scores.

## 9. Relics — offers, prices, charges

A **relic shop appears before every gate, including Gate 1** of a new prepared run. Exactly **3** relics are offered, selected reproducibly from the eligible pool. Buy **at most 1** for the next gate, or **fight without a relic**. A purchased relic is **not carried forward** to the next gate. It can be offered and purchased again on another gate.

The offer pool consists of **4 normal relics**, plus **Herald** only when **at least 2 Royal ranks are equipped**. The purchase price is identical for every offered relic in a given gate:

```text
relicPrice = max(10, roundToNearest10(0.20 × gateBaseTarget))
```

For level 1, prices are **160** (Gate 1), **360** (Gate 2), **600** (Gate 3). Prices increase with level target scaling. `gateBaseTarget` excludes boss SNAP penalties.

| Relic | Exactly what it changes | Duration / use limit |
|---|---|---|
| **Steady Hand** | Prevents the normal **−1 SWING tier** on a noncrossing, nonzero STEER | **First qualifying STEER** of this gate only |
| **Jackpot Spark** | First safe crossing FLIP grants **+2 JACKPOT tiers** instead of +1 | **First qualifying FLIP crossing** of this gate only |
| **Vault Seal** | Prevents the usual **−1 hand capacity** from BANK | **First BANK** of this gate only |
| **Swing Coil** | First safe crossing STEER earns **+1 additional SWING tier** | **First qualifying STEER crossing** of this gate only |
| **Herald** | Raises the consecutive Royal SUMMON limit **1 → 2** | **Whole current gate**; no one-charge trigger; only offered with ≥2 equipped Royal ranks |

A relic's charge remains available until the qualifying event occurs or the gate ends. Replaying that **same gate** restores the purchased relic and its unused charge without charging for it a second time. A new gate resets relic selection and charges.

## 10. Tactics / Wild cards — consumables

The Market sells three kinds of reusable-inventory, **consumable** Tactics. You may use **at most two different kinds per gate**. The same kind cannot be used twice within the same gate, even if inventory contains multiple copies. The next gate starts with a fresh `wildUsedIds` list.

| Tactic | Market price | Requirements | Actual effect |
|---|---:|---|---|
| **Wild Shuffle** | **400 Gold** | At least 1 ordinary hand card **and** at least 1 unseen ordinary deck card | Combines ordinary hand cards with the unseen deck, deterministically shuffles the pool, replaces the ordinary hand cards and updates remaining deck order. Royals stay in place; no cards created/destroyed. |
| **Polarity Switch** | **650 Gold** | At least 1 playable ordinary card, J or K in hand | Choose one qualifying hand card; **reverse its sign and immediately STEER it**. Q is excluded. The STEER may cause crossing, Zero Break, or SNAP. |
| **Ember Shield** | **900 Gold** | A FLIP must currently be legal | Arms the **next FLIP only**. If it snaps, Pot/Resonance survive and multipliers reset. If safe, the Shield is nevertheless consumed. It does not stop a boss SNAP penalty. |

Tactics are purchased **outside active runs** in the Market and carried in persistent inventory. Using one spends one inventory unit. On buying a replay after a failed gate, Tactics **consumed in that failed attempt are refunded**, so the player can retry with the same inventory; the new attempt resets the per-gate two-different-Tactics limit. A Tactic reward is offered **once per location's first successful clear**: choose **one of the three types** for **+1 inventory**, with no bonus Gold.

## 11. REVEALED — paid knowledge of remaining deck

During a gate, **REVEALED** lets the player purchase the identities of **all currently unseen ordinary deck cards** for that gate, exactly **once per gate**. It shows the cards **sorted by rank then suit**, **not their future draw order**. Cards already drawn disappear from the reveal list. It cannot identify the immediate next FLIP without the separate Scout ability.

If `count` cards are unseen and the ordinary deck has `totalDeckSize` cards (`40−N` with N Royals), the price is:

```text
scarcity    = 1 − count / totalDeckSize
rawPrice    = 400 + 8 × count + 650 × scarcity + 1100 × scarcity^4
revealPrice = ceil(rawPrice / 5) × 5
```

Example prices for a full **40-card ordinary deck**: **720 Gold** with 40 cards unseen, **955** with 20, **1,320** with 10, **1,655** with 5, and **2,040** with 1. The formula uses `totalDeckSize=37`, for example, if three Royals replace three ordinary cards.

The paid reveal entitlement is **preserved across a purchased replay of that same gate** and is **not charged again**; the displayed revealed identities reset to the corresponding unseen cards in the identical restarted deck. Buying a new gate reveal requires a separate payment. Reveals do not modify deck ordering.

## 12. Campaign — complete level rule and target table

The campaign contains **12 sequential locations**, and every location has the same named three gates: **Ash Gate**, **The Furnace**, and **Ember Keeper**. Each location has a unique opponent portrait/name. Base gate targets are **800 / 1,800 / 3,000**, each scaled by:

```text
levelScale       = 1 + 0.015 × (levelNumber − 1)
baseGateTarget   = round(baseTarget × levelScale)     // bases: 800, 1800, 3000
bossTargetNow    = baseGateTarget + 200 × bossSnaps   // Gate 3 only
```

There is no score increase merely because Royals are owned. **Values in parentheses below are relic prices for that gate**, calculated at 20% of target and rounded to nearest 10.

| Level and location | Special rules (in addition to defaults) | Scale | Gate 1 target (relic) | Gate 2 target (relic) | Boss target (relic) |
|---|---|---:|---:|---:|---:|
| **1. First Ember** | Standard: hand 8, ±10, unlimited FLIPs, tax 0% | 1.000 | 800 (**160**) | 1,800 (**360**) | 3,000 (**600**) |
| **2. Short Fuse** | Hand **7** | 1.015 | 812 (**160**) | 1,827 (**370**) | 3,045 (**610**) |
| **3. Narrow Path** | Limit **±9** | 1.030 | 824 (**160**) | 1,854 (**370**) | 3,090 (**620**) |
| **4. Flip Discipline** | Max **18 FLIPs** | 1.045 | 836 (**170**) | 1,881 (**380**) | 3,135 (**630**) |
| **5. Toll Bridge** | BANK tax **5%** | 1.060 | 848 (**170**) | 1,908 (**380**) | 3,180 (**640**) |
| **6. Tight Grip** | Hand **6** | 1.075 | 860 (**170**) | 1,935 (**390**) | 3,225 (**650**) |
| **7. Iron Walls** | Limit **±8** | 1.090 | 872 (**170**) | 1,962 (**390**) | 3,270 (**650**) |
| **8. Scarce Chances** | Max **14 FLIPs** | 1.105 | 884 (**180**) | 1,989 (**400**) | 3,315 (**660**) |
| **9. High Toll** | BANK tax **10%** | 1.120 | 896 (**180**) | 2,016 (**400**) | 3,360 (**670**) |
| **10. Fire Cage** | Hand **6**, limit **±9** | 1.135 | 908 (**180**) | 2,043 (**410**) | 3,405 (**680**) |
| **11. Final Wager** | Max **14 FLIPs**, tax **10%** | 1.150 | 920 (**180**) | 2,070 (**410**) | 3,450 (**690**) |
| **12. Last Light** | Hand **6**, limit **±8**, max **12 FLIPs**, tax **15%** | 1.165 | 932 (**190**) | 2,097 (**420**) | 3,495 (**700**) |

Rules that are not explicitly changed by a level retain their defaults (8-card hand, ±10 limit, no FLIP cap, 0% BANK tax). **All three gates of a given level share its level modifiers.** The level rule sheet is shown before entering the gate and in the active-game UI.

### 12.1 Boss SNAP target tax

Only **Gate 3 (Ember Keeper)** has this objective. Every SNAP in that attempt adds **200** to the required final score. Example: Level 1 boss starts at 3,000; after 1 SNAP it requires **3,200**, after 2 **3,400**, after 3 **3,600**. This applies even when Ember Shield saved the Pot. The SNAP count resets on a replay.

### 12.2 Gate completion, failure and map unlocks

A gate does **not** end immediately on reaching target. The current deal ends when the ordinary deck is exhausted, **no ordinary hand cards remain**, and the Pot is empty. If only Royals remain, the game can finish and discard those Royals/queue; the player is **not forced** to STEER a Royal into a certain SNAP. A final Pot can still be BANKed under the end-of-deck exception.

At deal completion, `finalScore = total BANKed gate score`. The engine checks `finalScore >= effectiveTarget` to pass. Passing Gate 1 or 2 credits the gate's score to Treasury and opens the relic shop for the next gate. Passing Gate 3 completes the level; a first clear also offers one free Tactic choice. Failing any gate presents a retry-or-defeat screen; future locations stay locked until preceding locations are cleared. Previously cleared locations can be replayed.

## 13. Retries, random seeds and replay fairness

Each prepared run starts with a fresh **run seed**, a separate **Royal seed**, and independent per-gate deck/relic-offer seeds. The game-wide Royal seed fixes the **rank-to-suit assignment and summon ordering for all three gates** of that run. The ordinary deck is seeded separately for each gate. This makes learning the Royal order across gates possible without making ordinary decks identical.

**Retrying a failed gate:**

- Offers **three purchases** at **1×**, **1.5×**, and **2×** the **base (pre-boss-penalty) gate target**, rounded to the nearest **10** and floored at 10.
- Example for Level 1 Gate 1: **800 / 1,200 / 1,600 Gold**. Level 1 boss: **3,000 / 4,500 / 6,000 Gold**, even if SNAPs made the failed target higher.
- Restarts the **exact same ordinary deck and opening hand** and the **same Royal reserve/order/suits**. Boss SNAP counter and gate score reset to their starting values.
- Keeps the paid relic for that gate, resets its charges, retains any paid REVEALED entitlement without a second charge, and refunds Tactics spent in the failed attempt.
- Deducts replay price from persistent spendable Treasury. The failed attempt's BANKed score is **not** credited as Gold.
- After the third purchased retry has failed, there is no fourth purchase; accept defeat / return to map.

**Preparing a new run:** starts with a **new run seed** (`Date.now()` in the UI), reassigns Royal suits/order, reshuffles gate decks/offers, and settles the previous run's already-passed-gate earnings and purchases exactly once. Preparing a new level with an active run **resets/abandons** it; **Resume** returns to the saved run rather than reseeding. Thus a **paid gate retry is fixed-seed**, whereas a **new game is reseeded**.

## 14. Economy and saved progression

The persistent Gold field is called `lifetimeGold` in the profile, but in the live schema it acts as the **spendable Treasury balance**—not an untouchable total-history statistic.

| Event | Spendable Treasury effect | Other consequences |
|---|---|---|
| BANK during a gate | **No immediate Treasury credit** | Adds net BANK points to provisional gate score `T` |
| Pass a gate | **+final BANKed gate score** | Unlocks next gate or clears level |
| Fail a gate | **+0** from that gate | Retry offer; prior passed gates remain credited |
| Buy relic for next gate | **−20%-priced relic cost** | One gate only |
| Buy gate retry | **−100%/150%/200% gate target** | Same deck/relic/Royals; consumed Tactics refunded |
| Buy REVEALED | **−dynamic reveal price** | Knowledge for that gate and its retries |
| Buy permanent Royal | **−40k/100k/180k** | Permanently owned and auto-equipped if a slot is available |
| Buy Tactic | **−400/650/900** | +1 of that Tactic to inventory |
| First clear of a level | **No separate bonus Gold** | Choose **+1 Tactic**; specified levels also award a Royal rank |

The player may equip/unequip owned Royals in the Market when no journey is active; up to three distinct ranks can be equipped. Purchases are disabled during an active run, including the between-gate and retry phases. Local saves hold the current run, cleared levels, Treasury, Royal ownership/loadout, Tactic inventory, and achievements. Separate local storage holds music preferences. The UI reports a warning if local storage cannot be written. There is **no account-based cross-device progression sync** in this code.

Milestone Royal unlocks are **Level 1 → J**, **Level 4 → Q**, **Level 8 → K** after successfully completing that level; they do not require spending Gold. They are granted permanently if not already owned. Other levels grant no Royal rank.

## 15. Alternate modes and tutorial

The main campaign uses `mode='short'` for each gate and **v14** engine rules plus campaign modifiers. Separate Quick Play/Training access offers:

- **QUICK:** one 40-card deck, default 8-card hand, ±10 limit, no campaign target or Treasury rewards, no equipped Royals, and no campaign items unless explicitly injected by code.
- **3 DECKS / MATCH:** plays **three successive shuffled ordinary decks**; each new deck starts fresh with 8 hand slots and factors at ×1. The final displayed score is the sum of the three completed deck totals.
- **TRAIN:** a fixed 40-card teaching deck and **10 guided card-action steps**, demonstrating FLIP, the noncrossing streak, STEER crossing, STEER cost, Jackpot, BANK, Zero Break and SNAP. The tutorial hides nonmatching actions until the correct step. It begins with a glossary for FLIP, STEER, Pot and Score.

The default Quick UI uses the same engine but is separate from the persistent campaign economy. The main campaign gate target is not an instant-win condition for Quick mode.

## 16. Player-visible systems and feedback

**Game HUD:** current level/gate and target; current BANKed gate score; Pot points; current combined multiplier and hypothetical BANK payout; pendulum position and level-specific SNAP bound; visible hand and locked slots; unseen ordinary deck count; FLIP, optional SUMMON and BANK buttons; three Tactic buttons; REVEALED control; factor help; rules; settings.

**Hand and animations:** Up to **8** displayed slots; closed slots marked with an ×. Hand card labels indicate likely Pot/Discard/SNAP, Zero Break or Royal ability. FLIP/STEER cards animate to Pot or discard; Royal SUMMON has a longer portal/flight animation and a distinct sound; BANK displays a coin shower; Pot loss uses a fracture effect. The visual animation is presentation only: the engine updates state immediately, independent of animation timing.

**Idle prompt:** the actionable controls use a heartbeat/glow hint after **5 seconds** without interaction and repeat while idle (suppressed during dialogs/inactive screens). It is a UI hint only, not an action timer.

**Music and sounds:** There are **16** original synthwave tracks and **3** original procedural horror/thriller tracks (The Knock, Corridor Chase, Dead Frequency). The player can choose theme, an individual track, or automatic per-gate selection. The two sound sliders range **0–100**, stored independently; defaults are **25% music** and **50% sound effects**. Sound requires a user gesture to unlock; the audio engine is designed not to initialize while both sliders are 0.

The four synthwave groove tempos are **60, 82, 108, 132 BPM**; thriller grooves use **92, 112, 136, 158 BPM**. Music tension depends **only** on the fraction of gate target already BANKed, remaining ordinary deck-plus-hand cards, and the ordinal gate difficulty (1..36). It does **not** use pendulum position, current Pot, SNAP count or multipliers. When BANKed score reaches the target, tension returns to **0.06**. Exact tension function for an unfinished gate:

```text
progress    = clamp(gateBankedScore / currentTarget, 0, 1)
depletion   = 1 − clamp((ordinaryDeckUnseen + currentHandCount) / 40, 0, 1)
levelFactor = clamp((gateOrdinal − 1) / 35, 0, 1)
tension     = roundTo3Decimals(clamp(0.06 + 0.42×progress + 0.39×depletion + 0.13×levelFactor))
```

**Offline packaging:** the repository has a standalone Overswing build, web-app manifests, service worker/offline verification scripts, and CrazyGames ZIP packaging. These are delivery features, not rule modifiers. The rules are implemented locally in JavaScript and do not rely on an online gameplay server.

## 17. Important edge cases and implementation observations

These statements are intentionally specific because they are easy to misunderstand in play or in future design documents:

1. **BANK never refills by itself**; it can *incidentally* be followed by the normal empty-hand refill check if the hand has no ordinary cards. A partially used ordinary hand does not top up.
2. **A crossing FLIP grows JACKPOT, not FLIP**, even if a large FLIP factor was earned earlier. It does grow SWING.
3. **ZERO BREAK is not a SWING crossing**. Pot is retained; all multipliers reset.
4. **Entering ±limit is safe; exceeding it snaps**. This matters when using J (±11), Q (±12) and K (±13).
5. **Bank capacity bottoms out at 2**. Repeated BANKs do not raise tax beyond the level's fixed percentage.
6. **Royal summons cannot happen during the opening hand**, even if it has empty slots; an actual ordinary refill must happen first.
7. **Royals replace ordinary cards**. Three equipped Royals mean a 37-card ordinary deck, not a 43-card game.
8. **King's bonus is contingent on still holding K at BANK**. Playing K for 13 Pot points sacrifices Crown. A King discarded by BANK may eliminate the need to discard any additional hand card.
9. **A Shielded SNAP still makes the boss harder**. The shield protects the Pot, not the target.
10. **Relics do not persist across gates**; Tactic inventory and permanent Royal ownership do. Paid retries keep/refund appropriate resources.
11. **All three gates share one Royal seed** but each gate uses its own ordinary deck seed. A new run reseeds; buying a retry does not.
12. **Revealed shows identities, not order**. Only successful Scout J STEER can reveal the precise next FLIP.
13. **The Queen's manually chosen direction panel is effectively unnecessary** with the current limits: with ±12 movement and a limit no greater than 10, both directions can never be safe simultaneously; one safe or zero safe is auto-resolved by the UI.
14. **Current quick-save discrepancy:** `ExternalPlay.jsx` restores an Overswing quick-mode save only when `saved.version === 13`, but `newOverswing` now creates `version: 14`. This appears to prevent new v14 Quick/Match sessions from resuming after reload. Campaign storage uses a separate v14-aware restore path and is not subject to this particular check.
15. **Herald copy discrepancy:** `OverswingGateBriefing.jsx` provides compact labels for the four other relics but not for Herald. Herald's full effect exists in the mechanics; its compact shop description may be blank.

The last two are **source-observed implementation discrepancies**, not game rules. No live browser runtime test or simulation was executed for this document; the findings are from the reviewed source and existing test assertions.

## 18. Code traceability (exact source locations)

- **Core deck, move legality, scoring, Pot, swing, BANK, SUMMON, refill, completion:** [`src/external/engines.js`, lines 35–335](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/engines.js#L35-L335).
- **Gate journey, relic offers, prices, retries, inventory use, Gold ledger, Royal milestones:** [`src/external/overswingJourney.js`, lines 8–517](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingJourney.js#L8-L517).
- **Royal ranks, ±12 Mirror auto-direction, 100% King / 10-point decay, Royal seeding:** [`src/external/overswingRoyals.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingRoyals.js).
- **Tactics and Shuffle algorithm:** [`src/external/overswingWilds.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingWilds.js).
- **12 level constraints and 1.5%-per-level scaling:** [`src/external/overswingCampaign.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingCampaign.js).
- **Three gates and five relic definitions:** [`src/external/overswingJourneyContent.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingJourneyContent.js).
- **Reveal formula and one-purchase eligibility:** [`src/external/overswingReveal.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingReveal.js).
- **Active-game controls, Queen safe-direction behavior, hand slots, HUD and action labels:** [`src/external/OverswingPlay.jsx`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/OverswingPlay.jsx).
- **Market prices and ownership controls:** [`src/external/OverswingMarket.jsx`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/OverswingMarket.jsx).
- **Campaign UI, persistence, PREPARE/RESET/RESUME, seeded music:** [`src/external/OverswingJourney.jsx`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/OverswingJourney.jsx).
- **Audio options, groove tempos, tension calculation:** [`src/external/overswingSoundPreferences.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingSoundPreferences.js), [`overswingGrooves.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingGrooves.js), [`overswingThriller.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingThriller.js), [`overswingTension.js`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/src/external/overswingTension.js).
- **Tests supporting key edge cases:** [`tests/overswing.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/tests/overswing.test.mjs), [`tests/overswing-mechanics-v14.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/tests/overswing-mechanics-v14.test.mjs), [`tests/overswing-royals.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/tests/overswing-royals.test.mjs), [`tests/overswing-gate-relics.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/tests/overswing-gate-relics.test.mjs), and [`tests/overswing-wilds.test.mjs`](https://github.com/umuterturk/card-game-lab/blob/4775ece5e9177a56fc9b48f4b813127052ea8972/tests/overswing-wilds.test.mjs).

---

**Interpretation rule:** this reference records the rules implemented at the source snapshot above. It intentionally distinguishes player-facing mechanics from exploratory ideas, obsolete specifications, and possible UI bugs. Update this document whenever the gameplay engine, campaign content, or Market prices change.