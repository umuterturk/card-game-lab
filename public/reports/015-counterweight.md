# Card Game Lab — Experiment 015: COUNTERWEIGHT

**Experiment ID:** CG-20261030-015  
**Local timestamp:** 2026-10-30 15:46 Europe/Istanbul (TRT, UTC+03:00)  
**Verdict:** PASS — small prototype candidate  
**Scope:** sequential Designer / Reviewer / Player roles within one execution, not independent AI agents.

## Executive summary

COUNTERWEIGHT is a solo two-pan balancing card game. Build a valuable load by placing numbered cards on either pan, then either bank its current value or spend a scarce Press token to drop an unseen weight onto a chosen side. A balanced Press triples the entire load's multiplier; an unbalanced Press destroys the load. A normal placement can temporarily decrease the displayed payout, creating tactical choices about whether to bank, bridge an imbalance, or prepare a calculated Press.

The final simulator ran 1,000 complete games for each of seven policies (7,000 games) on matched shuffled-deck seeds 1,500,000–1,500,999. Adaptive play averaged 1,414.99 points, compared with 592.77 for the safe planner, 439.86 for a simple conservative policy, and 301.64 for random play. A more risk-controlled bank-aware policy averaged 1,306.07, with a stronger 10th-percentile score of 539 compared with adaptive's 294. The evidence supports a meaningful skill/risk tradeoff, not a precise 80/20 decomposition of skill and luck.

## Designer — complete rules

**Components:** 24 cards (four each of numbers 1, 2, 3, 4, 5, 6), three Press tokens, two pans with three card slots each, a permanent score counter. The hand is face up and contains up to three cards. There is one uniformly shuffled face-down deck and a face-up discard pile.

**Setup:** Shuffle the 24 cards uniformly. Deal three cards to the hand. Place the remaining 21 face down as the draw pile. Both pans are empty. Set permanent score to 0, Press tokens to 3, and the current load's successful-Press count to 0. Each load starts with no multiplier bonus.

**Current load value:** Let L and R be the sums of card values on the left and right pans, and nL and nR their card counts. Let b be the number of successful Presses on this load. For a nonempty load, compute:

- Base weight: L + R.
- Balance multiplier: 2^min(nL,nR) if |L−R| <= 2; otherwise 1.
- Press multiplier: 3^b.
- Current load value = base weight × balance multiplier × Press multiplier.

An empty load is worth 0. Balance and load value are recalculated after every card placement. This means a normal placement may lower the current load value if it makes the pans unbalanced. There is no negative score or negative load value.

**Legal actions:**

1. **PLACE:** Choose one card from your hand and one pan with fewer than three cards. Add that card to the pan, then refill your hand with the next face-down card if one exists. The old cards remain in the pans. The current load value is recalculated. A PLACE does not cost a Press token.
2. **BANK:** If at least one pan contains a card, add the current load value to your permanent score. Discard all cards from both pans, empty both pans, and reset the successful-Press count to zero. BANK does not consume a card or token. It can be used even if the load is unbalanced or only one card is present.
3. **PRESS:** If the current load contains at least three cards, at least one pan has an empty slot, a Press token remains, and the draw pile is nonempty, choose a pan with an empty slot and spend one token. Reveal the next face-down card and place it on that pan. If |L−R| <= 2 afterward, the Press succeeds: retain the card, increment b by one, and recalculate the load value (including the ×3 Press bonus). Otherwise the Press fails: discard all cards from both pans, reset both pans and b to zero, and lose the entire current load value. Previously banked score is safe. The revealed card and token are consumed in either case. PRESS does not refill the hand.

**Turn order:** Choose one legal action, resolve it fully, then repeat. If the board has six cards, BANK is mandatory because neither pan has space. If the board is empty, PLACE is the only possible action. No passing or voluntary discarding exists. The draw pile is never reshuffled. All discarded cards remain visible, so remaining-card probabilities can be calculated without knowing their order.

**Ending:** After all 24 cards have been consumed by PLACE or PRESS, if any cards remain in the pans, they are automatically BANKed for free. The run ends and the final score is the sum of banked load values. Unused Press tokens have no score value. There is no traditional defeat condition.

