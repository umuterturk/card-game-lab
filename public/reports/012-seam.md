# Card Game Lab — Experiment 012: SEAM

- **Experiment ID:** CG-20261030-012
- **Local timestamp:** 2026-10-30 12:53 TRT (Europe/Istanbul)
- **Verdict:** REVISE
- **Final-version tests:** 2,400 complete simulated games, 400 each across six policies; matched seeds 1200000–1200399
- **Preliminary version tests:** 1,200 games, 200 each across six policies, seeds 1200000–1200199
- **Implementation:** Python 3 standard library

## Executive summary

SEAM is a four-card spatial puzzle with voluntary blind replacement. Neighboring cards form a link when their numbers add to seven. The player scores only newly formed links, builds a streak multiplier, and chooses between visible card replacement, cashing points at the cost of a card, or risking a blind draw. The design is playable and mechanically verified. Adaptive play averaged 169.78 points versus 151.27 for conservative play and 13.69 for random play. However, its advantage over conservative play is modest and it won only 149/400 matched runs, tied 125 and lost 126. Risk is not yet compelling enough for a PASS.

## Designer — complete rules

### Components and setup

- 24 cards: four copies each of numbers 1, 2, 3, 4, 5 and 6.
- Shuffle uniformly. Deal four cards face up into a 2x2 board, and three into a face-up hand. The remaining 17 cards form a face-down draw pile.
- The board positions are 0 (top-left), 1 (top-right), 2 (bottom-left), 3 (bottom-right). The four orthogonal edges are 0–1, 0–2, 1–3 and 2–3; diagonals do not count.
- Two neighboring cards form a *link* if their numbers add to seven. Existing links earn nothing until broken and formed again by a later replacement.
- Start with permanent score 0, unbanked pot 0, streak 0, and three Dare tokens. All discarded/replaced cards remain visible. The deck is never reshuffled.

### Actions

Choose exactly one legal action per turn:

1. **MOVE:** Choose one card in your hand and replace any of the four board cards. Discard the replaced card face up. Count links that exist after the replacement but did not exist before it. If at least one new link forms, increase the streak by one (maximum 3) and add `5 × new links × multiplier` to the pot, where multiplier is ×1 for streak 1, ×2 for streak 2, and ×4 for streak 3. If no new link forms, halve the pot (round down) and reset the streak to zero. Refill the hand to three from the deck if possible.
2. **CASH:** If the pot is positive and the hand is nonempty, discard one chosen hand card, transfer the whole pot to permanent score, and reset pot and streak to zero. Refill the hand if possible. The board stays unchanged.
3. **DARE:** If the pot is positive, at least one Dare token remains, and the draw pile is nonempty, choose one board position, spend one Dare token and reveal the next unseen card into that position, discarding the old card. If it forms one or more new links, calculate the normal MOVE reward and then double the entire pot. If it forms no new links, halve the pot (round down) and reset the streak. The hand is unchanged. A Dare never refills the hand.

There are no other actions. A card may replace an identical number but it cannot form new links and will therefore count as a miss. A normal miss or failed Dare never subtracts already banked points. Each action consumes exactly one card, either from the hand or the draw pile. The player can count unseen card values from the visible board, hand and face-up discard pile.

### Ending and scoring

Once both the draw pile and the hand are empty, automatically bank the remaining pot for free and end the run. The final score is the permanent score. There is no conventional defeat condition. Maximum Dare attempts: 3. Maximum per-link streak multiplier: ×4. All 24 cards remain accounted for: four on the board, and twenty consumed through the 20 turn actions.

### Worked numerical example

Suppose the board is `[1,1;1,1]`, the pot is 20 and streak is 0. Replacing the top-left 1 with 6 creates two links, because 6+1=7 along both of its edges. A normal MOVE adds `5×2×1=10`, leaving pot 30 and streak 1. If this was a successful DARE, the pot would become `(20+10)×2=60`. A DARE revealing 2 instead forms no new links and leaves `floor(20/2)=10` points, resetting the streak.

## Reviewer — review passes

**Pass 1, version 1:** Blind failure destroyed the entire pot, while normal misses halved it. This produced a severe downside relative to the moderate payoff. In 200 matched games per policy, adaptive play averaged 170.77 with 10th percentile 79.9. The Reviewer marked this a major balance issue.

**Designer revision:** Make a failed Dare halve the pot, the same consequence as a normal miss. This removes an exception and makes the mechanic easier to teach. In the first 200 matched final-version games, adaptive mean increased to 173.03 and the 10th percentile improved to 87.9. The final version was then tested on 400 matched seeds per policy.

**Pass 2, final rules:** No undefined actions or card-conservation blockers. Seven unit tests passed. Major unresolved concern: selective risk yields only a modest mean advantage over competent safe play, and the safest policy has a stronger 10th-percentile score. Another major concern: the sum-to-seven adjacency rule resembles established numerical pairing puzzles; its particular 2x2 replacement-and-wager system is not established as commercially original. The Reviewer withholds prototype approval pending a better risk incentive and human tests.

