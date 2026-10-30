# Card Game Lab — Experiment 014: FOLDLINE

**Experiment ID:** CG-20261030-014  
**Timestamp:** 2026-10-30 14:42 TRT (Europe/Istanbul)  
**Verdict:** REJECT as a distinct commercial-game candidate; mechanically playable.  
**Role separation:** Designer, Reviewer and Player were sequential evaluations in one assistant/tool workflow, not three independent AI agents.

## Executive summary

FOLDLINE is a 27-card solo game in which the player narrows a numbered interval, earns increasing rewards for consecutive folds, and may stake an entire unbanked pot on a blind draw landing inside the remaining interval. The mechanically strongest version used three actions: FOLD, CASH, and DIVE. Final 7,000-game testing (1,000 matched decks × seven policies) found strong effects from lookahead: the safe planner averaged 291.111 points against 129.652 for a conservative immediate-gain policy. The adaptive policy averaged 344.638; a bold risk-taking policy averaged 356.192 but had much greater downside. However, the central blind-between-bounds gamble overlaps with the established In-Between/Acey-Deucey card game. Two attempts to differentiate the risk rule sharply reduced meaningful risk-taking. The concept is therefore rejected as a leading original-game candidate, though the fold-planning mechanic may be reusable.

## Designer: Final mechanically tested rules (version 1)

### Components

- 27 numbered cards: three copies each of 1, 2, 3, 4, 5, 6, 7, 8, 9.
- Two boundary markers, initially LOW=0 and HIGH=10. These markers are not cards.
- Four DIVE tokens.
- An unbanked pot, a permanent score, and a fold streak counter.

Shuffle all 27 cards uniformly. Draw three cards face up into a hand; the other 24 form a face-down deck. The discard pile is public and the deck is never reshuffled. Start with zero points and streak zero. Each card is consumed exactly once.

### Turn actions

1. **FOLD:** Select one card from your hand with value strictly between LOW and HIGH. Consume it and move either LOW or HIGH to its value (your choice), thereby narrowing the interval. Score the new interval's tightness times your current fold multiplier. Draw a replacement into your hand if the deck has a card.
2. **CASH:** Consume any one card from your hand without scoring it. Secure the entire unbanked pot as permanent points; reset LOW=0, HIGH=10, streak=0 and pot=0. Draw a replacement if available. CASH is legal even if the pot is zero, allowing recovery from an unusable hand.
3. **DIVE:** If the pot is positive, a DIVE token remains and the deck is not empty, spend one token and reveal the next deck card. If its value is strictly between LOW and HIGH, choose which boundary to move to the revealed value; score it as a FOLD and then triple the entire resulting pot. If the card is outside the interval or equal to a boundary, lose the entire pot and reset the interval and streak. The revealed card is consumed; DIVE does not refill the hand.

### Scoring

After a successful FOLD or DIVE, let `width = HIGH - LOW`. The base reward is `10 - width`. The multiplier for the new fold is `min(4, streak_before + 1)`; then increase streak by one.

`reward = (10 - new_width) × min(4, streak_before + 1)`.

A successful DIVE then applies `pot = 3 × (old_pot + reward)`. Normal FOLD adds only the reward. CASH permanently banks the pot. A failed DIVE destroys it. Permanent score is never at risk.

### Ending

The run ends once both deck and hand are empty. Automatically bank any remaining pot at no card cost. Unused DIVE tokens score nothing. There is no traditional defeat condition. Every action consumes exactly one of the 27 cards, so a complete run always has exactly 27 turns.

### Strategic decisions

A FOLD has two legal orientations, with different immediate rewards and different future card opportunities. The player must decide whether to narrow aggressively for high immediate reward or preserve a wider window for future folds and DIVE success. CASH costs a card, while DIVE consumes a token and gambles the pot. Card counting gives exact probabilities based on the public discard history and visible hand.

## Worked gameplay

Recorded adaptive-policy seed 1400017, final score 264:

