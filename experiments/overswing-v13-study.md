# Overswing v13 — 42,000-game matched-seed study

## Experimental design

- Same **3,000 fixed initial-deck seeds: 710000–712999**.
- **v13:** 9 hand-coded strategies × 3,000 = **27,000 completed games**.
- **v12:** same 3,000 seeds × original 5 strategies = **15,000 completed games**.
- **42,000 completed games total**. The scripts execute the shipped game engine; policies do not inspect the next card or the future deck order.
- Change in live v13: every successful strict **FLIP zero-crossing adds one JACKPOT tier** (×1 → ×2 → ×3 → ×4…), not doubling (×1 → ×2 → ×4 → ×8…). **No multiplier cap**.

The results measure *simulated scores and mechanical events*, not enjoyment, excitement, engagement or retention in human players.

## A. Same-seed v12 versus v13

| Strategy | v12 median | v13 median | v12 P99 | v13 P99 | v12 mean | v13 mean |
|---|---:|---:|---:|---:|---:|---:|
| Random | 554 | 549 | 9,689 | 4,730 | 1,070 | 831 |
| Early BANK | 710 | 710 | 1,290 | 1,290 | 736 | 736 |
| FLIP rush | 3,623 | 2,987 | 11,417 | 8,584 | 4,074 | 3,243 |
| Greedy | 5,809 | 4,607 | 19,319 | 12,094 | 6,476 | 4,885 |
| Probability-aware | 7,842 | **5,938** | **412,772** | **28,678** | 33,733 | 7,556 |

For probability-aware, v13 P99 decreased **93.1%**, while the median decreased approximately **24.3%**. P10 **improved** from **1,176** to **1,975** as the policy changed its decisions based on the modified payout formula. P99/median decreased from **~52.6 to ~4.8**. Extremely rare outcomes still exist, but no hard limit is needed. Early BANK scores did not change because its policy almost never benefits from repeated JACKPOT crossings.

## B. Nine strategies in v13

| Strategy | Median | P10 | P90 | P99 | SNAP/game |
|---|---:|---:|---:|---:|---:|
| Random | 549 | 148 | 1,745 | 4,730 | 6.28 |
| Early BANK | 710 | 518 | 979 | 1,290 | 1.07 |
| FLIP rush | 2,987 | 867 | 5,938 | 8,584 | 5.82 |
| Greedy | 4,607 | 1,597 | 8,437 | 12,094 | 3.13 |
| Probability-aware | **5,938** | **1,975** | **14,946** | **28,678** | 4.40 |
| Fixed-BANK FLIP | 2,289 | 1,004 | 3,893 | 5,253 | 6.14 |
| Fixed-BANK STEER | 2,532 | 1,270 | 4,038 | 5,251 | 5.31 |
| Fixed-BANK risk labels | 2,454 | 1,400 | 3,691 | 4,824 | **2.12** |
| Fixed-BANK exact risk | 2,677 | 1,450 | 4,093 | 5,231 | 3.05 |

The last **four** arms share the **same BANK decision rule**: BANK when currently bankable payout ≥400, or when neither FLIP nor STEER remains. Discard choices also follow the same rule. Only FLIP-versus-STEER decision-making differs:

- **FLIP:** FLIP while deck has cards; STEER only when needed.
- **STEER:** take the highest-valued successful strict-crossing STEER when available; otherwise FLIP.
- **Risk labels:** a hypothetical UI-style coarse SNAP signal with low (under 15%), medium (15–34%), high (35%+) derived from unseen cards. Prefer a safe STEER for medium/high risk; otherwise FLIP.
- **Exact risk:** use probability-weighted projected FLIP payout from unseen cards and known STEER outcomes; choose STEER if its projected payout is higher or FLIP SNAP probability ≥30%.

BANK **predicate** is controlled, but actual BANK *timing and frequency* can still differ because the strategies visit different states. These are artificial policies, not representative human players.

### Same-seed paired results versus fixed-BANK FLIP

