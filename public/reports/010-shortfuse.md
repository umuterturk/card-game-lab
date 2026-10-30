# Card Game Lab — Experiment 010: SHORTFUSE

**ID:** CG-20261030-010  
**Timestamp:** 2026-10-30 09:43 TRT (Europe/Istanbul)  
**Verdict:** PASS — minimal prototype candidate  
**Qualitative rating:** 7.4/10  
**Evidence:** 6,000 final-version complete simulated games, six strategies, 1,000 common shuffled-deck seeds; plus 5,000 preliminary games on the rejected first version.

## Executive summary

SHORTFUSE is a compact solo contract game. Three reusable contracts require card sums of exactly 7, 9, and 11. Every time a contract is completed, the player can **Bank** the current chain or **Carry** it for a larger multiplier. Carry starts a two-card fuse: complete another contract within the next two card placements or lose the unbanked chain. The game uses 24 number cards and a three-card hand; no extra content is required.

The first version had almost no real risk: a skilled policy could carry indefinitely and almost never lose. The reviewer rejected that version. Adding the two-card fuse created meaningful consequences without introducing a random punishment die or requiring special cards. The final adaptive heuristic averaged 118.28 points, versus 78.60 for always-banking conservative play and 26.47 for random play. It defeated the conservative policy in 867 of 1,000 matched games. A no-speculation policy averaged 107.24, demonstrating that deliberately taking uncertain carries can add value but increases downside.

## Designer — Complete final rules

### Components and setup

- Deck: 24 cards, four copies each of values 1, 2, 3, 4, 5, 6.
- Board: three reusable contract lanes with targets **7**, **9**, and **11**. Each starts with a sum of zero.
- Shuffle the deck and draw three cards into a face-up hand. The remaining cards form the face-down draw pile.
- Start with permanent score 0, unbanked pot 0, chain stage 0, and no active fuse.
- Cards played into lanes remain committed. A completed lane discards its cards and returns to zero. Scrapped lanes discard their committed cards.

### Actions and turn order

On each turn, choose exactly one action:

1. **Place:** Play one hand card into one lane, provided the new sum does not exceed that lane's target. A card cannot be split between lanes. If the lane does not reach its target, its sum stays in place. If it reaches the target exactly, resolve a completion before drawing the replacement card.
2. **Scrap:** Discard one hand card and clear one chosen lane, even an empty lane. This permanently destroys any current unbanked pot and resets the chain and fuse. Scrap is always legal while a hand card remains. It is useful when no placement is legal or when the player wants to free a blocked lane.

After either action, refill the hand to three cards while the draw pile contains cards. All cards are consumed exactly once.

### Completing a contract

Completing a lane awards its target multiplied by the current chain multiplier:

- First completion in a chain: **×1**.
- Second completion in the same chain: **×2**.
- Third completion in the same chain: **×4**, then the entire pot **automatically Banks**.

After the first or second completion, **before drawing a replacement card**, choose:

- **Bank:** Add the entire unbanked pot to permanent score, reset pot, chain and fuse. The three lane sums (other than the just-completed lane) remain as they are.
- **Carry:** Keep the unbanked pot and current chain stage. Start a **two-placement fuse**. You must complete any lane on either of your next two Place actions. A successful completion refreshes the fuse if you Carry again. If both Place actions fail to complete a lane, the entire unbanked pot is lost and the chain resets. All lane sums remain in place. Scrap while carrying also loses the pot immediately.

If a completion happens on the second placement, it succeeds; the fuse does not expire before completion is resolved. Banking does not consume a card or a separate turn. It is a choice offered only at the moment a contract is completed.

### Ending the run

When the draw pile and hand are empty, the game ends. Any unbanked pot is lost, but permanent score remains. Incomplete lanes score nothing. Unused opportunities do not grant points. There is no traditional win/lose state; final permanent score measures performance.

### Strategy and risk

The player chooses which lane receives each card, which lanes to prepare for future completions, and when to Carry. A prepared lane that can be completed using a visible hand card makes a Carry safe; a speculative Carry may require a favorable replacement card. The player has only 24 cards and must balance preparation against immediate scoring. The downside is losing the current chain, not losing previously banked points.

### Numerical example

With all lanes empty, play 6 into target 7 and then 1 into the same lane. The contract completes for **7 points**. Choose Carry. Within the next two card placements, play 4 and 5 into target 9, completing it for **9 × 2 = 18 points**. The pot is now **25**. Carry again. Play 5 and 6 into target 11, completing it for **11 × 4 = 44 points**. The third completion auto-banks **69 points**.