**Core strategy:** Use visible hand cards to create balanced loads; recognize that three cards on each pan can produce an ×8 balance multiplier. Create deliberate imbalances that a likely unseen weight can correct. Save tokens for high-probability Presses or accept higher variance for larger jackpots. BANK before a normal placement if the expected opportunity cost of disrupting a valuable load is too high.

## Worked gameplay — recorded seed 1500001

- Turns 1–3: PLACE 4 left, 5 right, 3 left. Left sum 7, right sum 5, three cards. Current load = 12 × 2 = 24.
- Turn 4: PRESS right. The unseen card is 6; left/right sums become 7/11 (difference 4). The Press fails, destroying the 24-point load. One token spent.
- Turns 5–10: Build left [2,5,1] and right [1,2,3], sums 8/6. BANK 112 points (14 × 8).
- Turns 12–14: Build left [6], right [5,4], sums 6/9. Current load 15. PRESS left has a 75% chance to bring the pans within 2. The next card is 2, so it succeeds: left [6,2], right [5,4], sums 8/9, load = 17 × 4 × 3 = 204.
- Turn 16: PLACE 4 left. Sums become 12/9, now outside the balance window, so the displayed value temporarily falls to 21 × 1 × 3 = 63.
- Turn 17: PRESS right has a 5/6 = 83.3% success chance. The next card is 3, making sums 12/12 with three cards per side and two successful Presses. The load becomes 24 × 8 × 9 = 1,728.
- Turn 18: BANK 1,728. Permanent score is now 1,840.
- Turns 19–25: Build and BANK another balanced load worth 168, reaching 2,008.
- Turns 26–27: PLACE 6 left and 1 right. All cards are consumed; automatic BANK adds 7.

**Final recorded score: 2,015 points.** Three Press attempts, two successes, one failure, 24 potential points lost on failure, three tokens spent, all 24 cards accounted for.

## Reviewer — findings and resolutions

**Round 1:**

