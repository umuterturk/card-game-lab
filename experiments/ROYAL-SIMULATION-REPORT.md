# Overswing Royal Cards — Extended Simulation

**Status:** completed, reproducible on GitHub Actions.
**Seed base:** 900000; **seeds per row:** 2000.
**Total completed games:** 96000 single-encounter simulations = 4 Royal unlock stages × 3 gate types × 4 decision policies × 2000 seeds.
**Implementation:** production `engines.js`, `overswingRoyals.js` and current `LAST_FLAME` scoring targets.

## What was compared

- **Baseline:** ordinary A–10 cards, no Royals, 100% target.
- **J unlocked:** one Jack in the opening hand; ±11 and next-FLIP preview after safe STEER, 105% target.
- **J + Q unlocked:** Jack and Queen in the opening hand; Q can choose ±12, 110% target.
- **J + Q + K unlocked:** at most two hand-only Royals per gate, rotating pairs across three encounters. Gate 1 contains K and J/Q, Gate 2 J+Q, Gate 3 K and J/Q. K can STEER ±13 for 13 Pot points or be retained for a decaying BANK bonus (+100% initially, −10 percentage points per FLIP/STEER, expires at 0%), 115% target.

Ordinary FLIP decks contain no Royals. The total encounter deck is **40 cards** in every configuration. A newly unlocked K is guaranteed to appear in the first gate of the next fully-unlocked journey.

Policies run for every seed:
- `flip_rush`: prioritize FLIP and BANK after several moves.
- `early_bank`: cash out small safe payouts, limit late risk.
- `cross_control`: pursue safe STEER crossings.
- `royal_aware`: uses the J reveal, both Queen directions, and evaluates King BANK timing.

All four are deliberately transparent heuristics, **not optimal agents or human behavior models**. The policies were fixed across stages so that the marginal changes can be studied.

## Representative findings (royal_aware policy)

Each cell shows **average Gold per encounter / pass rate**. Pass thresholds rise by stage, and Ember Keeper also adds a 200-Gold target penalty per SNAP.

| Unlock stage | Ash Gate | The Furnace | Ember Keeper |
|---|---:|---:|---:|
| Baseline | 2,180 / 98.40% | 2,158 / 65.05% | 2,183 / 7.10% |
| J | 2,286 / 99.20% | 2,227 / 66.70% | 2,245 / 6.00% |
| J + Q | 2,392 / 98.80% | 2,364 / 68.00% | 2,376 / 6.10% |
| J + Q + K | 2,293 / 98.35% | 2,372 / 63.30% | 2,219 / 3.15% |

Additional Royal-aware signals:

| Unlock stage | Ash Gate average SNAPs | Ash Gate K played per game | Ash Gate Crown BANK frequency |
|---|---:|---:|---:|
| Baseline | 2.85 | 0 | 0% |
| J | 2.74 | 0 | 0% |
| J + Q | 2.67 | 0 | 0% |
| J + Q + K | 2.70 | 0.34 | 66.50% |

### Interpretation

1. **J improves average Gold.** Its preview is useful with the tested policy and does not cause large systemic risk.
2. **Q adds measurable control.** J+Q has the highest average Gold in the first gate under `royal_aware`, but this also depends on how the bot values crossing.
3. **K is not yet proven balanced.** With at most two Royals, K replaces J or Q in gates 1 and 3; its decaying BANK bonus did not compensate for that opportunity cost under `royal_aware`. Average first-gate Gold drops from 2392 (J+Q) to 2293 (full pool). The boss pass rate also drops when the tier target rises. This does **not** establish that K is intrinsically weak: the card-selection mix and higher target are confounders, and the agent is not an optimal King strategist.
4. **The boss remains tough.** The low pass rates indicate the current 3000+ base and SNAP tax deserve separate balancing. Do not solve this by simply buffing J/Q/K.
5. **Policy matters.** For example, the baseline `cross_control` policy obtains only about 538 Gold on Ash Gate, versus 2180 for `royal_aware`; a simplistic STEER-heavy strategy is not a reasonable reference player.

## K Crown rebalance: +50% → +80% → +100%

