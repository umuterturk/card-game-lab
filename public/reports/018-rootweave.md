# Card Game Lab — Experiment 018: ROOTWEAVE

**Experiment ID:** CG-20261030-018  
**Local timestamp:** 2026-10-30 18:52 TRT (Europe/Istanbul)  
**Verdict:** **REVISE** — complete mechanically playable prototype; excessive score volatility remains  
**Evaluation:** 7.25/10 (design judgment, not a measured player rating)  
**Final evaluation:** 1,800 completed games (6 policies × 300 matched seeds); 21 passing unit tests, including 100 additional full runs per policy.

## Executive summary

ROOTWEAVE is a solo 3×3 spatial card puzzle. Place numbered cards to grow connected groups; two orthogonally adjacent cards link only if their values differ by exactly one. Harvest a connected group for a quadratic reward, or keep it growing while the nine-cell board fills. A scarce **GRAFT** places a randomly numbered Fate card in a chosen empty cell: if it links to at least two neighbors, the entire unbanked pot is multiplied by four; otherwise the entire pot is lost. Two scarce BANK seals secure accumulated points. The main deck contains only 30 cards.

The final holdout supports meaningful planning: a no-risk conservative spatial planner averaged **1,306.43** points versus **831.17** for a greedy early-harvest policy, and 58.9 for uniform random legal actions. Adaptive selective-risk play averaged **1,462.20**, but its median was **1,270**, lower than conservative's **1,320**, and it lost to conservative on **143 of 300** matched seeds (120 wins, 37 ties). One run scored **9,880**, creating a heavy right tail. The experiment therefore ends **REVISE**: the mechanism works, but the risk economy needs human testing and possibly a more controlled multiplier before being promoted.

## 1. Designer — complete final rules

### Components

- Main deck: **30 cards**, five copies each of values **1, 2, 3, 4, 5, 6**.
- A **3×3 grid** of nine empty cells, indexed row-major 0–8. Orthogonal adjacency only; diagonal cells never link.
- A three-card visible hand, an initially 27-card face-down draw pile, visible discards, an unbanked **pot**, permanent **score**, **two BANK seals**, and **three GRAFT tokens**.
- A separate reusable Fate-number generator that returns an **independent, uniformly random integer 1–6** for every GRAFT. Physically, use a shuffled set of six Fate cards, reveal one, then reshuffle all six before the next GRAFT. Fate cards are extra cards placed on the board; they are **not** drawn from or counted against the 30-card main deck.

### Setup and information

Uniformly shuffle the main deck; reveal three cards as the initial hand. Set the grid empty, pot and permanent score to zero, two BANK seals and three GRAFT tokens. The main deck is never reshuffled. Refill the hand after each main-card-consuming action, if any main cards remain. All played, pruned, harvested, and Fate values remain public. The order of the main deck and each independent Fate reveal is hidden.

### Links and groups

Two occupied cells **link** if they share an edge and their values differ by exactly **1**. A **group** is a maximal set of cells connected by one or more such links (transitively). A card with no links is a one-card group and cannot be harvested. Different groups can exist simultaneously. The placement of a new card can merge groups.

### Five legal actions

1. **PLACE:** Select one visible hand card and one empty cell; put the card in the cell. Consume that hand card, draw the next main-deck card if available. No points are earned just by placing. Illegal if there is no empty cell.
2. **HARVEST:** Select one currently connected group of **at least two cards**. Add `10 × (group size)²` to the **unbanked pot**, and remove all cards in that group from the grid to the discard area. Costs no main-deck card, seal, or token. There is no harvest of a one-card group.
3. **PRUNE:** Select one hand card to discard and one occupied grid cell to clear, removing the cell's card to the discard area. Draw one replacement hand card if available. PRUNE consumes **one** main-deck hand card; the removed board card was already consumed on an earlier turn. PRUNE gives no points. Requires a hand card and occupied cell. It is the deadlock escape when the board is full of isolated cards.
4. **BANK:** With a positive pot and at least one BANK seal, spend one seal, add the entire pot to permanent score, and reset pot to zero. Does not consume a card or alter the board. Permanent score is never lost.
5. **GRAFT:** With a positive pot, a GRAFT token, and an empty target cell having **at least two occupied orthogonal neighbors**, choose that cell, spend one token, then reveal an independent uniform Fate number 1–6 and place it there. Count links from the new Fate card to its occupied orthogonal neighbors **immediately after placement**. If it makes **at least two links**, multiply the entire current pot by **4**; otherwise set the pot to **0** and record the lost points. The Fate card remains on the board in either case and behaves like any other card for future links/harvests. GRAFT does not consume or refill a main-deck hand card. If a target has two occupied neighbors but no Fate value can link both, GRAFT is legal and guaranteed to fail; the interface should show 0% odds.