If the second contract had not been completed by the second placement, the initial 7-point pot would have been lost. The committed lane cards would remain in their lanes.

## Reviewer — Two versions, two passes

### V1: No deadline (rejected)

The initial design allowed carrying a chain without time pressure. Across 1,000 matched seeds per policy, adaptive play averaged **170.85**, conservative **78.60**, but adaptive suffered only **0.019 chain losses per run**. The apparent reward multiplier was close to free for a competent policy. This was a major design failure: little meaningful risk.

**Fix:** After Carry, require another contract completion within the next two card placements. Keep all other rules, including a three-completion cap. Choices are made before hand refill.

### V2: Two-placement fuse (approved for prototype)

Review findings:

- **Clarity:** Three targets, two turn actions, and a Bank/Carry choice are teachable in 1–2 minutes. The fuse countdown needs clear UI.
- **Exploitability:** Three completions automatically bank, preventing indefinite multiplier escalation. All cards are consumed once. The simulator verifies card accounting and legal states. Prepared lanes can make some Carries certain, but that requires earlier resource investment.
- **Strategy:** Lane assignment, exact-sum construction, timing, and preparing multiple lanes all affect outcomes.
- **Risk/reward:** Adaptive speculative Carries increase mean score but cause 1.708 fuse failures and 25.38 lost pot points per run on average. Aggressive play is much less reliable.
- **Psychology:** A two-card countdown creates urgency, and a third completion yields a visible ×4 payoff. Emotional response is predicted, not measured.
- **Originality:** The combination of exact-sum lanes, bank/carry chains, and a short completion fuse differs from the prior experiments. It draws on familiar solitaire-sum and push-your-luck ideas. No exhaustive commercial originality clearance was conducted.
- **Replayability:** Different hands create changing opportunities, but three fixed targets may become repetitive.

**Reviewer conclusion:** No unresolved rule blockers; PASS for a low-cost prototype, not for commercial release. The biggest unresolved question is whether lane preparation creates satisfying decisions over repeated runs.

## Player — Reproducible testing

Python 3 standard-library simulator. For each strategy, **1,000 complete games**, seeds **1000000–1000999**, using the same shuffled deck for every strategy. Six policies: Random (mostly random legal moves and random banking), Conservative (competent placements, always Bank), Aggressive (greedy placement, always Carry), Strategic (greedy placements and limited lookahead), Insured (adaptive placements, Carry only if a completion is guaranteed from the visible hand within two placements), Adaptive (prepares lanes and sometimes Carries speculatively).

| Policy | Mean | Median | P10 | P90 | Std. dev. | Fuse failures/run | Lost points/run |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random | 26.47 | 22 | 7 | 56 | 20.03 | 1.163 | 17.58 |
| Conservative | 78.60 | 80 | 72 | 84 | 5.50 | 0 | 0 |
| Aggressive | 79.47 | 67 | 0 | 130 | 45.65 | 2.873 | 45.27 |
| Insured | 107.24 | 106 | 81 | 134 | 21.20 | 0 | 0 |
| Strategic | 112.80 | 121 | 70 | 154 | 34.24 | 1.749 | 26.35 |
| Adaptive | 118.28 | 124 | 73 | 161 | 33.72 | 1.708 | 25.38 |

### Matched-seed comparisons

- Adaptive versus Conservative: **867 wins, 10 ties, 123 losses**; mean advantage **+39.68** (approximate paired 95% CI **+37.68 to +41.68**).
- Adaptive versus Random: **981 wins, 1 tie, 18 losses**; mean advantage **+91.82**.
- Adaptive versus Insured: **631 wins, 12 ties, 357 losses**; mean advantage **+11.04** (approximate paired 95% CI **+9.07 to +13.00**).
- Aggressive versus Conservative: **468 wins, 0 ties, 532 losses**; mean advantage **+0.87**, not convincingly different from zero.

Adaptive completed **9.644 contracts**, chose Carry **6.346 times**, and banked **3.298 times** per run on average. Of those Carries, **2.143** were guaranteed by visible cards and **4.203** were speculative. **4.636** fuse deadlines succeeded and **1.708** failed on average. It scrapped **0.033** cards per run. Every run consumed all 24 cards.

### Recorded legal playthrough — seed 1000000, Adaptive