The initial Crown BANK bonus was raised from **+50% to +80%**, while the per-move decay remained **−10 percentage points**. At the earliest ordinarily legal BANK (after two actions), the new Crown bonus is +60% rather than +30%.

Using the same seeds and the same `royal_aware` heuristic, with the same fully-unlocked two-Royal hand selection:

| Metric | Old K (+50%) | New K (+80%) | Difference |
|---|---:|---:|---:|
| Ash Gate average Gold | 2,252.33 | 2,275.18 | +22.85 |
| Ash Gate pass rate | 98.20% | 98.25% | +0.05 percentage points |
| Ash Gate Crown BANK frequency | 56.65% | 66.00% | +9.35 percentage points |
| Ember Keeper average Gold | 2,167.70 | 2,196.43 | +28.73 |
| Ember Keeper pass rate | 2.85% | 3.00% | +0.15 percentage points |

With the additional **+100% starting Crown**, the same 96,000-encounter seeded simulation produced the following `royal_aware` results:

| Metric | +80% Crown | +100% Crown |
|---|---:|---:|
| Ash Gate average Gold | 2,275.18 | 2,293.01 |
| Ash Gate pass rate | 98.25% | 98.35% |
| Ash Gate Crown BANK frequency | 66.00% | 66.50% |
| Ember Keeper average Gold | 2,196.43 | 2,218.66 |
| Ember Keeper pass rate | 3.00% | 3.15% |

The current +100% Crown typically gives **+80% at the earliest legal BANK**, since at least two moves are required. The original +50% and intermediate +80% results are retained above for comparison.

This is a **modest measurable improvement** in the tested policy, not a full balancing solution. K still replaces J or Q in the first and last gates, and the raised tier target remains a confounder in comparisons against the J+Q stage. The baseline numbers above were produced before the change with the same script and seeds; the current simulation artifacts contain the +80% measurements.

## Relic shop economy (current implementation)

After clearing a gate, the player may **purchase one of three offered relics or skip**. Each relic costs **20% of the *next* encounter's tier-scaled score target**, rounded to the nearest 10 Gold:

| Progression tier | Before The Furnace | Before Ember Keeper |
|---|---:|---:|
| Baseline | 360 | 600 |
| J unlocked | 380 | 630 |
| J + Q unlocked | 400 | 660 |
| J + Q + K unlocked | 410 | 690 |

The current run's available Gold equals **all BANKed Gold so far minus relic purchases**. Purchases reduce the **net run score/best-run record**, creating a real score-versus-power tradeoff, but do **not** change already-cleared gate scores or reduce permanent lifetime Gold used for Royal unlocks. Unaffordable relics cannot be selected. Players may skip a shop to preserve Gold.

**Simulation scope:** the 96,000-encounter Royal experiments above were single-gate tests and **do not model relic purchases**. They measure Royal mechanics at gross encounter scores; a full three-gate economy comparison remains a separate experiment.

## Limits

- Each gate was simulated **independently**. The experiments isolate Royal mechanics, including the appropriate gate target and boss SNAP tax, but do not simulate relic selection or full three-gate survival.
- Matched *seed values* are used, but removing ordinary cards to create hand-only Royals changes deck composition; this is not a perfect paired-deck intervention.
- J and Q were always drawn into the initial hand when unlocked. Real players will make different choices, including not playing the Royals at all.
- No empirical human strategy mix or reaction/retention data is available.
- An unlock-tier target jump and Royal effect change happen simultaneously, so raw pass rates are **not** causal estimates of an individual Royal's strength.

## Recommendation / next experiment

**Playtest the implemented rules**, playtest the K tradeoff and record whether human players cash K out, steer it, or let it expire. Then independently evaluate Crown parameters (+80/−10 vs +100/−10 vs +100/−5) against an identical encounter-target baseline. That separates the King's true strategic value from the target-tier increase and card-replacement opportunity cost.

## Reproduce

```bash
node experiments/run-overswing-royals.mjs 2000 900000
```

The command generates `artifacts/royal-simulation.json` and `artifacts/royal-simulation.csv`, with all 48 stage/gate/policy result rows and distribution metrics (median, p90, p99). GitHub Actions uploads both as the artifact `overswing-royal-simulation`.
