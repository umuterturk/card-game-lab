# Overswing Royal Cards — Extended Simulation

**Status:** completed, reproducible on GitHub Actions.
**Seed base:** 900000; **seeds per row:** 2000.
**Total completed games:** 96000 single-encounter simulations = 4 Royal unlock stages × 3 gate types × 4 decision policies × 2000 seeds.
**Implementation:** production `engines.js`, `overswingRoyals.js` and current `LAST_FLAME` scoring targets.

## What was compared

- **Baseline:** ordinary A–10 cards, no Royals, 100% target.
- **J unlocked:** one Jack in the opening hand; ±11 and next-FLIP preview after safe STEER, 105% target.
- **J + Q unlocked:** Jack and Queen in the opening hand; Q can choose ±12, 110% target.
- **J + Q + K unlocked:** at most two hand-only Royals per gate, rotating pairs across three encounters. Gate 1 contains K and J/Q, Gate 2 J+Q, Gate 3 K and J/Q. K can STEER ±13 for 13 Pot points or be retained for a decaying BANK bonus (+50% initially, −10 percentage points per FLIP/STEER, expires at 0%), 115% target.

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
| J + Q + K | 2,252 / 98.20% | 2,372 / 63.30% | 2,168 / 2.85% |

Additional Royal-aware signals:

| Unlock stage | Ash Gate average SNAPs | Ash Gate K played per game | Ash Gate Crown BANK frequency |
|---|---:|---:|---:|
| Baseline | 2.85 | 0 | 0% |
| J | 2.74 | 0 | 0% |
| J + Q | 2.67 | 0 | 0% |
| J + Q + K | 2.70 | 0.37 | 56.65% |

### Interpretation

1. **J improves average Gold.** Its preview is useful with the tested policy and does not cause large systemic risk.
2. **Q adds measurable control.** J+Q has the highest average Gold in the first gate under `royal_aware`, but this also depends on how the bot values crossing.
3. **K is not yet proven balanced.** With at most two Royals, K replaces J or Q in gates 1 and 3; its decaying BANK bonus did not compensate for that opportunity cost under `royal_aware`. Average first-gate Gold drops from 2392 (J+Q) to 2252 (full pool). The boss pass rate also drops when the tier target rises. This does **not** establish that K is intrinsically weak: the card-selection mix and higher target are confounders, and the agent is not an optimal King strategist.
4. **The boss remains tough.** The low pass rates indicate the current 3000+ base and SNAP tax deserve separate balancing. Do not solve this by simply buffing J/Q/K.
5. **Policy matters.** For example, the baseline `cross_control` policy obtains only about 538 Gold on Ash Gate, versus 2180 for `royal_aware`; a simplistic STEER-heavy strategy is not a reasonable reference player.

## Limits

- Each gate was simulated **independently**. The experiments isolate Royal mechanics, including the appropriate gate target and boss SNAP tax, but do not simulate relic selection or full three-gate survival.
- Matched *seed values* are used, but removing ordinary cards to create hand-only Royals changes deck composition; this is not a perfect paired-deck intervention.
- J and Q were always drawn into the initial hand when unlocked. Real players will make different choices, including not playing the Royals at all.
- No empirical human strategy mix or reaction/retention data is available.
- An unlock-tier target jump and Royal effect change happen simultaneously, so raw pass rates are **not** causal estimates of an individual Royal's strength.

## Recommendation / next experiment

**Keep the implemented rules for now**, playtest the K tradeoff and record whether human players cash K out, steer it, or let it expire. Then independently evaluate Crown parameters (+50/−10 vs +60/−10 vs +50/−5) against an identical encounter-target baseline. That separates the King's true strategic value from the target-tier increase and card-replacement opportunity cost.

## Reproduce

```bash
node experiments/run-overswing-royals.mjs 2000 900000
```

The command generates `artifacts/royal-simulation.json` and `artifacts/royal-simulation.csv`, with all 48 stage/gate/policy result rows and distribution metrics (median, p90, p99). GitHub Actions uploads both as the artifact `overswing-royal-simulation`.