Initial hand: **[1, 2, 1]**. Final score: **134**.

| Segment | Actual actions | Result |
|---|---|---|
| 1 | Target 7: place 2. Target 9: place 6 then 3. | Complete target 9 for 9 points; Carry (two-placement fuse). |
| 2 | Place 1 and then 3 into target 7, whose prior sum was 2. | Sum reaches 6, not 7; fuse expires, lose 9 points. |
| 3 | Place 3 and then 1 to finish target 7. | Complete for 7; Carry. |
| 4 | Place 6 then 1 into target 7. | Complete for 14; pot 21; Carry. |
| 5 | Place 5 then 2 into target 7. | Complete for 28; third completion auto-banks **49**. |
| 6 | Complete target 7 for 7; then complete target 7 for 14. | Carry twice; pot 21. |
| 7 | Complete target 9 with 5 then 4. | Third completion pays 36; auto-bank **57**, permanent score 106. |
| 8 | Complete target 7 for 7, Carry; then complete target 7 for 14, Bank. | Add **21**, permanent score 127. |
| 9 | Complete target 7 again for 7 and Bank; use remaining cards. | Add **7**; final score **134**. |

The recorded trace includes intermediate placements, refills, hand values, remaining draw pile size, and fuse states.

### What the evidence does and does not establish

The adaptive policy scored **4.47×** the random baseline and **1.50×** the conservative baseline on average. A deliberately speculative strategy beat the no-speculation Insured policy in 63.1% of matched games. This supports meaningful strategy and risk choice, but **does not prove an 80/20 skill/luck ratio**. Policies are hand-written heuristics, not optimal solvers. No humans were tested, so emotional and replayability judgments remain predictions.

## Eight design scores

| Dimension | Score / 10 | Basis |
|---|---:|---|
| Simplicity | 8 | Three lane targets, two turn actions, one post-completion choice. |
| Engagement | 7 | Countdown and competing placements; human enjoyment untested. |
| Strategic depth | 8 | Strong policy separation and meaningful lane preparation. |
| Luck balance | 7 | Skill matters, but uncertain Carries and card order remain consequential. |
| Excitement | 8 | Two-card fuse and third-completion multiplier; predicted. |
| Reward satisfaction | 8 | 1×, 2×, 4× chained payouts; predicted. |
| Sense of loss | 7 | Fuse expiry destroys a tangible pot without undoing banked progress; predicted. |
| Replayability | 6 | Small board may develop a dominant preparation pattern. |

**Mean: 59/8 = 7.375, reported as 7.4/10.**

## Remaining weaknesses

1. Some Carries are guaranteed once a lane is prepared. This can be a satisfying skill reward, but could reduce tension if it becomes routine.
2. Only three fixed targets exist. Over many runs, skilled players might discover repetitive lane-assignment patterns.
3. The adaptive policy's average gain over the Insured policy is only 11 points. Uncertain Carries are profitable in the tested heuristic but not overwhelmingly so.
4. A smarter search-based agent might find a dominant strategy or a weakness in the current scoring incentives.
5. The game has no content progression; long-term retention is untested.

## Smallest playable prototype and key hypothesis

Build a portrait-mobile screen with three contract meters (7, 9, 11), a three-card hand, a deck counter, a pot, a permanent score, and a two-segment fuse indicator. Cards can be tapped then assigned to a lane. After completion, show two clear choices: **BANK** or **CARRY (2 cards)**. Do not add art, upgrades, currencies, or special cards.

**Primary validation hypothesis:** Players will intentionally prepare one or two nearly finished contracts before completing another, then choose Carry to chase a third-completion ×4 payoff. Measure the percentage of Carries that were prepared versus speculative, time spent deciding at Bank/Carry, and how often players change strategy after a lost chain.

**Verdict: PASS — minimal prototype candidate.** Mechanical simulation is encouraging; human fun and long-term replayability are not established.

## Reproducibility and delivery

Run `python lockstep_010.py --games 1000 --base-seed 1000000` to regenerate the final results. Files: `lockstep_010.py`, `lockstep_results_010.json`, and `test_lockstep_010.py`. Five unit tests passed, including 600 additional card-conservation runs (100 seeds × six policies). The preliminary V1 code was not preserved separately; its reported values are from the earlier executed test, not independently reproducible from the final script.

This report is delivered in ChatGPT. Gmail authorization was not available in this non-interactive run, so no email was sent.