- Start: LOW=0, HIGH=10, hand [9,7,3], pot 0.
- FOLD 3 as LOW: new interval (3,10), width 7, streak ×1, reward 3, pot 3.
- FOLD 7 as LOW: interval (7,10), width 3, streak ×2, reward 14, pot 17.
- FOLD 9 as LOW: interval (9,10), width 1, streak ×3, reward 27, pot 44.
- CASH by discarding 4: permanently bank 44, reset the interval.
- Later, at interval (0,9), pot 1 and streak 1, DIVE reveals 8. Move LOW to 8, reward 18, pot becomes `3 × (1+18)=57`. CASH and bank it.
- Later, at interval (0,8), pot 2, DIVE reveals 3 and succeeds: move HIGH to 3, reward 14, pot becomes `3 × (2+14)=48`.
- Now the interval is (0,3), with 11 unseen cards, five of which (1 or 2) would fit. The player attempts another DIVE. It reveals 3, equal to the boundary, and the 48-point pot is lost.
- Subsequent safe folds and CASH actions complete the run at 264 banked points. Three DIVE attempts: two successes and one failure.

At that final risky decision, the immediate payout would have been 225 on a success and zero on failure, with exact success probability 5/11. Expected immediate payout: 102.27 versus 48 points already in the pot (which would require a hand card to bank).

## Reviewer: Three passes

**Pass 1 — Original interval game.** Rules are mechanically clear, three actions, finite budget, and no infinite-loop exploit. However, the blind-draw-inside-two-bounds gamble is closely related to the established In-Between/Acey-Deucey betting game. Major originality concern. Other concerns: repeated greedy extreme folds, high score volatility, and safe-play dominance for some players.

**Pass 2 — Side-prediction revision.** Require the player to choose the lower or upper half of the interval *before* a DIVE; the card must land in the chosen half. Success paid ×4. In an exploratory 300-seed × seven-policy test, adaptive mean was 314.083 versus safe-planner 290.557, but adaptive used only 0.417 DIVE attempts per run. This revision reduced overlap with In-Between but made the central risk action almost irrelevant. Rejected.

**Pass 3 — Partial-loss revision.** Retain side prediction, use ×3 success and preserve half the pot on failure. In another exploratory 300-seed × seven-policy test, adaptive mean was 307.823 versus safe-planner 290.557, with only 0.413 DIVE attempts per run. The extra exception did not restore risk engagement. Rejected.

The mechanically stronger initial rules were retained as the final documented rules, but the originality major remains unresolved. The Reviewer therefore rejects this concept as a leading commercial candidate. No additional redesign loop is claimed to have resolved it.

## Player: Final 7,000-game experiment

Python 3 standard-library simulator. Seven deterministic heuristic policies, 1,000 complete games each, common initial shuffled-deck seeds 1400000–1400999. The random policy randomly samples legal actions and chooses a random boundary after a successful DIVE. The aggressive policy dives whenever possible. Conservative greedily maximizes immediate safe reward. Safe planner uses one-step lookahead and visible-hand opportunities. Strategic uses cautious odds-based DIVE thresholds. Bold uses all four DIVE tokens when possible and chooses the higher-expectation opportunities. Adaptive balances DIVE expected value against visible safe-fold reward and pot preservation. These are heuristics, not optimal solvers.

| Policy | Mean | Median | P10 | P90 | SD | DIVE/run | Failed DIVE/run |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random | 124.688 | 109 | 60 | 194 | 74.434 | 2.013 | 1.381 |
| Conservative (immediate greedy) | 129.652 | 132 | 111 | 147 | 14.706 | 0 | 0 |
| Aggressive (blind whenever possible) | 273.312 | 243 | 198 | 381.1 | 161.023 | 4.000 | 1.816 |
| Safe planner (lookahead) | 291.111 | 290 | 259 | 325 | 24.546 | 0 | 0 |
| Strategic (cautious odds) | 297.956 | 292 | 259 | 338 | 40.252 | 0.098 | 0.026 |
| Adaptive | 344.638 | 320 | 263.9 | 455.1 | 89.382 | 1.610 | 0.232 |
| Bold (frequent calculated risks) | 356.192 | 339 | 218 | 511 | 123.892 | 4.000 | 1.472 |

