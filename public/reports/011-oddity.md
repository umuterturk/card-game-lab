# Card Game Lab — Experiment CG-20261030-011

**ODDITY — Three jars, one risky draw**  
**Local timestamp:** 2026-10-30 10:52 TRT (Europe/Istanbul)  
**Verdict:** REVISE — mechanically viable, originality and dominant-pattern concerns  
**Final version:** v2, additive blind bonus

## Executive summary

ODDITY is a solo set-collection game played with 24 numbered cards and three jars. The player safely assigns visible cards to jars, trying to collect all six different numbers in each. At any time, they may gamble by adding the next unseen card to a jar. A new number grows the collection and increases its multiplier; a duplicate destroys that jar's unbanked value. The player may sell any jar to secure its score. The best tested policy averaged 390.2 points versus 251.2 for competent safe play and 87.0 for random play over 1,000 matched seeds. However, safe play almost always scores exactly 252, and the duplicate-bust/bank core overlaps with Flip 7. The concept is not ready for a strong originality claim.

## Designer: complete final rules

**Components:** 24 cards, four copies each of values 1, 2, 3, 4, 5, 6; three jars, each holding at most one of each number; a face-up three-card hand; a face-down draw pile; a permanent score. Each jar records the number of successful blind captures in that jar (0, 1, or 2).

**Setup:** Shuffle all 24 cards uniformly; deal three into the visible hand and leave 21 face down. All three jars start empty. Score starts at zero. Used cards go to a face-up discard area; never reshuffle. The 24-card deck is the only resource budget.

**Legal actions (choose one each turn):**

1. **PLACE:** Select one card in your hand and one jar not already containing its number. Move the card to that jar, then refill the hand from the deck up to three cards, if possible. Visible placement never fails.
2. **SELL:** Select any nonempty jar. Score its current payout permanently and discard every card in that jar; the jar becomes empty and loses its blind bonus. This costs no deck card.
3. **BLIND:** Select a jar containing at least two different numbers, fewer than six, and fewer than two successful blind captures. This action requires at least one face-down card. Reveal the next deck card directly into that jar, without refilling the hand. If its number is new to the jar, keep it and increase that jar's successful-blind count by one. If its number is already present, discard the revealed card and all cards in that jar: the entire jar is lost and becomes empty. Previously sold points remain safe.

**Scoring:** For a jar with `n` different numbers and `b` successful blind captures, its payout when sold is `(2^n - 1) × (1 + b)`. A jar with zero cards has payout zero. Thus a four-card jar with two successful blind captures is worth `(16 - 1) × 3 = 45` points. Six different numbers with two successful blind captures score `63 × 3 = 189` points. No jar can contain more than six cards or have more than two successful blind captures.

**End:** When both the draw pile and hand are empty, sell all remaining nonempty jars automatically, in jar order, and end the run. If the hand contains cards, the player can always place them by selling a jar first if necessary. No traditional win/loss condition exists; final banked score is the performance measure.

**Randomness:** Only the initial uniformly shuffled order of the 24-card deck is random. All placements, sells, and blind outcomes are deterministic given that order. The full card distribution and all revealed cards are public; the remaining draw-pile composition can be inferred by card counting.

**Strategy:** Visible placement safely grows a jar, but a blind capture both consumes a future card and risks destroying a collection in exchange for a higher multiplier. Three simultaneous jars let the player diversify. Selling one jar secures its reward while leaving the others exposed.

## Worked gameplay (actual executable trace)

Policy `strategic`, seed `1100024`:

- Place 6 and 3 into jar 1: two different cards, potential payout `2²−1 = 3`.
- Blind into jar 1: the exact success probability was 68.421%; draw 2 succeeds. The jar now holds {2,3,6}, with one successful blind and payout `7×2 = 14`.
- Place 5, 1, and 4 into jar 1, eventually completing all six numbers: payout `63×2 = 126`.
- Build jar 2 to five different numbers with one successful blind: potential payout `31×2 = 62`.
- Build jar 3 to four different numbers with two successful blinds: potential payout `15×3 = 45`.
- Risk another blind in jar 2, with exactly 50% success probability. The card is 5, a duplicate. Jar 2 burns, losing 62 potential points; jars 1 and 3 remain untouched.
- Rebuild jar 2, later completing jar 3 to six different numbers and selling it for 189 points.
- The remaining cards are placed and automatically sold at the end: jar 1 scores 126, rebuilt jar 2 scores 62, and a final one-card jar scores 1.

**Final score:** `189 + 126 + 62 + 1 = 378` points. Six blind attempts, five successes, one failure, and 62 potential points burned. All 24 cards were consumed exactly once.

## Reviewer: findings and revisions

**Review 1 — Major: runaway multiplier and overpowered indiscriminate gambling.** In v1, each successful blind doubled the jar multiplier (`×1`, `×2`, `×4`). Across 1,000 seeds per policy, the aggressive policy averaged 468.35 points, ahead of the strategic policy's 453.87. This undermined the intended benefit of selective risk-taking.

**Resolution:** In v2, the blind multiplier is additive (`×1`, `×2`, `×3`). The unnecessary Discard action was removed because a jar can always be sold to make room for a hand card. Retested all seven policies on the same seeds. Aggressive mean fell to 356.75; strategic mean was 390.20.

**Review 2 — Mechanical approval:** All three actions, payout rules, legal-action checks, failure resolution, end conditions, and card conservation passed six unit tests and 700 additional policy-seed complete-run checks in the test suite. The main 7,000 complete final-version games also terminated and preserved all 24 cards.