All five actions resolve immediately. No ticking, turn limit, forced placement, or additional exception exists. The player chooses the next legal action freely. Every card-consuming PLACE/PRUNE uses one main-deck card; GRAFT uses one of only three tokens. HARVEST strictly removes at least two cards; BANK strictly reduces the remaining seals. Thus no infinite free-action loop is possible.

### Scoring and run ending

A harvested group of size `s` scores `10 × s²` into the pot. Examples: size 2 → 40, size 3 → 90, size 4 → 160, size 5 → 250, size 6 → 360, size 7 → 490, size 8 → 640, size 9 → 810. A successful GRAFT multiplies the **whole existing pot** by 4; two successful GRAFTs without banking compound to ×16. A failed GRAFT destroys the entire **unbanked** pot, but not permanent score.

**The run ends immediately after the 30th main-deck card is spent** (by PLACE or PRUNE). Before reporting the final score, automatically harvest every remaining connected group of size at least two, add those rewards to the pot, and automatically bank the pot without spending a seal. Isolated cards are discarded without reward. Unused BANK seals and GRAFT tokens score nothing. The final performance measure is permanent score; there is no traditional win/lose state.

### Exact odds

Before a GRAFT, the board and chosen cell completely determine the success chance: enumerate the six equally likely Fate values and count those that link to at least two occupied neighbors. The chance is `eligible values / 6`. With exactly two occupied neighbors, success probability can be 0, 1/6, or 2/6; with four occupied neighbors the maximum possible probability is **4/6**, so a GRAFT can **never** be guaranteed. This upper bound was checked by exhaustively enumerating all multisets of 2–4 neighbor values from 1–6.

**Numerical example:** Suppose the center cell 4 is empty, and its four neighbors (cells 1, 3, 5, 7) contain `2, 2, 3, 3`, respectively. The pot is 90. A GRAFT into center 4 succeeds on Fate `1, 2, 3, 4` (four of six values = **66.7%**), and fails on `5, 6` (33.3%). If Fate is `4`, it links to both neighboring 3s, multiplying pot from 90 to **360**. That three-card connected group can then be harvested for `10 × 3² = 90`, bringing the pot to **450**; a BANK seal would secure 450. If Fate were `6`, the pot would immediately become zero while the 6 stayed on the board.

### Strategy and tension

Decide which cards to place where, which connected group to harvest now rather than expand, whether to spend a main card PRUNING a blocker, how to shape a favorable GRAFT target, whether to risk a large pot, and when to use one of only two seals. A full board can force a harvest that destroys an otherwise promising structure. Large groups give superlinear rewards but occupy valuable space. The spatial planner can plan several turns ahead from the visible three-card hand; Fate outcomes are irreducibly uncertain.

## 2. Worked gameplay — genuine recorded adaptive run

The final simulator replayed **seed 1800010**, outside the final holdout, using the adaptive policy and saved every legal move to `rootweave_trace_018.json`.

| Steps | Actual actions | Pot / permanent score |
|---|---|---|
| 1–5 | PLACE values 5, 4, 4, 3, 6 into grid cells 4, 1, 3, 0, 5 | 0 / 0 |
| 6 | HARVEST the five-card connected group | **250 / 0** |
| 7–11 | PLACE 5, 6, 6, 4, 4 at cells 4, 1, 3, 5, 7 | 250 / 0 |
| 12 | GRAFT at cell 8: Fate **4**, zero links, **failure** at p=1/3 | **0 / 0**, 250 lost |
| 13 | HARVEST five-card group | **250 / 0** |
| 14–16 | PLACE 1, 2, 2 at cells 4, 1, 3 | 250 / 0 |
| 17 | GRAFT at cell 0: Fate **4**, zero links, **failure** at p=1/3 | **0 / 0**, another 250 lost |
| 18–20 | PLACE 2, 1; HARVEST five-card group | **250 / 0** |
| 21–24 | PLACE 3, 5, 6, 2 into cells 1, 3, 4, 2 | 250 / 0 |
| 25 | GRAFT at cell 5: Fate **3**, two links, **success** at p=1/3 | **1,000 / 0** after ×4 |
| 26 | BANK the pot using first seal | **0 / 1,000** |
| 27 | HARVEST seven-card connected group | **490 / 1,000** |
| 28 | BANK with second seal | **0 / 1,490** |
| 29–40 | Spend remaining main cards; HARVEST a three-card group for 90, then final automatic harvests for another 180 | **0 / 1,760** |

**Actual final score: 1,760.** Thirty main cards placed, three independent Fate cards grafted, seven harvested groups, two BANK seals spent, two failed GRAFTs losing 500 points total, one successful GRAFT, all main cards consumed. The final trace has 40 legal actions. No intermediate board or outcome was fabricated.

