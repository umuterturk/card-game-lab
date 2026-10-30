# Card Game Lab — Experiment 016: RATCHET

**Experiment ID:** CG-20261030-016  
**Local timestamp:** 2026-10-30 16:47 TRT (Europe/Istanbul)  
**Verdict:** PASS for a minimal prototype; not validated for commercial release  
**Overall design assessment:** 7.38/10 (subjective, with emotional dimensions predicted)

## Executive summary

RATCHET is a solo three-dial card game. The player rotates dials with numbered cards; landing exactly on zero scores 7 points, then 14 and 28 if subsequent clicks use a different dial. A scarce Overdrive action draws a blind card: if the chosen dial's raw total becomes 7, 8, or 9, the entire unbanked pot triples. Otherwise, the pot is destroyed and that dial resets. The player can bank points before taking more risks. Planning card placement creates favorable dial positions and improves future Overdrive odds.

Seven fixed policies completed 1,000 matched-deck runs each. Adaptive averaged 320.41 points; safe planner averaged 244.90; reckless aggression 174.12; random play 39.17. Adaptive beat safe planner in 579 of 1,000 matched games, tied five, and lost 416. Its mean advantage was 75.52 points, paired approximate 95% CI 63.72–87.31. Adaptive's P10 score (91) was far below safe planner's (217), so risk has genuine downside. The 80% strategy/20% luck target remains unmeasured, and human enjoyment is unknown.

## Designer — Final complete rules

**Components:** 24 numbered cards, exactly four copies each of 1, 2, 3, 4, 5, 6. Three dials labeled A, B, C, each with positions 0 through 6. Three Overdrive tokens. Displays for unbanked pot, permanent score, and combo. Visible discard history.

**Setup:** Shuffle all 24 cards uniformly. Draw three face-up cards to your hand; leave 21 as a face-down deck. All dials start at 0, permanent score and pot at 0, combo at 0, three Overdrive tokens. The deck never reshuffles. All used card values are public.

**Legal actions:**

1. **PLACE:** Choose any card in your hand and any dial. Move that dial forward by the card value, wrapping after 6 back to 0 (new position = (old position + card) mod 7). Discard the played card. If the dial lands on 0, score a CLICK. Refill the hand to three cards if the deck has cards.
2. **BANK:** If the pot is positive, transfer it to permanent score. Set pot and combo to 0. Keep all dial positions. This does not consume a card or draw a card.
3. **OVERDRIVE:** If the pot is positive, at least one token remains, the draw pile is nonempty, and the chosen dial is not at 0, spend a token and reveal the top unseen card. Add its value to that dial's current position without wrapping yet. If the raw total is **7, 8, or 9**, success: update the dial to 0, 1, or 2 respectively; award a CLICK if it landed on 0; then triple the entire pot. If the raw total is anything else, failure: lose the entire pot, reset the combo, and reset **only the chosen dial** to 0. Other dial positions remain unchanged. The revealed card is consumed and no hand card is drawn.

**CLICK scoring:** A click on the first dial after banking or failure adds 7 to the pot. A click on a different dial from the immediately preceding click adds 14 for the second click in the chain, then 28 for the third and every later alternating click. Clicking the same dial as the immediately preceding click adds only 7 and restarts the chain. Non-click placements do not interrupt the chain. The clicked dial always ends at position 0. CLICKs caused by successful Overdrive count identically; their reward is added before the pot is tripled.

**End:** Continue until the deck and hand are empty (all 24 cards consumed). Immediately and automatically bank any remaining pot. Unused Overdrive tokens are worth zero. Final score is total permanently banked points. No traditional win/loss condition. The player may BANK whenever the pot is positive, including when no cards remain in the deck but some remain in hand. There is no passing or moving a dial without consuming a card.

**Randomness:** Only the initial uniform shuffle and resulting unseen-card draws. Players see all hand cards and the complete discard history. The draw pile's order is hidden; its remaining value counts are inferable from the original distribution and public information.

**Finite resources:** 24 cards and three Overdrive tokens. Every PLACE consumes one card, every OVERDRIVE consumes one card and one token, and BANK consumes neither but can only be performed with a positive pot.

**Odds example:** With dial B at 6, Overdrive succeeds on card 1, 2, or 3. On a fresh, unrevealed deck this is 12/24 = 50%, but odds change as cards are revealed. A dial at 1 succeeds only on card 6, whereas dials at 3–6 each have three successful card values.

