# Card Game Lab — Experiment 013: GLASSFIRE

**Experiment ID:** CG-20261030-013  
**Local timestamp:** 2026-10-30 13:47 TRT (Europe/Istanbul)  
**Verdict:** REVISE — mechanically playable, strategic advantage demonstrated, replayability and originality unproven.

## Executive summary

GLASSFIRE is a one-kiln solo card game. You feed numbered heat cards into a kiln, sell the accumulating value by discarding a hand card, or spend a scarce Spark to draw an unseen card. A Fire succeeds only if total heat lands in the inclusive 7–10 window. Success triples the entire unbanked pot; failure shatters it. The finite 24-card deck and four Sparks create a resource budget.

In the final version, six fixed policies completed 2,000 identical shuffled-deck seeds each (12,000 games). Adaptive averaged **160.61** versus conservative **102.71**, aggressive **96.55**, and random **86.46**. Adaptive beat conservative in **1,854 of 2,000** matched games, tied five, and lost 141. The paired mean advantage was **57.90 points** (approximate 95% CI **56.27–59.54**). This is evidence of strategic influence, not a measured 80/20 skill/luck split.

The two redesigns removed redundant parallel kilns and made selling consume a hand card. The remaining concern is that skilled play may become a repetitive cycle of preparing heat 4–6 and firing at favorable odds. Similar mining-themed push-your-luck games already exist; no commercial originality claim is made.

## Designer: full final rules

**Components:** 24 numbered cards (four each of 1, 2, 3, 4, 5, 6), one kiln with heat capacity 10, a visible three-card hand, four Spark tokens, a permanent score, and an unbanked kiln pot.

**Setup:** Shuffle the 24-card deck uniformly; draw three cards into the hand. Set kiln heat, kiln pot, permanent score, and used Sparks to zero. The other 21 cards are the face-down draw pile. Discarded cards are visible and never reshuffled.

**Actions (choose one per turn):**

1. **FEED:** Choose a card from your hand. Add its number to the kiln heat, only if the new heat is at most 10. Its score is `card value × new number of cards in kiln`, added to the unbanked pot. Place it in the kiln, then refill the hand up to three from the draw pile.
2. **SELL:** Legal only with a nonempty kiln and at least one hand card. Choose and discard one hand card, add the entire kiln pot to permanent score, discard all kiln cards, and reset kiln heat and pot to zero. Refill the hand up to three. Selling consumes one card, even if the pot is small.
3. **FIRE:** Legal only with a nonempty kiln, at least one Spark, and at least one face-down card. Spend one Spark and reveal the next unseen deck card, consuming it without refilling the hand. Add its value to the current heat **for the test**. If the new heat is **7, 8, 9, or 10**, place the card in the kiln, calculate its normal FEED reward, then **triple the entire resulting pot**. Otherwise the kiln shatters: discard all kiln cards and the revealed card, reset heat and pot, and lose all unbanked points. Previously sold points remain safe. FIRE can be attempted again after success, provided a Spark and unseen card remain.

**Ending:** All actions consume at least one resource card, except that the consumed card for FIRE comes from the face-down deck. Once the deck and hand are both empty, automatically sell any remaining kiln pot for free and end. All 24 cards must have been consumed. Unused Sparks have no score value. There is no defeat condition; final permanent score measures performance.

**Randomness:** Only the uniformly shuffled initial deck order is random. All subsequent outcomes are deterministic given the deck and actions. Cards in hand, kiln, and discard are public. The player can count the remaining distribution but cannot see the order.

**Scoring:** FEED of value `v` at new kiln depth `d` adds `v*d`. A successful FIRE adds `v*d` and then multiplies the whole kiln pot by 3. Consecutive successful FIREs can compound the same pot. No other modifiers or exceptions.