## 3. Reviewer — independent critical role passes (sequential, not separate AI agents)

**Round 1 — MAJOR / BLOCKER: GRAFT could become a free guaranteed multiplier.** The first version drew the Fate number from the remaining main deck. Card counting could leave only successful values, as demonstrated by a development trace with a **100%** GRAFT success chance. This violated meaningful voluntary risk. **Resolution:** use an independent uniform six-value Fate draw for each GRAFT. A mathematical exhaustive check confirms no target can succeed on all six values; the maximum is 4/6. Re-reviewed: blocker resolved.

**Round 2 — MAJOR: risk was almost never attractive in the redesigned prototype.** At ×3, the 100-seed pilot showed adaptive play averaging **1,323.9** versus conservative **1,335.6**, with only **0.02 GRAFTs/run** under the cautious threshold. A player had little reason to use the signature mechanic. **Resolution:** increase the GRAFT multiplier to ×4; GRAFT success is still never guaranteed. Tune only the heuristic thresholds on development seeds. Re-reviewed: risk now used, meaningful failures observed; original blocker resolved.

**Round 3 — FINAL REVIEW:** The rules are mechanically complete, bounded, deterministic conditional on shuffles/Fate reveals, and feasible in a small app. All 21 unit tests passed, including six strategies ×100 independent complete games. No unresolved rules blocker. **Remaining major balance concern:** rare compounded jackpots dominate expected score and may feel more like gambling than spatial mastery. **Minor concerns:** five action verbs are slightly above the ideal introductory simplicity; PRUNE is a necessary but infrequent emergency action; uniform-random legal-action play is an intentionally weak comparator because it over-selects PRUNE. Verdict remains **REVISE** after two rule redesign loops, not a claim of production readiness.

**Originality review:** Unlike earlier experiments Twinlock, Stepwire, Tenfold, Stormfreight, Cinderloop, Switchback, Beaconfall, Rebound, Presspoint, Shortfuse, Oddity, Seam, Glassfire, Foldline, Counterweight, Ratchet, and Chime, ROOTWEAVE focuses on connected-component spatial growth and clearing. No exhaustive search of external commercial games or intellectual-property review was performed; originality is a design hypothesis, not a verified market claim.

## 4. Player — actual final simulation

**Final untouched holdout:** Seeds **1801000–1801299**, **300 complete games per strategy**, six policies, **1,800** complete games. Each seed gives every policy the same initial uniformly shuffled main deck and same independent Fate RNG stream; policies can use only revealed information, never the unseen order or future Fate values. Development/tuning seeds **1800200–1800299** were excluded. A separate 600-game acceptance-test sample used seeds **1810000–1810099** for each policy. Every run consumed exactly 30 main cards and terminated. Source and raw per-run scores are included.

Policies:

- **Random:** uniformly select among all legal concrete actions, including hand/target choices. This is an intentionally weak benchmark biased toward PRUNE by action count.
- **Greedy:** place to maximize immediate spatial links; harvest a group as soon as it reaches three cards; bank at 100; never GRAFT.
- **Conservative:** maximize group growth, harvest only large groups or when crowded, bank at 90; never GRAFT.
- **Aggressive:** use every possible GRAFT as soon as legal, without a probability threshold; otherwise build and harvest; never voluntarily BANK.
- **Strategic:** two-card prospective placement heuristic; GRAFT at ≥1/3 probability only when pot is 100–300; prefer safe banking when appropriate.
- **Adaptive:** two-card prospective placement heuristic; GRAFT at ≥1/3 probability with a pot ≥50, use slightly stricter threshold for larger pots, bank around 360–700 depending on opportunities and tokens.

| Policy | Mean | Median | P10 | P90 | GRAFTs/run | Successful GRAFTs/run | Points lost/run |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random | 58.9 | 40 | 0 | 130 | 0.19 | 0.03 | 10.5 |
| Greedy | 831.2 | 810 | 760 | 900 | 0.00 | 0.00 | 0 |
| Conservative | 1,306.4 | 1,320 | 1,160 | 1,430 | 0.00 | 0.00 | 0 |
| Aggressive | 1,393.8 | 1,350 | 970 | 1,811 | 3.00 | 0.44 | 221.1 |
| Strategic | 1,415.5 | 1,305 | 900 | 2,090 | 1.21 | 0.37 | 197.3 |
| Adaptive | 1,462.2 | 1,270 | 750 | 2,182 | 1.51 | 0.45 | 279.7 |

**Paired strategy evidence:** Conservative beat Greedy in **300/300** matched games, average +475.27 points, approximate paired 95% CI +462.07 to +488.47. This is stronger evidence for the value of planning than comparison to the weak random policy. Adaptive beat Random in **300/300** games. Adaptive versus Conservative: **120 wins, 37 ties, 143 losses**, mean difference **+155.77** points, approximate paired 95% CI **+54.57 to +256.97**. The mean improvement is driven by the upper tail, not by consistently winning. Aggressive versus Conservative: 161 wins, 4 ties, 135 losses, mean difference +87.37.

