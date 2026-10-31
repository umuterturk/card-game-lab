# Overswing v12 — matched-seed strategy benchmark

**Date:** 2026-10-31 (Türkiye)  
**Code:** [Reproducible benchmark](overswing-v12-benchmark.mjs)  
**Raw data:** [5,000 complete games](overswing-v12-matched-1000-seeds.csv)  
**Scope:** 1,000 **identical initial decks** (seeds 710000–710999), each played once with five distinct policies: 5,000 finished single-deck games. All actions were resolved by the shipped Overswing v12 engine, not a replica. The policy implementation never inspects deck order or future cards. Preliminary code-smoke run on 120 other seeds (800000–800119) was excluded from these results.

## Strategies

| Name | Actual policy |
|---|---|
| **random** | Randomly select from available action categories (FLIP, STEER, BANK); randomly choose STEER card/BANK discard. Independent deterministic policy RNG. |
| **cash_out** | BANK at the first legal opportunity; otherwise take an available strict-crossing STEER, or a comparatively safe FLIP. |
| **flip_rush** | Almost always FLIP; BANK only on high potential with meaningful SNAP exposure or after deck exhaustion. |
| **greedy** | Choose immediate profitable STEER/FLIP moves; BANK when estimated incremental payout no longer justifies continuation. |
| **probability_aware** | Infer the *set* of unseen cards from visible hand/Pot/discard, compute expected next-FLIP outcome by enumerating that set, risk-adjust SNAP/zero loss, compare visible STEER outcomes and BANK. Never reads actual next card. |

These are **hand-coded proxies**, not five human players, trained agents, or proven optimal policies.

## Score outcomes (1,000 games per policy)

| Strategy | Mean | Median | P10 | P90 | P99 | Best | SNAP / game |
|---|---:|---:|---:|---:|---:|---:|---:|
| Random | 1,063 | 564 | 145 | 2,093 | 10,046 | 28,092 | 6.36 |
| Cash-out | 738 | 709 | 512 | 998 | 1,299 | 1,604 | 1.03 |
| FLIP rush | 3,979 | 3,529 | 958 | 7,720 | 11,032 | 12,511 | 5.84 |
| Greedy | 6,369 | 5,707 | 1,623 | 12,366 | 18,729 | 26,260 | 3.27 |
| Probability-aware | 31,362 | 8,112 | 1,056 | 58,007 | 420,481 | 1,576,085 | 4.47 |

All 5,000 runs terminated, scores equal the sum of BANK payouts, and no run hit the 120-action safety guard. One probability-aware game scored **zero**. P10/P90 denote the 10th/90th score percentiles. Means are heavily skewed by extreme high scores; **prefer medians** for typical play.

## Paired, same-seed comparisons

- **Probability-aware beats random on 91.2%** of matched seeds. Median paired score advantage +7,145; geometric mean ratio on (score+1): **13.93×**, 95% bootstrap CI **12.37–15.69×** (2,000 deterministic paired bootstrap resamples).
- **Greedy beats random on 94.4%** of seeds; median paired improvement +4,643. Greedy has fewer catastrophic low outcomes than probability-aware (P10 1,623 vs 1,056).
- **Probability-aware beats FLIP rush on 72.4%** of matched seeds; median paired advantage +3,952.5 and geometric score ratio 2.65×.
- **Greedy beats FLIP rush on 70.7%** of seeds; median paired advantage +1,939.5. This is a more credible skill measure than beating the deliberately weak random policy.
- Probability-aware beats greedy on **61.95%** of seeds (median paired advantage +2,198), but its *mean* is 4.9× greedy's due to huge tail payouts.
- Cash-out beats random on **61.25%** of seeds, despite having a **lower mean** than random. This reverses when comparing medians because random occasionally gets enormous lucky payouts.

## Luck versus decisions

We decomposed total **log(1 + final score)** variation across the balanced 1,000 × 5 strategy/seed matrix:

| Source | Share of total log-score variance |
|---|---:|
| Between strategy means | **49.26%** |
| Between seed means, averaged across strategies | **14.25%** |
| Seed × strategy residual / interaction | **36.49%** |

**Interpretation:** choosing a policy matters substantially; the common deck seed also matters; more than a third of variation occurs because *a given strategy responds differently to a particular deck*. The 14.25% seed main effect is **not** the total percentage of luck: the residual contains card-sequence chance, strategy interaction, and policy randomization. This is an explanatory decomposition of these five policies, **not** an intrinsic property or causal measure of human intelligence in the game.

## Mechanical emotion / engagement proxies

These are observable mechanical events, **not** measurements of player enjoyment, retention, or emotional state.