**Example:** Start kiln empty with a 5 in hand. FEED 5: heat 5, pot 5. FIRE reveals 2: heat 7, reward 2×2=4, pot (5+4)×3=27. FEED another 2: heat 9, reward 2×3=6, pot 33. SELL by discarding a hand card: bank 33. Alternatively, FIRE at heat 9 requires revealing a 1 to survive; any other number shatters the 33-point pot.

## Reviewer: rounds and resolutions

These are sequentially conducted Designer, Reviewer, and Player roles in one analysis, not independently deployed agents.

**Round 1 (major):** Three independent kilns plus free selling produced redundant parallel boards; good policies used only one kiln. In 300-seed preliminary tests, strategic mean was 187.90 with three kilns and 185.43 with one. **Fix:** reduce to one kiln. Re-review: mechanical simplification accepted.

**Round 2 (major):** Free selling gave almost deterministic safe play (mean 135.72, SD 4.62 over 300 seeds), and little opportunity cost for resetting. **Fix:** SELL now discards a chosen hand card. This reduced safe baseline to 102.94 over the same 300 seeds and created a trade-off between banking and preserving useful cards. Re-review: rule complete, no deadlocks in simulated play.

**Round 3 (minor balance and major product concerns):** A ×2 FIRE multiplier gave a relatively modest adaptive mean of 124.03 versus 102.94 conservative over 300 seeds; ×3 gave more consequential upside (156.46 adaptive over 300 seeds). **Resolution:** retain ×3. Remaining major concerns: potential dominant heat-4-to-6 preparation pattern, nearly all Sparks consumed by adaptive policies, and familiar push-your-luck foundation. Mechanical rules approved for Player testing, but product-level verdict remains REVISE.

**Originality check:** Existing mining risk games include Hazard Miner (2023 print-and-play, with mineshaft card placement and collecting) and Drillers (Czech Games Edition, 2026). GLASSFIRE uses one heat window, card-depth scoring, and hand-card selling instead of their described systems, but its broad push-your-luck loop is not novel. Sources: https://chromecore.itch.io/hazard-miner and https://www.czechgames.com/games/drillers . This was a limited search, not an exhaustive originality audit.

## Player: actual reproducible tests

**Method:** Six fixed policies (random legal-action sampling; conservative never fires; aggressive fires whenever possible; bold uses loose expected-value thresholds; strategic uses public remaining-card probabilities with moderate risk filters; adaptive uses those probabilities with pot-dependent loss aversion). Each policy played the same 2,000 deck seeds `1300000`–`1301999`. All policies operated on public state only. The 2,000-seed batch includes an initial 1,000-seed group and a separate 1,000-seed holdout group. Ten unit tests passed, including card conservation across 100 additional complete runs.

| Policy | Mean | Median | P10 | P90 | SD | Fires/run | Successes/run | Collapses/run | Pot lost/run | Sells/run |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Random | 86.46 | 79 | 48 | 133 | 37.33 | 2.10 | 0.92 | 1.18 | 16.12 | 7.64 |
| Conservative | 102.71 | 103 | 96.9 | 109 | 4.96 | 0 | 0 | 0 | 0 | 5.62 |
| Aggressive | 96.55 | 79 | 70 | 121 | 43.62 | 4.00 | 1.92 | 2.08 | 66.83 | 4.11 |
| Bold | 149.59 | 140 | 77 | 229 | 55.87 | 4.00 | 2.36 | 1.64 | 19.30 | 4.63 |
| Strategic | 156.50 | 155 | 108 | 206 | 38.04 | 3.32 | 2.32 | 1.00 | 6.95 | 4.94 |
| Adaptive | 160.61 | 161 | 110 | 209 | 36.86 | 3.92 | 2.67 | 1.26 | 7.06 | 4.89 |

Adaptive versus conservative: **1,854 wins, 5 ties, 141 losses**; mean paired advantage **+57.901** (approx. 95% CI +56.266 to +59.536). Adaptive versus random: **1,841 wins, 2 ties, 157 losses**, mean +74.148. Adaptive versus aggressive: **1,765 wins, 68 ties, 167 losses**, mean +64.064. Adaptive versus strategic: **908 wins, 404 ties, 688 losses**, mean +4.107 (approx. 95% CI +2.408 to +5.805).