Adaptive versus random: 975 wins, 0 ties, 25 losses, paired mean advantage +219.950 (approximate 95% normal CI +212.615 to +227.285). Adaptive versus safe planner: 612 wins, 265 ties, 123 losses, mean advantage +53.527 (95% CI +48.079 to +58.975). Adaptive versus bold: 480 wins, 20 ties, 500 losses, mean difference -11.554 (95% CI -20.774 to -2.334).

Bold achieves the highest mean, but its 10th-percentile score (218) is below the safe planner's (259). Adaptive's 10th percentile (263.9) is slightly above the safe planner's, making it a more reliable risk-taking heuristic. Adaptive used 1.61 of four DIVE tokens per run, succeeded 1.378 times and failed 0.232 times, and lost 5.088 pot points per run. Bold used all four tokens and lost 33.706 pot points per run. Aggressive lost 115.940 pot points per run. The safe planner spent 6.94 hand cards on CASH per run, versus 6.787 for adaptive.

**Interpretation:** Lookahead matters enormously: safe planner more than doubles the immediate-greedy score. Selective risk raises average reward, while excessive risk creates worse low-end outcomes. The exact target of 80% skill / 20% luck cannot be inferred from these simulations. Stronger policies might change the rankings. No human emotional-response tests were conducted.

## Evaluation (subjective predictions, not human measurements)

| Dimension | Score / 10 | Reason |
|---|---:|---|
| Simplicity | 8 | Three actions and one interval |
| Engagement | 7 | Consequential boundary choices, untested with humans |
| Strategic depth | 7 | Safe lookahead vastly outperforms immediate greed |
| Luck balance | 6 | Skill matters, but bold risk has a wide distribution |
| Excitement | 8 | Entire-pot DIVE decisions create tension (prediction) |
| Reward satisfaction | 8 | Streak and DIVE tripling compound visibly (prediction) |
| Sense of loss | 7 | Failed DIVE destroys accumulated pot (prediction) |
| Replayability | 5 | Likely repeated optimal fold patterns and familiar gambling core |

**Mean = 7.0 / 10** (56 / 8). This is not an originality score or evidence of human enjoyment.

## Remaining weaknesses and smallest prototype

- **Major unresolved originality:** the DIVE condition directly resembles the betting condition in In-Between/Acey-Deucey, even though the narrowing interval, card hand, streak multiplier and CASH cost are different.
- **Dominant-pattern risk:** repeated extreme folds can produce high safe rewards, and a one-step lookahead is already highly effective.
- **Risk distribution:** the highest-mean policy has lower downside protection than the safe planner; a player may prefer the safe path.
- **Human experience unknown:** no retention, engagement or emotional responses were measured.

A minimal prototype would need only a horizontal 0–10 interval with two draggable markers, three numbered hand cards, four DIVE tokens, a pot, banked score, and public discard history. The key hypothesis is that choosing *which boundary to move* remains strategically engaging beyond five runs and that DIVE decisions feel different enough from a standard in-between bet. Test with human players before investing in artwork or progression.

**Verdict: REJECT as a distinct product candidate.** The fold-planning submechanic could be reused in a future concept, but this version should not displace Stormfreight or Shortfuse.

**Reproducibility:** `python foldline_lab_014.py --games 1000 --seed 1400000` and `python test_foldline_014.py` (11 passing unit tests). Final simulation results saved as `foldline_results_014.json`.

**Originality references:** Bicycle Cards, *In Between* (https://bicyclecards.com/how-to-play/in-between); Pagat, *In Between* (https://www.pagat.com/banking/in-between.html). This is a limited comparison, not a comprehensive IP clearance.

**Delivery:** ChatGPT report. Gmail verification required interactive authorization, so no email was sent.