- **Major clarity issue:** A PLACE can reduce the load value by breaking balance; this is unintuitive if described as accumulating points. **Resolution:** Explicitly define the value as a *live potential payout* rather than an accumulated pot. Recalculate and display it after each placement. BANK is allowed at any time, not just at six cards.
- **Major testing issue:** A policy that always fills the board ignores early BANK opportunities. **Resolution:** Implement and benchmark a bank-aware policy. It averaged 1,306.07 versus 1,280.46 for the otherwise identical strategic policy (1,000 matched seeds; paired difference +25.61 points, approximate 95% CI +4.89 to +46.32). The banking decision matters, though the heuristic is not optimal.
- **Balance concern:** ×3 compounding may create extreme variance. **Resolution:** Test ×2 as a comparative variant across 300 matched seeds per policy. With ×2, adaptive averaged 837.23 and safe planner 587.07; with ×3 on the same seeds, adaptive averaged 1,356.05 and safe planner 587.07. The ×2 version reduced jackpots but did not remove the risk of poor adaptive outcomes. Retain ×3 to preserve a meaningful voluntary reward; label high variance a remaining concern.
- **Originality concern:** Balancing two pans is not new. A cooperative card game called Balancing Act already uses weights on two pans and a tipping condition (https://howto.cards/en/balancing-act/). COUNTERWEIGHT differs in solo play, two capped three-card pans, player-controlled banking, count-based balance multipliers, and limited blind Press gambles. This is differentiation, not proof of unique mechanics. Commercial originality review remains necessary.

**Round 2:** Rule ambiguity and conservation checks resolved. No blocker remains. The Reviewer approves a minimal prototype, not commercial release.

## Player — reproducible simulation

**Environment:** Python 3 standard library. Seven deterministic policies, 1,000 complete games per policy on matched shuffled-deck seeds 1,500,000 through 1,500,999. Every run consumed exactly 24 cards. Eleven executable unit tests passed, including 100 complete games for each of seven policies. The policies do not inspect hidden deck order; they can calculate unseen-card composition from public counts.

| Policy | Mean | Median | P10 | P90 | Std. dev. | Press attempts | Failures | Mean load value lost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Random | 301.64 | 203 | 60 | 655 | 327.79 | 1.58 | 1.06 | 26.51 |
| Conservative | 439.86 | 469 | 224 | 672 | 146.37 | 0 | 0 | 0 |
| Safe planner | 592.77 | 588 | 483 | 672 | 90.53 | 0 | 0 | 0 |
| Aggressive | 899.02 | 386 | 172 | 3,234 | 1,191.98 | 3.00 | 1.32 | 139.05 |
| Strategic | 1,280.46 | 1,056 | 486 | 2,477 | 813.52 | 2.08 | 0.47 | 31.96 |
| Bank-aware | 1,306.07 | 1,072.5 | 539 | 2,512 | 804.75 | 2.09 | 0.46 | 32.01 |
| Adaptive | 1,414.99 | 996.5 | 294 | 2,528 | 1,230.18 | 2.98 | 0.99 | 104.48 |

**Paired comparisons:** Adaptive versus safe planner: 732 wins, 2 ties, 266 losses; mean difference +822.22 (approximate 95% CI +745.84 to +898.60). Adaptive versus random: 895 wins, 2 ties, 103 losses; mean difference +1,113.35 (CI +1,035.11 to +1,191.60). Adaptive versus aggressive: 725 wins, 1 tie, 274 losses; mean difference +515.97 (CI +425.77 to +606.18).

**Risk and strategy:** Aggressive Press success rate is about 56% (1.68/3.00), strategic about 77% (1.61/2.08), adaptive about 67% (2.00/2.98), and bank-aware about 78% (1.63/2.09). Aggressive play produces spectacular highs but a median below safe play. Adaptive produces the highest mean at substantial downside risk; bank-aware sacrifices some mean for a much stronger lower tail. A strong safe strategy scores close to the 672-point maximum attainable with no Presses, so the low-risk path may become repetitive. The high-risk strategy is not mathematically proven optimal.

**Luck balance:** Better policies outperform random play and each other under matched shuffles. However, adaptive score dispersion is large and there is no basis for claiming a measured 80% skill / 20% luck ratio. These are heuristic policy tests, not human tests or exhaustive optimization.

## Eight qualitative scores

| Dimension | Score | Basis |
|---|---:|---|
| Simplicity | 8 | Three actions, two pans, one balance threshold |
| Engagement | 7 | Planning and bank/Press trade-offs; predicted human response |
| Strategic depth | 8 | Safe planner, bank-aware, adaptive and random results differ materially |
| Luck balance | 6 | Strong skill influence but high jackpot variance |
| Excitement | 8 | Entire load can be destroyed; predicted |
| Reward satisfaction | 9 | Balance ×8 and successful Presses ×3 each; predicted |
| Sense of loss | 8 | Failed Press destroys the current load; predicted |
| Replayability | 6 | Small deck and potential repeated optimal patterns |

**Arithmetic mean: 7.50 / 10.** Psychological ratings are hypotheses, not human measurements.

## Remaining weaknesses

1. Repeated safe balancing may be solvable; the safe planner often approaches the maximum no-Press score of 672.
2. Press ×3 jackpots create large score dispersion. The player may prefer the lower-variance bank-aware style even when adaptive has higher mean.
3. Balance-based placement has precedents; this is not an established claim of commercial originality.
4. No human playtests, no optimal solver, no retention or enjoyment data.

## Smallest playable prototype

A portrait screen with two three-slot pans, live left/right totals, balance difference, current potential payout, a three-card hand, three Press tokens, and PLACE/BANK/PRESS controls. Show the exact Press success probability computed from public cards before confirmation. No special cards, upgrades, progression, or art needed.

**Validation hypothesis:** Over five runs, players will deliberately create recoverable imbalances to improve Press odds, and will sometimes BANK early to protect a high-value load. Measure decision time, Press frequency, early-BANK frequency, and whether the player can articulate why a placement temporarily reduces payout.

**Final verdict: PASS — minimal prototype candidate.** It merits a quick human test, but not full production or a claim that it surpasses previous leading concepts.

**Delivery:** Complete report provided in ChatGPT. Gmail authorization required interactive user input and could not be completed during this run; no email was sent.