**Review 3 — Major unresolved originality concern:** Flip 7 also uses distinct-number collection, duplicate-number busts, and a stop/bank choice. ODDITY's three concurrent jars, safe visible-hand assignment, and risk bonuses add meaningful agency, but the shared central risk motif remains conspicuous. Sources: https://boardgamearchive.com/how-to-play/how-to-play-flip-7/ and https://flip7score.com/how-to-play . A broader commercial originality review was not completed.

**Review status:** Mechanically approved, but not approved as a final distinctive commercial design. REVISE.

## Player: actual simulation

**Method:** Seven fixed heuristic policies, 1,000 complete games each, matched seeds `1100000` through `1100999`; Python 3 standard library; same deck order for every policy at each seed. These are heuristics, not an optimal search solver or human participants.

| Policy | Mean | Median | Std. dev. | P10 | P90 | Blind attempts/run | Failed blinds/run |
|---|---:|---:|---:|---:|---:|---:|---:|
| Conservative | 251.17 | 252 | 5.14 | 252 | 252 | 0.00 | 0.00 |
| Safe planner | 251.17 | 252 | 5.14 | 252 | 252 | 0.00 | 0.00 |
| Random | 87.00 | 69 | 64.34 | 25 | 172 | 3.64 | 1.30 |
| Aggressive | 356.75 | 384 | 175.20 | 122.5 | 693 | 7.91 | 2.40 |
| Bold | 363.93 | 382 | 162.83 | 161.9 | 630 | 6.95 | 1.90 |
| Adaptive | 360.93 | 330 | 154.03 | 159 | 567 | 5.50 | 1.40 |
| Strategic | **390.20** | 348 | 129.31 | 259 | 567 | 4.92 | 1.03 |

**Strategy advantage:** Strategic averaged 139.04 more points than the safe planner (approximately +55.4%), with an approximate paired 95% confidence interval of +131.05 to +147.02. It won 911 of 1,000 matched-seed comparisons, tied twice, and lost 87. It averaged 303.20 more points than random and won 982 matched comparisons. Against aggressive, its mean advantage was +33.45 (approximate paired 95% CI +20.65 to +46.25); it won 554, tied 7, and lost 439.

**Risk:** Strategic attempted 4.916 blinds/run; 3.883 succeeded, 1.033 failed. Success rate 78.99%, mean potential payout destroyed 12.08 points/run, and 19.55% of blind attempts were guaranteed successes given the remaining deck composition. Aggressive attempted 7.912 blinds/run, failed 2.399, and destroyed 21.44 potential points/run. Strategic used 19.084 cards through safe placements and 4.916 through blind draws on average, always consuming all 24 cards.

**Dominant behavior:** Grow large distinct sets, take selectively profitable blinds, and sell jars when full or when necessary to free space. Safe play is unusually deterministic: it scored exactly 252 in most runs because it can assemble four complete six-number sets with three jars. This may make the safe branch boring and suggests the main interest is concentrated in risk decisions.

**Limitations:** No proof of optimality, no human tests, no verified numerical skill/luck ratio, and no complete originality clearance. The adaptive policy underperformed the simpler strategic heuristic, indicating that its risk threshold was not well tuned. The 95% intervals describe variation across these seeded decks and fixed heuristics, not the quality of an untested player population.

## Eight scores (1–10)

| Dimension | Score | Basis |
|---|---:|---|
| Simplicity | 8 | Three actions, six ranks, one scoring formula |
| Engagement | 7 | Three simultaneous jars and risk choices; predicted human appeal |
| Strategic depth | 7 | Strategic outperformed safe, random, and aggressive on average |
| Luck balance | 6 | Card order matters; safe scores are almost fixed, risky scores vary widely |
| Excitement | 8 | A 50% gamble can destroy a 62-point jar; predicted emotion |
| Reward satisfaction | 8 | Distinct-card growth and ×3 bonuses create large sales; predicted emotion |
| Sense of loss | 7 | Failed blind destroys one jar, not previously sold points; predicted emotion |
| Replayability | 5 | Limited six-rank set patterns and potential dominant heuristics |

**Overall arithmetic mean: 7.00/10.** Emotional scores are predictions, not observations.

## Remaining weaknesses and prototype

1. **Originality:** The duplicate-bust/bank risk motif resembles Flip 7; three jars and visible placement may not be enough differentiation.
2. **Safe-play dominance:** Safe play is nearly deterministic, usually yielding 252; this may limit interesting low-risk decisions.
3. **Guaranteed blind captures:** About 19.55% of strategic blind attempts were risk-free due to card counting, potentially diluting tension.
4. **Heuristic uncertainty:** The strategic heuristic outperformed the more complex adaptive heuristic, but no optimal solver has tested the decision space.

**Smallest playable prototype:** 24 plain numbered cards, three jar slots, three-card hand, draw pile counter, current jar payout and blind bonus indicators, and Place/Sell/Blind buttons. No artwork, progression, special cards, or upgrades.

**Key validation hypothesis:** Players will actively manage all three jars and choose to risk a valuable jar only when their own card-counting and placement decisions have made the odds attractive. Track voluntary blind frequency, sales before a jar reaches six cards, changes in behavior after a bust, and whether players describe the core as distinct from Flip 7.

**Verdict: REVISE.** The prototype is executable and has strong strategy separation, but a commercial-design pass should first replace or substantially transform the familiar duplicate-bust mechanic. An unsuccessful experiment does not block the next scheduled run.

**Delivery:** Complete report supplied in ChatGPT; email status reported separately only if delivery is verified.

## Reproducibility

- Final simulator: `oddity_lab_011.py`
- Unit tests: `test_oddity_011.py`
- Final results: `oddity_results_011.json`
- Earlier version: `oddity_lab_011_v1.py`, `oddity_results_011_v1.json`
- Example trace: `oddity_trace_011_strategic.json`
- Run: `python oddity_lab_011.py --games 1000 --first-seed 1100000`