## Recorded gameplay walkthrough — adaptive policy, seed 1600525

Starting hand: [6,2,5].

- Place 2 then 5 on A: A reaches 0, first CLICK +7.
- Place 3 then 4 on B: B reaches 0, different dial CLICK +14. Pot 21.
- Place 6 on A, 3 then 4 on C: C reaches 0, third CLICK +28. Pot 49.
- Place 1 on A: A reaches 0, different dial CLICK +28. Pot 77.
- Place 6 on B. B is now at 6. Overdrive with 12 unseen cards; 8 are 1–3, so success chance 66.7%. Revealed 2. Raw total 8, success. Pot 77 × 3 = 231. BANK 231.
- B is at 1 after Overdrive. Place 5 on B (position 6); place 4 then 3 on A for CLICK +7. Pot 7.
- Overdrive B at 6: 6 of 8 unseen cards succeed (75%). Revealed 1. Raw total 7, CLICK +14, then pot (7+14) × 3 = 63.
- Place 6 on A. Overdrive A at 6: 5 of 6 unseen cards succeed (83.3%). Revealed 5. Raw total 11, failure: lose 63; reset A, preserve B/C. Permanent score remains 231.
- Complete three more alternating CLICKs for 7+14+28=49. When the final hand card is consumed, 49 automatically banks.

**Final recorded score: 280 = 231 + 49.** 21 PLACEs, three OVERDRIVEs, two successes, one failure, one voluntary BANK, and one automatic final bank. All 24 cards consumed.

## Reviewer — sequential critical passes

The Designer, Reviewer, and Player are separate analytical roles in this run, not independent deployed agents.

**Review round 1 (initial rules):** MAJOR — Clicks on the same wheel could retain the ×4 streak, so three dials were largely redundant. The safe planner averaged 246 points on a 300-seed pilot but repeatedly clicked one dial. MAJOR — failure resetting all dials discouraged preparation. MINOR — modulo-seven arithmetic needs a clear UI preview.

**Revision 1:** A failed Overdrive resets only the chosen dial, not all three. Pilot results changed little (safe planner 246; strategic about 282). Reviewer returned the unresolved wheel-redundancy issue.

**Revision 2:** Consecutive CLICKs on the same dial now reset the combo to +7; alternating dials earns +7, +14, +28. The placement heuristics were then updated to account for the revised rules, without any further rules change. On the 1,000-seed final test, safe planner clicked an average of 2.778 distinct dials per run and almost never clicked the same dial consecutively. Conservative one-dial play averaged only 55.31 versus 244.90 for safe planning. The three-dial decision is now mechanically meaningful.

**Final review:** No undefined action or card-budget blockers were found. All 13 executable unit tests passed, including 100 full games per policy. Remaining MAJOR product concern: some players may find modular arithmetic too abstract, and skilled play may converge to repeatable alternation patterns. MINOR concern: the game's worst-case score under adaptive risk is worse than safe planning. Originality: limited search found rotating-dial games such as Downfall (1970) and general bank-or-bust games such as Flip 7, but no exact combination of modulo-seven dial placement, alternating-click combos, and windowed Overdrive was found. This is not a comprehensive originality clearance. Reviewer approves a small prototype only.

## Player — reproducible simulation

Final source: `ratchet_016.py`, version v3. Final seeds: 1600300 through 1601299 inclusive. All seven policies used the same shuffled 24-card deck for each seed. Policies saw the hand, dial states, public used cards, and remaining value counts, but never the hidden order. All 7,000 final games terminated and conserved all 24 cards. The first 300 seeds (1600000–1600299) were used for pilot design and heuristic tuning; the final seeds were held out.

| Strategy | Mean | Median | P10 | P90 | Overdrives | Failures | Lost points |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random legal actions | 39.17 | 17.5 | 0 | 84.7 | 1.218 | 0.716 | 17.115 |
| Conservative, one-dial greedy | 55.31 | 56 | 42 | 70 | 0 | 0 | 0 |
| Safe planner, no risk | 244.90 | 245 | 217 | 273 | 0 | 0 | 0 |
| Aggressive, always risk | 174.12 | 133 | 77 | 301 | 3.000 | 1.624 | 40.166 |
| Bold, risk if probability ≥30% | 206.33 | 133 | 77 | 441 | 3.000 | 1.459 | 41.405 |
| Strategic, cautious threshold | 292.17 | 276.5 | 77 | 504 | 2.134 | 0.597 | 22.533 |
| Adaptive, pot-aware threshold | 320.41 | 280 | 91 | 560 | 1.657 | 0.362 | 22.477 |

