# Card Game Lab — Experiment 017: CHIME

**Experiment ID:** CG-20261030-017  
**Local timestamp:** 2026-10-30 17:52 TRT (Europe/Istanbul)  
**Verdict:** PASS — limited playable prototype, not a commercial validation  
**Final reproducible test:** 1,200 complete games (6 strategies × 200 matched seeds)

## Executive summary

CHIME is a solo card game in which three bells count down every time the player spends a card. The player can synchronize their rings for quadratic rewards, bank accumulated points, or wager that an unknown Fate card will join a triple ring within three ticking turns. This links card sequencing and timing to voluntary risk rather than treating risk as a separate random button.

A reviewer discovered that the first version allowed nearly guaranteed wagers using already visible cards. The final version forces the player to discard a hand card and draw a previously unseen Fate card after committing. A failure loses the entire unbanked pot. In the untouched final 200-seed holdout, adaptive play averaged 518.95 points, safe planning 378.10, and random play 64.05. The adaptive policy had much worse downside (10th percentile 130 vs safe planning's 330), showing a real tradeoff rather than free multiplier rewards. No human testing has been performed.

## Designer: Rules, complete

### Components and setup

- A deck of 24 cards: four copies of each number 1 through 6.
- Three empty bell slots, each able to hold one countdown card.
- A three-card face-up hand, 21 face-down cards in a uniformly shuffled draw pile.
- Three Pledge tokens, an unbanked pot, a permanent score, and visible used-card history.
- Start with zero points and all bells empty. The deck is never reshuffled.

### The countdown

Each bell card starts with a countdown equal to its printed number. Every PLACE or BURN consumes exactly one hand card, then all occupied bells tick down by one, including the newly placed card. A bell reaching zero rings and leaves its slot. If multiple bells reach zero on the same tick, they ring together. Cards that are played or burned are never returned to the deck.

### Legal actions

1. **PLACE:** Choose one card from the hand and one empty bell slot; put the card there. Tick all occupied bells once, resolve rings, and draw one replacement card if the deck is nonempty. No PLACE is legal if all three slots are occupied.
2. **BURN:** Discard one hand card without placing it. Tick all occupied bells once, resolve rings, and draw one replacement if possible. This lets time advance when all slots are full or when a card is unwanted.
3. **BANK:** When the pot is positive and there is no active Pledge, transfer all pot points permanently to score and reset pot to zero. BANK does not consume a card, draw, or advance time. It cannot be repeated with a zero pot.
4. **PLEDGE:** When the pot is positive, at least one bell is active, no other Pledge is active, at least one token remains, and at least one card remains in the face-down deck, choose and discard one hand card (costing that card), spend a token, and replace the discarded card with the next face-down card, revealed as a marked **Fate** card. No time advances on this action. The player then has three card-consuming turns (PLACE or BURN) to make all three bells ring on the same tick, including the Fate card. If achieved, add that ring's points and triple the entire current pot; the Pledge ends successfully. If the Fate card rings without the other two, or three ticks pass without success, lose the entire pot; the Pledge ends in failure. BANK is unavailable during an active Pledge. If a Pledge fails, the Fate marker disappears but its physical card remains wherever it is (unless already discarded or rung).

The Fate card is an ordinary numbered card with a temporary visible marker. It must actually be placed in a bell and participate in the triple ring. If burned or left in hand, it cannot satisfy the Pledge.

### Scoring

For each tick with `k` simultaneously ringing bells, add `10 × k²` points to the unbanked pot:

| Bells ringing together | Points |
|---|---:|
| 1 | 10 |
| 2 | 40 |
| 3 | 90 |

Successful PLEDGE: after awarding the 90 points for a Fate-including triple, multiply the **entire pot** by 3. Multiple successful Pledges on an unbanked pot compound multiplicatively. A failed Pledge destroys the whole current pot, including any points earned during its three-tick window. Previously banked points remain safe.

### Ending

After the 24th card is consumed, the run ends immediately. Any active Pledge that has not succeeded fails, and any remaining unbanked pot is automatically banked if it survived. Bell cards with countdowns above zero are discarded without scoring. Unused Pledge tokens are worth zero. No win/lose condition; final permanent score measures performance.

### Core strategy

Synchronize countdowns: placing 3, then 2, then 1 on successive ticking turns makes all three ring together for 90 points. Use BURN to advance the clock when that improves a future synchronization. Pledge only when the current bell state and visible hand make several unseen Fate values viable. Bank a large pot if its downside exceeds the value of further wagers. Card counting can inform the probability of each Fate value, but the exact draw order remains unknown.

## Numerical gameplay example — recorded seed 1700317

The following is a genuine full-run trace from the final rules on development seed `1700317` (not part of the untouched holdout):

| Step | Action | Result |
|---|---|---|
| 1–3 | PLACE 4, 4, 3 into bells A, B, C | Timers advance; no ring yet |
| 4 | BURN 5 | One bell rings; pot = 10 |
| 5 | PLACE 1 into A | All three bells ring; +90, pot = 100 |
| 6 | PLACE 4 into A | Pot stays 100 |
| 7 | PLEDGE, discarding 5 | New unknown Fate card revealed; three-tick deadline |
| 8–10 | PLACE 2, 2, 1 | Three bells ring, but **not** the Fate card; Pledge fails and pot of 200 is lost |
| 11–16 | Rebuild synchronization, BURN 6 once | Pot reaches 50 |
| 17 | PLEDGE, discarding 6 | Fate reveals 3 |
| 18 | PLACE Fate 3 into B | A single bell rings; pot 60 |
| 19 | PLACE 2 into A | Another single bell rings; pot 70 |
| 20 | PLACE 1 into C | All three ring, including Fate; +90, then ×3: `(70 + 90) × 3 = 480` |
| 21 | BANK | Secure 480 |
| 22–25 | Finish remaining cards | Final single ring adds 10; total 490 |

**Recorded final score: 490.** Two Pledges, one success and one failure, 200 unbanked points lost, 20 placed cards, two burned cards, two discarded as Pledge costs, all 24 cards consumed.

At step 17, five unseen cards remained: `{1:1, 3:1, 5:1, 6:2}`. After discarding the 6, Fate values 1 and 3 each permitted a guaranteed triple using the then-visible hand; 5 and 6 did not. The *conservative lower bound* on success was therefore `2/5 = 40%`, with future ordinary draws potentially offering additional rescue opportunities. The actual Fate was 3, and the player executed the winning 3-2-1 sequence.

## Reviewer: findings and resolutions

**Round 1 — MAJOR: free guaranteed wagering.** Initial Pledge rules did not require an unseen Fate card. Players could build a guaranteed triple with already visible cards and multiply the pot at little risk. A 20-seed pilot showed adaptive play succeeding on 1.85 of 1.95 Pledges per game; these were different seeds and scores used an earlier scoring scale, so they are not a matched quantitative comparison. **Fix:** Pledge now discards a card, draws an unknown Fate card after commitment, and requires Fate to participate in the triple ring.

**Round 2 — MAJOR: risk and rule feedback.** The revised 20-seed pilot showed adaptive success on 0.65 of 1.15 Pledges per run and substantial failed-Pledge losses. However, a Fate card ringing early without a triple left an unwinnable Pledge active. **Fix:** fail immediately when Fate rings without all three bells. For arithmetic clarity, replace the arbitrary 7-point base with a 10-point base, giving 10/40/90.

**Final review — mechanically approved.** The action economy is finite; there is no infinite free BANK/PLEDGE loop; Pledge locks banking; the Fate card is genuinely unseen before commitment; and the scoring, timeout, and endgame are deterministic once the deck is shuffled. Seventeen executable unit tests passed, including 100 complete games for each of six policies. Remaining concerns: risk volatility, high-score domination by large multipliers, and whether countdown optimization remains fun over repeated runs.

**Originality:** A limited web search found other numbered time/card games such as *Tempus* (2018, BoardGameGeek) and timing/timer games such as *FUSE Countdown*, but not a verified match for the three-bell countdown plus Fate-card synchronization wager. This is not an exhaustive originality or IP search. Sources: https://boardgamegeek.com/boardgame/259526/tempus and https://www.boardgamesbot.com/fuse-countdown-br .

## Player: executable final comparison

Six policies played **200 complete games each** on a previously unused holdout of matched shuffle seeds `1701000`–`1701199`, total **1,200 final games**. The earlier 200-seed development comparison (`1700300`–`1700499`) and two 20-seed pilot versions informed rule review and are excluded from final statistics. No policy was changed after the holdout was selected. No optimal solver or human test was used.

- **Random:** uniformly choose among all legal actions, including card/slot choices.
- **Conservative:** prefer immediate rings, bank at 40 points, never Pledge.
- **Aggressive:** Pledge whenever possible, otherwise maximize immediate rings, never voluntarily BANK.
- **Safe planner:** look ahead up to three visible cards, bank at 70 points, never Pledge.
- **Strategic:** plan with visible cards; Pledge only if the known-hand guarantee probability is at least 55% and pot at least 30; bank at 100.
- **Adaptive:** plan with visible cards; Pledge at an estimated known-hand guarantee probability of at least 38% and pot at least 40; bank at 140 (or 90 with no tokens). Exact hidden deck order is not available to any policy. The guarantee probability is a conservative estimate that ignores beneficial future normal draws.

| Policy | Mean | Median | P10 | P90 | Failed Pledges/run |
|---|---:|---:|---:|---:|---:|
| Random | 64.05 | 50 | 10 | 120 | 1.82 |
| Conservative | 258.25 | 260 | 220 | 300 | 0 |
| Aggressive | 85.05 | 80 | 40 | 130 | 2.92 |
| Safe planner | 378.10 | 380 | 330 | 420 | 0 |
| Strategic | 439.40 | 390 | 319 | 710 | 0.09 |
| Adaptive | 518.95 | 540 | 130 | 931 | 0.61 |

The adaptive policy beat random on 189 matched seeds, tied on 2, and lost on 9. Against safe planning it won 111, tied 32, and lost 57. Its mean advantage over safe planning was **140.85 points (37.3%)**, approximate paired 95% confidence interval **+99.85 to +181.85**. This is evidence that the tested selective-risk heuristic raises expected score, not that it is optimal or wins every run.

Risk/resource averages per run:

| Metric | Aggressive | Strategic | Adaptive |
|---|---:|---:|---:|
| Pledges | 3.00 | 0.34 | 1.25 |
| Successful Pledges | 0.08 | 0.235 | 0.655 |
| Failed Pledges | 2.92 | 0.09 | 0.605 |
| Pot points lost | 178.95 | 13.5 | 84.95 |
| Placed cards | 18.58 | 19.80 | 19.065 |
| Burned cards | 2.42 | 3.875 | 3.675 |

Every run consumed exactly 24 cards. Adaptive play used about 1.26 Pledges per game and succeeded on about 52.0% of those Pledges, while indiscriminate aggression succeeded on roughly 2.7% of Pledges. The high-scoring policy's 10th percentile of 130 was much worse than safe planning's 330, demonstrating a substantial cost to risk-taking.

**Limitations:** Only six handcrafted heuristics were compared, no policy search for optimal play was performed, and the 200 shuffled seeds are not human observations. The target of 80% skill / 20% luck is an aspiration, not a measured property. The emotional effects of tension, satisfaction, and regret are design predictions.

## Eight-dimension scorecard

| Dimension | Score | Evidence or labeled prediction |
|---|---:|---|
| Simplicity | 7/10 | Three slots, four actions, a three-tick wager; teachable with a short demonstration |
| Engagement | 7/10 | Multi-turn planning and pot management; predicted human engagement |
| Strategic depth | 8/10 | Safe planner beats greedy by 119.85 mean points; adaptive beats safe planner by 140.85 |
| Luck balance | 7/10 | Skillful Pledges vastly outperform reckless Pledges, but lower-tail risk is high |
| Excitement | 8/10 | Fate reveal, three-tick deadline, and whole-pot loss; predicted |
| Reward satisfaction | 8/10 | 90-point synchronized chimes and ×3 pot compounding; predicted |
| Sense of loss | 8/10 | Recorded 200-point loss and 84.95 average lost points under adaptive play; psychological effect predicted |
| Replayability | 6/10 | Card-order variation and planning; risk of repetitive 3-2-1 patterns |

**Overall arithmetic mean: 7.375/10, rounded to 7.38/10.**

## Remaining weaknesses

The game may be solved into a repeated 3-2-1 scheduling routine. The adaptive heuristic's high mean comes with a 130-point 10th percentile, much worse than safe planning. Four actions plus a special Fate card may be slightly too much for a true 60-second explanation, even though a 1–2-minute demonstration appears plausible. The limited originality search does not establish uniqueness. The design has no long-term build evolution, unlike Balatro.

## Smallest playable prototype and key hypothesis

Use three bell slots with visible countdown rings, a three-card hand, a deck counter, an unbanked pot, a banked score, three Pledge tokens, and PLACE/BURN/BANK/PLEDGE controls. A Fate card gets a clear temporary marker. Show the next-tick chime preview and exact unseen-card counts; do not add upgrades, shops, special cards, or art.

**Key validation hypothesis:** Players will deliberately prepare synchronized triple rings, and will sometimes choose a risky Pledge instead of banking even after understanding the 3-tick deadline and loss condition. Test 10 players over at least five runs each. Measure rules comprehension, Pledge frequency, intentional synchronized setups, hesitation before Fate reveal, and voluntary replay.

**Verdict: PASS for a minimal playable prototype, not PASS for a commercial product.**

**Delivery:** Complete report delivered in ChatGPT. Email delivery is conditional on verified Gmail authorization; do not claim delivery without a provider confirmation.