| Strategy | Win rate | Median paired lift | Mean paired lift | SNAP/game |
|---|---:|---:|---:|---:|
| Fixed-BANK FLIP | — | — | — | 6.14 |
| Fixed-BANK STEER | **57.92%** | **+211** | +218 | 5.31 |
| Fixed-BANK risk labels | **53.67%** | **+153** | +119 | **2.12** |
| Fixed-BANK exact risk | **60.45%** | **+379** | +346 | 3.05 |

The qualitative risk-label policy reduces SNAPs by **approximately 65.4%** compared to fixed-BANK FLIP, but its median paired score gain is modest. It wins against the fixed-BANK STEER policy on only **47.92%** of matched seeds, so a risk indicator is **not a proven score improvement**; it may help avoid frustrating losses, but it could also remove excitement.

Additional paired results: **greedy beats FLIP rush on 70.1%**, and **probability-aware beats greedy on 65.38%**, using the same 3,000 seeds. There is meaningful strategic separation without a JACKPOT doubling formula.

## C. Mechanical tension and score concentration

For the v13 probability-aware policy, averaged across 3,000 games:

- **6.49 JACKPOT events**, **4.40 SNAP events**, **4.86 BANK events** per game.
- **11.22 decisions/game** to continue instead of taking an available BANK payout of at least 100 points.
- Median share of the total score from the **largest single BANK is 59.1%** (v12: **74.1%**).
- Mean potential points lost on SNAP: **732** (v12: **6,768**, different score scale).

Analysis of log(1 + score) over the balanced 3,000 × 9 matrix: **49.43%** between-policy mean difference, **11.32%** between common seed means, **39.26%** remaining interaction/residual. **These are not causal skill/luck percentages.**

## D. Decisions

1. **Keep linear, uncapped JACKPOT** in v13. It dramatically improves score spread without eliminating sudden rewards.
2. **Keep STEER rules unchanged for now.** It improves outcomes under an otherwise fixed BANK rule (+211 points median paired difference, 57.9% wins), though the gain is not enormous.
3. **Do not ship a SNAP-risk label as a proven engagement boost.** Experiment with a low/medium/high label on real players; the simulation suggests lower bust frequency, not proven higher fun or retention.
4. **Do not change BANK capacity decay yet.** Prior two-BANK-per-capacity-drop experiments moved score medians very little.
5. **Human validation next:** comprehension, time to first BANK, SNAP abandonment, voluntary replay, feeling of control, and tension versus frustration.

## E. Files and reproduction

Source: [v13 benchmark with 9 strategies](overswing-v13-benchmark.mjs), [CLI runner](run-overswing-v13.mjs).

To generate all 27,000 v13 rows from the latest engine:

    node experiments/run-overswing-v13.mjs 3000 710000 > v13-results.csv

To generate just the fixed-BANK arms:

    node experiments/run-overswing-v13.mjs 3000 710000 fixed_bank_flip,fixed_bank_steer,fixed_bank_signal,fixed_bank_exact > fixed-bank.csv

v13 raw result batches:
- [710000–710999](results/overswing-v13-710000-710999.csv)
- [711000–711999](results/overswing-v13-711000-711999.csv)
- [712000–712999](results/overswing-v13-712000-712999.csv)

Historical v12 baseline:
- [710000–710999](overswing-v12-matched-1000-seeds.csv)
- [711000–711999](results/overswing-v12-711000-711999.csv)
- [712000–712999](results/overswing-v12-712000-712999.csv)

Old-engine baseline was executed using **v12 commit [e070e47](https://github.com/umuterturk/card-game-lab/tree/e070e47b113511be336ff1595c9b417e5cd5ab22)** and [the original v12 benchmark](overswing-v12-benchmark.mjs). Do **not** run the original v12 benchmark against current main; it imports the *new* engine and would no longer reproduce v12.

**Integrity checks:** all 42,000 games completed, all v13 scores exactly equal accumulated BANK payouts, no v13 run hit the 120-action safety guard, each strategy played all 3,000 seeds. Paired win rates count ties as half a win. No human engagement was measured.