The first and holdout 1,000-seed groups were consistent: adaptive means 159.90 and 161.32; conservative means 102.73 and 102.69. Adaptive's high win rate against safe play indicates meaningful strategic influence under these policies, but does not establish optimality or a numeric 80/20 luck split. The safe baseline remains nearly deterministic, and adaptive consumes almost all four Sparks, indicating a potentially formulaic optimum.

**Recorded legal trace, seed 1300017, adaptive:** Initial hand `[5,2,2]`. FEED 5 → pot 5; FIRE reveals 2 → successful heat 7, pot 27; FEED 2 → heat 9, pot 33; SELL (discard 6) → bank 33. FEED 4 → pot 4; FIRE reveals 5 → successful heat 9, pot 42; FEED 1 → pot 45; SELL (discard 6) → total 78. FEED 5 → FIRE reveals 6 → collapse, lose 5. FEED 4 → FIRE reveals 1 → too cold, lose 4. Later safe FEED/SELL actions bank 23 and 16; final automatic sale banks 17. **Final score 134**, four Fires, two successes, two collapses, nine points burned, four paid Sells, 16 Feeds, 24 cards consumed.

**Example odds from the same run:** Immediately after FEED 5, the kiln pot was 5 and 20 unseen cards remained. Twelve would bring heat into 7–10, so FIRE success probability was exactly **60%**. The immediate expected pot after firing was **21.9**, versus 5 guaranteed by selling (which additionally costs a hand card). The actual revealed 2 succeeded.

## Scores (subjective predictions except where mechanical testing supports them)

| Dimension | Score / 10 | Basis |
|---|---:|---|
| Simplicity | 9 | Three actions, one heat window, one kiln |
| Engagement | 7 | Tactical decisions exist; human interest not tested |
| Strategic depth | 6 | Strong heuristic advantage, but likely repeated setup pattern |
| Luck balance | 7 | Adaptive dominates safe/random in paired games; no formal skill/luck decomposition |
| Excitement | 7 | Pot-at-risk reveal; emotional impact predicted |
| Reward satisfaction | 8 | ×3 whole-pot payout and possible compounding; predicted |
| Sense of loss | 6 | Collapses can sting, but adaptive loses only 7.06 points/run on average; predicted |
| Replayability | 5 | Same kiln and scoring every run; no run-specific evolution |

**Arithmetic mean: 6.875 / 10 (~6.9).** These are not human-player ratings.

## Remaining weaknesses and verdict

**REVISE.** The core rules are playable, strategic policies outperform chance, and the two redesigns removed redundant boards and made selling meaningful. However, the optimal-feeling loop may be repetitive, and the mechanics do not yet deliver Balatro-like emergent build variety. The FIRE odds can become known late in a run; guaranteed Fires may be a card-counting reward, but repeated high-probability Fires can reduce tension. The push-your-luck foundation is familiar.

**Smallest prototype:** one kiln heat meter (0–10), pot and permanent score, a three-card hand, four Spark indicators, remaining-deck/discard counts, and FEED / SELL / FIRE controls. No art, upgrades, or progression. **Validation hypothesis:** players will intentionally prepare heat 4–6 and hesitate between SELL and FIRE, but will not find the game repetitive after ten consecutive runs. Measure FIRE timing, card sacrificed to SELL, hesitation time, perceived agency, and voluntary replay rate.

**Files:** `glassfire_lab_013.py` (Python 3 standard library), `test_glassfire_013.py` (10 tests), `glassfire_results_013.json` (full 2,000-seed statistics and trace), `glassfire_holdout_013.json` (second 1,000-seed group). Run `python glassfire_lab_013.py --games 2000 --seed 1300000 --mult 3 --output glassfire_results_013.json`.

**Delivery:** Complete report delivered in ChatGPT. No email was sent.