**Originality context:** Sevens (mikepurdy) uses bundles summing to seven (https://purdy.itch.io/sevens-card-game), while Island of Cards uses spatial numerical adjacency (https://soloboardgames.vercel.app/en/games/island-of-cards). These are not the same game, but they demonstrate familiar ingredients. This was a limited search, not a comprehensive originality or trademark review.

## Player — executable tests

All final-version policies played 400 complete runs on the same 400 shuffled deck seeds (1200000 through 1200399). Each policy could see only its current hand, board, face-up discard history, pot, and the inferred multiset of unseen cards, never their order.

| Policy | Mean | Median | Std. dev. | P10 | P90 | Dare attempts/run | Failed Dares/run | Pot points lost/run |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Random | 13.69 | 11 | 13.22 | 2 | 25.1 | 1.668 | 1.255 | 24.47 |
| Conservative | 151.27 | 152 | 43.85 | 97 | 210.2 | 0 | 0 | 16.73 |
| Aggressive | 33.37 | 26.5 | 27.01 | 7 | 68 | 3.000 | 2.028 | 150.68 |
| Strategic, no Dare | 148.26 | 147.5 | 46.56 | 86.9 | 212 | 0 | 0 | 24.82 |
| Bold | 130.84 | 116.5 | 83.22 | 23.8 | 228.1 | 2.935 | 1.813 | 67.37 |
| Adaptive | 169.78 | 156 | 82.35 | 86.9 | 270.2 | 0.908 | 0.365 | 28.96 |

The conservative policy chooses good visible moves and cashes when the visible hand offers poor immediate value. The strategic policy uses a two-step visible-hand heuristic but never Dares. The aggressive policy Dares whenever possible. The bold policy Dares at a lower estimated threshold. Adaptive evaluates unseen-card probabilities and expected pot changes before selecting Dares. Random samples uniformly among all legal actions.

**Matched-seed comparisons:** Adaptive vs random: 399 wins, 0 ties, 1 loss; mean difference +156.09 (approximate paired 95% CI +148.04 to +164.14). Adaptive vs conservative: 149 wins, 125 ties, 126 losses; mean difference +18.51 (CI +11.35 to +25.66). Adaptive vs strategic: 136 wins, 192 ties, 72 losses; mean difference +21.52 (CI +14.43 to +28.60). Adaptive vs bold: 278 wins, 2 ties, 120 losses; mean difference +38.94. Adaptive vs aggressive: 394 wins, 0 ties, 6 losses.

Adaptive succeeded in 0.543 of 0.908 Dares per game (~59.8%). Aggressive succeeded in 0.973 of 3.0 (~32.4%). Adaptive cashed 2.055 times and played 17.038 visible cards per run. All 24 cards were conserved in every game.

The fixed heuristics are not optimal solvers. These tests show strong separation from random play but only moderate improvement over competent safe play. They do not validate an 80% strategy / 20% luck split. Confidence intervals reflect only these seeds and fixed policies, not human players.

### Recorded playthrough, seed 1200015

Starting board `[2,6;2,4]`, hand `[3,5,4]`.

- Moves 1–8: Form new links on eight consecutive placements, growing the pot to 155. The eighth placement creates two links at ×4 and adds 40.
- Move 9: CASH, discarding a hand card and securing 155 points.
- Moves 10–15: Rebuild to pot 55 with a ×4 streak.
- Move 16: DARE at bottom-left. Two unseen cards remain (1 and 4), so success probability is 50%. The draw is 4, which forms no new links; pot halves from 55 to 27.
- Move 17: DARE at bottom-left again. The only unseen card is 1, guaranteeing two new links. Reward is 10, then pot doubles from 37 to 74.
- Move 18: CASH 74 points, total 229.
- Moves 19–20: Two remaining hand cards score nothing; the run ends at 229.

## Eight scores (subjective design assessment)

| Dimension | Score / 10 | Basis |
|---|---:|---|
| Simplicity | 8 | Three actions, one spatial rule, unified miss penalty |
| Engagement | 7 | Visible board planning; human interest untested |
| Strategic depth | 7 | Meaningful hand/position decisions, strong vs random |
| Luck balance | 6 | Higher upside but weak consistency vs safe policy |
| Excitement | 7 | Visible pot and blind choice; predicted |
| Reward satisfaction | 7 | Consecutive ×1/×2/×4 scoring and double-pot Dare; predicted |
| Sense of loss | 6 | Half-pot losses sting but can feel mild; predicted |
| Replayability | 6 | Finite patterns and possible dominant loop |
| **Overall arithmetic mean** | **6.75** | Qualitative, not a human satisfaction measurement |

## Remaining weaknesses and next prototype

The main weakness is the limited added value of Dares over competent safe play. Adaptive play averaged 12.2% more than conservative play, but the lower tail was worse. Another concern is that the 2x2 layout may become repetitive once players learn to set up a checkerboard of complementary numbers. A third is that repeated exact-sum matching is a familiar puzzle ingredient, so originality remains provisional.

**Smallest playable prototype:** 2x2 board, three-card hand, 24 numbered cards, three Dare tokens, pot/score/streak displays, and MOVE/CASH/DARE controls. No artwork, upgrades or progression. Measure whether people deliberately alter the board to improve Dare probabilities, whether they understand the difference between new and existing links, and whether at least one Dare per run feels like a meaningful choice. The next balance experiment should test an explicit opportunity cost for cashing versus a different Dare reward, without adding special cards.

**Verdict: REVISE.** The rules work and strategy beats random play, but risk is not yet a sufficiently strong part of optimal-seeming play to recommend full development. No email was sent; authenticated Gmail access was not available in this non-interactive run.