**Risk and resource use:** Aggressive used all three GRAFT tokens each run and succeeded **0.44** times/run (14.8% of attempts), losing 221.1 points/run. Strategic used 1.21 GRAFTs/run, succeeded 0.37 (30.5% of attempts), and lost 197.3 points/run. Adaptive used 1.51 GRAFTs/run, succeeded 0.45 (29.8% of attempts), and lost 279.7 points/run. Conservative used both BANK seals and averaged approximately 6.25 harvests/run and a maximum harvested group size of 5.22; Greedy harvested approximately 9.24 smaller groups/run, average maximum size 3.28. Pruning was almost never needed by competent policies, but random play pruned 12.27 main cards/run. Adaptive's maximum final score was **9,880**, versus a minimum of **90**, an extreme spread.

**Interpretation and limits:** The conservative-versus-greedy comparison demonstrates that deliberate spatial planning can substantially outperform a simpler deterministic heuristic. Risk can raise expected score but causes frequent losses, and the best tested risk policy was less reliable than safe play. The six policies are handcrafted, not exhaustive optimal solvers. No human playtesting was done. The requested 80% strategy / 20% luck split is a design target, **not** a measured property. The mean differences and normal-approximation confidence intervals describe these seeded policy comparisons only, not real players or commercial success.

## 5. Ratings (1–10)

| Dimension | Rating | Grounding |
|---|---:|---|
| Simplicity | 7 | One grid, one adjacency rule, five actions; PRUNE and Fate need explanation |
| Engagement | 7 | Predicted from space pressure and group-growth choices; no humans tested |
| Strategic depth | 8 | Conservative beat Greedy by 475 points on all 300 matched seeds |
| Luck balance | 5 | Adaptive's P10 was 750 vs Conservative's 1,160; jackpot tail to 9,880 |
| Excitement | 8 | Predicted tension from choosing a cell before hidden Fate reveal |
| Reward satisfaction | 8 | Quadratic harvest and ×4 pot visibly compound; subjective reaction predicted |
| Sense of loss | 8 | Failed GRAFTs erased 279.7 pot points/run under Adaptive |
| Replayability | 7 | Shuffled hand, spatial configurations, optional wagers; long-term novelty untested |
| **Arithmetic mean** | **7.25** | Not a measured human preference score |

## 6. Remaining weaknesses and smallest playable prototype

**Primary unresolved issue:** GRAFT has a highly asymmetric payoff: repeated successes can produce very large outliers. Adaptive's average exceeds Conservative's, but Adaptive has lower median and worse P10. A reasonable next revision would evaluate limiting compounding per unbanked pot, using a smaller multiplier, or adding a finite pot cap, then rerun matched holdouts. These are **proposals, not changes to the tested rules**. Another unresolved question is whether the 2/3 GRAFT setup is discoverable and satisfying rather than an easily memorized recipe. PRUNE is rarely used and may be visually hidden behind an emergency menu.

**Smallest playable prototype:** A single 3×3 board, three-card hand, deck counter, two BANK seals, three GRAFT tokens, visible pot and permanent score, touch-to-place, tap-a-group to HARVEST, choose-cell-and-reveal GRAFT, and a simple PRUNE action. Show predicted link edges and exact GRAFT odds before committing. No art, shop, upgrades, progression, or backend is necessary. A working text-based interactive prototype is included as `rootweave_cli_018.py` (run `python rootweave_cli_018.py 1800010`), alongside the deterministic simulation and tests.

**Key validation hypothesis:** Without extensive instruction, players will deliberately postpone harvesting to build larger groups, intentionally prepare favorable GRAFT targets, and voluntarily replay after a pot loss. Test with 10–15 people playing at least three runs, measuring comprehension time, harvest-size progression, voluntary GRAFT frequency, recognition of the 2/3 setup, and willingness to play again.

## 7. Reproduction and delivery

Run `python rootweave_018.py --games 300 --seed 1801000` to regenerate the holdout; run `python -m unittest -v test_rootweave_018.py` for the 21 acceptance tests; run `python rootweave_cli_018.py 1800010` to play. Files: `rootweave_018.py`, `test_rootweave_018.py`, `rootweave_cli_018.py`, `rootweave_results_018.json`, `rootweave_trace_018.json`, and this report. The simulator uses only Python's standard library. No external originality verification or human study was performed.

**Email:** Gmail authorization was checked but required interactive user input in this non-interactive run. Therefore **no email was sent**; the complete report is delivered in ChatGPT. The next scheduled experiment is not blocked by this REVISE verdict.