Adaptive vs safe planner: 579 wins, five ties, 416 losses; mean difference +75.516 points, approximate paired 95% CI +63.72 to +87.31. Adaptive vs random: 945 wins, 10 ties, 45 losses; mean difference +281.239. Adaptive vs strategic: 386 wins, 270 ties, 344 losses; mean difference +28.238, approximate paired 95% CI +15.44 to +41.04.

Adaptive averaged 9.159 CLICKs, 1.657 Overdrives, 1.295 successes, 0.362 failures, 0.824 voluntary BANKs, and 22.343 normal PLACEs. Aggressive averaged three Overdrives and 1.624 failures. Adaptive's selected Overdrives succeeded approximately 78.2% of the time, versus 45.9% for aggressive.

Safe planner averaged 2.778 distinct clicked wheels; adaptive averaged 2.671. The difference between conservative and safe planner is evidence that card-placement planning matters, while adaptive's higher mean but lower P10 shows that selective risk can improve expected points while reducing reliability.

**Limitations:** Policies are fixed heuristics, not optimal solvers or human players. The difference between policies is not a calibrated 80/20 skill/luck decomposition. The adaptive heuristic was tuned on a 300-seed pilot and validated on held-out seeds; it may still be suboptimal. Emotional enjoyment, learnability, and long-term replayability have not been measured.

## Evaluation (1–10)

| Dimension | Rating | Basis |
|---|---:|---|
| Simplicity | 7 | Three actions, but modulo-seven wrap and click alternation need teaching |
| Engagement | 7 | Predicted from meaningful setup and bank decisions; no human test |
| Strategic depth | 8 | Safe planner 244.90 vs one-dial conservative 55.31; adaptive 320.41 |
| Luck balance | 7 | Selective odds matter, but adaptive P10 91 vs safe 217 |
| Excitement | 8 | Predicted from pot tripling and an 83.3%-chance failure in a real trace |
| Reward satisfaction | 8 | Predicted from 7→14→28 CLICK progression and ×3 Overdrive compounding |
| Sense of loss | 8 | Failed Overdrive loses the entire pot; recorded loss of 63 points |
| Replayability | 6 | Three dials create options but 24-card set may become solvable |

**Mean: 7.375/10, rounded to 7.38.** Psychological scores are labeled predictions, not human measurements.

## Remaining weaknesses and smallest prototype

A competent player may learn to alternate only two dials and rarely use the third. The adaptive policy clicked A and B more often than C. This could be a dominant pattern. Another risk is that the arithmetic interface feels like homework instead of an exciting game. The risk mechanism is also fairly volatile: adaptive P10 was 91 compared with safe planner's 217. Limited originality search does not establish commercial distinctiveness.

**Smallest playable prototype:** One portrait screen with three circular dials (0–6), three visible cards, a deck counter, pot, permanent score, combo indicator, three Overdrive tokens, and PLACE/BANK/OVERDRIVE controls. Tapping a hand card then a dial performs PLACE; selecting a dial and Overdrive draws blindly. Preview the next pointer, any CLICK reward, and the exact Overdrive success probability. Show an animated dial rotation, brief +7/+14/+28 and ×3 feedback, and a clear loss animation. No art assets, upgrades, currency, or progression.

**Key validation hypothesis:** Players will deliberately prepare at least two dials to preserve the click chain and will sometimes bank rather than Overdrive even with a favorable chance. Test at least 10 players over five consecutive runs, tracking distinct dials used, risk attempts, banks, explanation accuracy, hesitation, and desire for another run. Compare risk-on versus risk-disabled sessions to test whether Overdrive actually improves engagement.

**Final verdict: PASS for a minimal prototype, not a production commitment.** This run is complete; the next scheduled experiment is independent and should continue normally.

**Delivery:** The complete report is delivered in ChatGPT. Gmail profile verification required interactive authorization, unavailable in this non-interactive run. No email was sent.