| Indicator | Greedy | Probability-aware | Meaning |
|---|---:|---:|---|
| Game actions | 45.9 | 44.2 | Approximate input length (not minutes) |
| JACKPOT triggers / game | 6.26 | **6.99** | Frequent salient rewards |
| SNAP events / game | 3.27 | **4.47** | Loss / frustration exposure |
| Exact-zero ZERO BREAK / game | 1.05 | **1.13** | Extra setbacks |
| High-stakes continuations / game | 9.06 | **12.19** | Refused available BANK while potential BANK payout was at least 100 |
| Largest BANK as share of total score (median per game) | 56.7% | **74.6%** | Rewards concentrated into memorable peak moments |
| Games with ≥5 JACKPOT events | 77.7% | **82.2%** | Frequent momentum escalation |
| Games with ≥3 SNAP events | 67.6% | **85.9%** | Regular losses, possibly overpunishing |
| SNAPs per 100 FLIPs | 11.4 | **14.2** | Actual observed bust frequency |
| Games above 10,000 score | 19.8% | **44.8%** | High payout frequency |

**Important:** The threshold of 100 for a "high-stakes continuation" is a prespecified convenience threshold in the script, not a psychometrically calibrated measure.

### Design implications

1. **Real skill signal exists among these policies.** Greedy beats simple FLIP spam on 70.7% of identical decks; probability-aware beats it 72.4% of the time. This is evidence that visible hand choice, timing BANK, and risk forecasting matter. It is *not* proof of human mastery, but better than a game where strategy choices are statistically indistinguishable.
2. **Pure FLIP spam is unusually rewarding.** FLIP rush median 3,529 versus cash-out 709 (~5×), even though the rush strategy suffers ~5.84 SNAPs/game. Risk-taking dominates overly cautious play. Whether this is exciting or makes STEER irrelevant requires human testing; greedy does outperform FLIP rush, so control has demonstrable benefit.
3. **Uncapped JACKPOT creates an extreme score tail.** Probability-aware median 8,112; P99 420,481 (~52× median), maximum 1,576,085 (~194× median). Mean 31,362 drastically overstates a typical game. Scores are not well calibrated for a simple global leaderboard.
4. **Rewards are bursty.** The median probability-aware game obtains 74.6% of its final score from a *single* BANK. That may drive anticipation and memorable wins, but can also make small BANKs feel pointless.
5. **Repeated failure exposure is high.** Nearly 86% of probability-aware games get at least three SNAPs. Whether that feels exciting or punishing requires people, not bots, to determine.
6. **Cautious play may be under-rewarded.** The safe policy achieved stable but low scores (median 709, SD 195) compared with high-risk styles. This can reduce viable strategic variety if players discover an effectively dominant FLIP-heavy strategy.

### Suggested next steps

- Keep the **no hard cap** rule, as intended. Before changing mechanics, test *scoring fairness*: consider leaderboard normalization/logarithmic display, per-seed percentiles, or three-deck score averaging; don't confuse presentation normalization with secretly capping multipliers.
- Validate with 15–30 human players, a short 3–5-minute session, then ask about **understood rules, sense of control, tension vs frustration, fun, and willingness to replay**. Analyze first-session completion, voluntary restart, time to first BANK, percentage of quits after SNAP, and repeat-session return.
- If using published instruments, consider an appropriately administered Game Experience Questionnaire (GEQ) or PENS-style player-experience measure. The literature warns that parts of GEQ's original factor structure have only partial support. Relevant research: Johnson, Gardner & Perry (2018), *Validation of two game experience scales: The Player Experience of Need Satisfaction (PENS) and Game Experience Questionnaire (GEQ)*, DOI 10.1016/j.ijhcs.2018.05.003.
- Benchmark future rules **with the exact same seeds and policy definitions**, comparing medians, downside P10, relative wins, SNAP rate, and payout concentration rather than tracking mean score alone.

## Reproduce

From the GitHub repository root with Node.js:

\`\`\`bash
node --input-type=module -e "import('./experiments/overswing-v12-benchmark.mjs').then(m=>{const rows=m.runBenchmark(1000,710000); const keys=Object.keys(rows[0]); console.log([keys.join(','),...rows.map(r=>keys.map(k=>r[k]).join(','))].join('\n'))})" > overswing-v12-results.csv
\`\`\`

The output should be 5,000 records (plus header) with strategy and seed per row. Exactly the original engine is imported. Results are for **v12 only**; engine or policy edits invalidate numeric comparisons. The source files used for this run were GitHub blob SHA engine \`d3cbd9bc1d5a6896460ac77ea367ac668820b1db\`, tutorial \`78d38eb7f1e84930a54eddbcf652acb2623aa2cc\`, benchmark \`65b9ca1656cbac3e839d3854a0b0e0e805991bfb\`.

No human emotional experience or retention is measured in these simulations.
