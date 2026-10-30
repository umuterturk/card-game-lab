# Guest games: comparative design evaluation

Date: 2026-10-31. Scope: Kindling (019), Overswing (020), Bondstone (021), Undertow (022).

These **provisional design ratings** use the same eight equally weighted 1–10 dimensions as the original Card Game Lab reports. They are new critical assessments, *not* the guest agent's original ratings. Emotional appeal, engagement and replayability ratings are predictions rather than findings from human playtests.

The quantitative evidence below is **reported in the four user-supplied implementation specifications**, which quote the guest agent's previous 2,000-deal experiments. We did not rerun their Python simulators or certify those outcomes, and the baseline policies differ across games. Raw point totals and skill-ratios are not directly comparable.

## Scorecard

| Game | Simplicity | Engagement | Depth | Luck balance | Excitement | Reward satisfaction | Sense of loss | Replayability | Mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Overswing | 7 | 8 | 8 | 7 | 9 | 9 | 8 | 8 | **8.00** |
| Bondstone | 7 | 8 | 9 | 8 | 7 | 8 | 7 | 8 | **7.75** |
| Kindling | 8 | 8 | 8 | 8 | 7 | 8 | 6 | 8 | **7.63** |
| Undertow | 5 | 7 | 8 | 7 | 8 | 7 | 8 | 7 | **7.13** |

Arithmetic mean is computed before display rounding. Scores provide a design shortlist, not an objective measure of fun or an 80/20 skill/luck split.

## Evidence and design judgment

### Overswing — 8.00

**Premise:** Flip red (+) or black (-) cards to drive a pendulum between -10 and +10; zero-crossing raises a capped multiplier, and some flip cards become usable hand cards. Bank the pot before crossing +/-10 and snapping.

**Why it ranks first:** A compact, legible *control vs temptation* loop. Captured swing cards create real decisions about when to steer, when to flip, and when to bank. Scaling the multiplier makes deliberate risk rewarding. A three-deal Match reduces the volatility of individual deals.

**Source-reported evidence:** Across 2,000 Short deals, strategic depth-3 mean = 604.8 (SD = 207.4), adaptive = 459.1, random = 165.9. At the 500-point Win tier, strategic achieved 69.4%.

**Weaknesses:** Significant variance; a few player decisions and lucky crossings can swing totals. Modulo-like signed arithmetic and card movement into the hand add teaching friction. Shares a broad signed-meter premise with the existing Rebound experiment, although the capture/steer mechanic distinguishes it.

**Prototype test:** Do players voluntarily choose to bank at W=3–4, and do they replay after a Snap? Measure clarity of the crossing-zero animation.

### Bondstone — 7.75

**Premise:** Place a Stone into a 3x3 wall; completed rows/columns make same-suit or consecutive-rank Bonds, which score using the accumulating Rise. Faulty lines reset Rise. Players see two upcoming stones and can Mortar three.

**Why it ranks highly:** Strong spatial agency, two-line intersection planning, controlled information, and scarce corrective resources. Decisions interact over multiple turns without adding many one-off card effects.

**Source-reported evidence:** Across 2,000 deals, depth-3 mean = 835.0, depth-2 = 655.8, simple = 363.2, random = 21.9. The random policy's especially low score is NOT evidence of a 38x human skill difference; unplanned play makes mostly faulty lines.

**Weaknesses:** Rising multiplier resets are a setback, but previous score is never lost, so it is less emotionally dramatic than direct bank-or-bust games. Cross-line resolution requires visual feedback. The source's proposed easier tier thresholds were **not** adopted into the frozen rules.

**Prototype test:** Are players able to anticipate cross-clears and explain what caused a Crack? How often do they choose to Mortar instead of placing?

### Kindling — 7.63

**Premise:** Draft from a three-card sliding market, paying a Spark for the second/third option. Grow three ascending Fires (+1 to +3 between adjacent cards) and Kindle for n², doubled on matching bottom/last suit, earning a Spark. When no Fire fits the selected card, the biggest Fire Smothers.

**Strengths:** The most approachable of the four; a useful decision space in card drafting, when to harvest, and which Fire to extend. Spark is both scarce market control and a harvest reward. A fixed 40-Take run is easy to bound.

**Source-reported evidence:** Across 2,000 deals, depth-3 mean = 226.56, HumanProxy = 166.63, simple = 100.66, random = 45.84. Depth-3 reached the original 130-point Win tier 97.95% of the time, suggesting the tier is too lenient for optimized play.

**Weaknesses:** Smother is sometimes forced by an unattractive market, and holding a long Fire is a less visceral risk than a blind high-stakes wager. A skilled player may repeatedly follow similar rank-ascending patterns.

**Prototype test:** Do players understand forced Smother, and do they actively pay Sparks for better cards? Track whether players voluntarily delay Kindling at n>=3.

### Undertow — 7.13

**Premise:** On each of 12 Tides, allocate crew cards to Break the Tide, Anchor permanent Line strength, and Row. Negative margin adds Strain; higher Strain triggers hidden checks that can halve accumulated Catch or award additional Deep.

**Strengths:** Rich multi-role hand decisions, deliberate exposure to risk, and a clear fixed 12-turn horizon. The odds are mathematically defined and can be shown to the player.

**Source-reported evidence:** Across 2,000 deals, MC48 planner mean = 158.9 (SD = 17.8), MC48 no-risk = 147.7, random = 29.4. The advanced planner's improvement over its no-risk counterpart was only 11.2 points (7.6%); the extra risk is not essential to reaching the Win threshold.

**Weaknesses:** Hardest game to teach: three ways to assign cards, future-card management, Strain/Deep, hidden Check odds, and early-Crack cleanup. Compounded rule exceptions exceed the desired one-to-two-minute explanation. The reward for engaging with risk is comparatively small.

**Prototype test:** Can a new player explain the difference between Strain and Deep after one complete run? If not, simplify. Compare completion rates with and without an assisted card-assignment UI.

## Comparison with previously rated Card Game Lab designs

| Game | Original or new score |
|---|---:|
| Overswing (new) | **8.00** |
| Stormfreight (original) | 7.90 |
| Twinlock (original) | 7.90 |
| Bondstone (new) | **7.75** |
| Kindling (new) | **7.63** |
| Beaconfall (original) | 7.60 |
| Counterweight (original) | 7.50 |
| Shortfuse (original) | 7.40 |
| Chime (original) | 7.38 |
| Undertow (new) | **7.13** |

The historical scores come from different earlier design passes with different simulation methods. Differences of 0.1–0.2 should not be treated as statistically meaningful.

## Recommendation

For first human tests: **Overswing** for immediate stakes and satisfying multipliers; **Bondstone** for lasting tactical depth; **Kindling** as the easiest onboarding candidate. Hold **Undertow** for a rules/UX simplification pass.

Scores should be revised after at least 10 first-time players try each game, recording first-run completion, rule confusion, decisions, voluntary replay and qualitative delight.
