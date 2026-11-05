# Swing Casual — UI/UX Audit and Product Design Backlog

**Date:** 2026-11-05  
**Status:** Project design resource; recommendations, not shipped work or validated player metrics  
**Scope:** Mobile-first Swing Casual game, prior screenshots and v0.6 engine/UI model  
**Goal:** Improve first-time comprehension, risk/reward clarity, reward satisfaction and eventual retention.

## Executive assessment

Swing Casual has an appealing, approachable art direction and a deeper strategic engine than a typical color-sorting puzzle. The largest obstacle to a broad casual audience is not the amount of illustration polish: it is that a player must infer a multi-step causal chain at once:

**Signed card → swing position → at-risk Pot → three multipliers → Bank → secured gold.**

The strongest design principle is **make each visual movement explain an honest consequence in the game**. Prioritize comprehension and decision clarity before adding more FX.

### Heuristic scorecard

| Dimension | Score / 10 | Rationale |
|---|---:|---|
| Visual appeal | 7 | Colorful, tactile elements; some art-style inconsistency |
| Gameplay clarity | 4 | Core cause/effect loop is not communicated reliably |
| First-time onboarding | 4 | Several unfamiliar concepts arrive simultaneously |
| Reward satisfaction | 5 | Attractive chest, but pending vs secured value is ambiguous |
| Visual hierarchy | 5 | Too many similarly emphasized counters, hints and rewards |

**Evidence limitations:** These scores are subjective design judgments, not measured player behavior. Some screenshots predate the horizontal meter, smaller HUD and v0.6 update. Avoid treating features already removed as current defects without inspecting the latest deployed build. Rendering, timing and usability on a current iPhone require real-device validation.

## Mechanics that must remain truthful

Read these as presentation invariants, not reasons to create a second scoring engine.

- Signed cards move the meter in the positive or negative direction. A -4 moves by -4.
- For the casual Level 1 configuration, each safe played card contributes its **absolute rank** to the at-risk Pot: -4 contributes 4, not -4. The default original Overswing rule can differ for noncrossing Steer; the special casual rule is explicit.
- The three independent factors are **Swing (W+1) × Flip (flipFactor) × Jackpot (jackpotFactor)**.
- Bank uses the original engine's Pot, resonance, factor product, and any tax/rules, not a UI-derived estimate.
- Strict sign crossings can increase Swing; crossing Flips can increase Jackpot; safe noncrossing Flips can increase Flip.
- Landing exactly on zero triggers Zero Break: factors reset, Pot remains. Crossing the Snap boundary loses the unbanked Pot; banked gold stays safe.
- A card play is not a Bank. Never imply that a pending card was already secured in the glass chest.

## Priority findings and changes

### P0-01. Core loop is not visually taught

**Problem:** Players see cards, a meter, multiplier charms, Pot/Bank and chest, but cannot immediately reconstruct their connection.

**Change:** Always show one ordered sequence after a safe play: card movement → signed meter shift → absolute card rank to pending Pot → any engine-awarded factor to the correct pill. Bank then moves pending Pot into secured chest.

**Acceptance:** In a five-player no-instructions study, at least 4/5 can explain a -4 card's direction and why it contributes +4 after the first few turns.

### P0-02. Card-to-chest motion tells the wrong story

**Problem:** The current two-phase animation grows a card at screen center, then shrinks it toward the chest—even for unbanked cards. It suggests gold is secured when it is still at risk.

**Change:** Preserve the visually satisfying grow/shrink motion but land ordinary played cards in a **pending Pot tray / orbit near Bank**, outside the glass. Only pressing Bank should launch gold into the secured chest.

**Acceptance:** Chest contents and secured counter never increase on Steer/Flip; Bank produces the transfer, and Snap clears pending only.

### P0-03. Three factor pills lack discoverable meaning

**Problem:** Three numeric charms (x1, x1, x1) are visually minimal but opaque.

**Change:** Keep **only numbers inside each pill**, stable in Swing / Flip / Jackpot order. On the first award of each kind, briefly show an external contextual cue and fly the earned value from the meter to its corresponding pill. Respect simultaneous awards. Never invent bonus movement from the UI.

**Acceptance:** At least 4/5 players can identify which factor changed and why after two or three examples.

### P0-04. No dependable goal reference after opening

**Problem:** The flying initial target removes clutter but also removes a way to know progress.

**Change:** Keep the opening target coin. Test a subtle persistent progress cue outside the glass, an engraved collected/goal tally under it, chest fill threshold, or a one-tap target recall. Do not restore the old oversized target banner.

**Acceptance:** At least 4/5 first-time players can tell their progress toward the goal after 20 seconds.

### P0-05. Red zero line conflicts with genuine danger

**Problem:** A thick red mark at zero looks like a hazard even though zero is a multiplier reset, not a Snap. The edges are the true failure boundary.

**Change:** If keeping the requested red zero marker, give Zero Break a distinct reset animation/sound; reserve strong danger pulsing for approaches to Snap limits. Never reuse the same red flash for both.

**Acceptance:** New players distinguish multiplier reset from pending Pot loss.

### P1-06. Visual hierarchy and clutter

**Problem:** Earlier screenshots gave header, hints, target, meter, Pot, chest and action buttons similar weight. Later minimal UI improves this but still needs explicit hierarchy checks.

**Change:** Primary: hand and Bank/Flip. Secondary: meter, pending Pot and factors. Tertiary: banked chest, Level, chances, version. Hide learned hints; avoid floating text over glass.

**Acceptance:** At thumbnail/squint size the next action, risk state and reward destination remain obvious.

### P1-07. Bank does not clearly communicate the decision

**Problem:** Users may not understand why Bank is disabled or how much is locked in versus at risk.

**Change:** Put the engine's **actual potential payout** on Bank. When disabled, show a brief explanation only when useful; when enabled, communicate Bank as a choice—not an obligatory flashing instruction.

**Acceptance:** Players can state what they would secure and what they could lose by continuing before Banking.

### P1-08. Signed movement and unsigned value compete

**Problem:** A -4 card can look like a penalty to gold when it should be directional.

**Change:** Keep signed numeral on face. On safe play, show a distinct +4 or four small coins moving to pending Pot. Do not clutter the card with two permanent numbers.

**Acceptance:** Players predict both movement and Pot contribution from +3 and -4.

### P1-09. Generic reward FX flatten importance

**Problem:** Heavy animation on every tap makes valuable multiplier gains and Bank moments feel ordinary.

**Change:** Three tiers of feedback: lightweight card movement; stronger multiplier/crossing reward; richest Bank and level-win reward. Keep most taps fast. Use reduced-motion support and avoid disrupting background audio when muted.

**Acceptance:** Players consistently recognize what events were more valuable without relying on written labels.

### P1-10. The chest does not yet convey growing wealth

**Problem:** A static glass container with scattered stars is decorative rather than a tangible accumulating reward.

**Change:** Banked gold enters through glass mouth, settles at bottom and piles up; the container glints/bounces briefly. Keep bonus/coin counters **outside** the glass, and keep pending Pot visually separate.

**Acceptance:** Two Banks show visibly more secured gold than one; playing an unbanked card does not fill the chest.

### P2-11. Art materials are inconsistent

**Problem:** Glossy dimensional cards/buttons, flatter environment and lighter glass rendering feel like slightly different art systems.

**Change:** Establish a shared art-direction sheet for highlight angle, outline weight, shadow softness, gradient depth, saturation and wood/glass/gold materials. Refine cohesion instead of piling on more ornaments.

**Acceptance:** Individual crops of cards, meter, chest, shelf and buttons look like one unified art pack.

### P2-12. Mobile stability and release verification

**Problem:** The project has previously had real meter-width shifts, CSS precedence conflicts and delayed releases despite merged code. Production build success is not equivalent to phone layout correctness.

**Change:** Preserve stable layout dimensions, tabular numerals, a visible release SHA, and motion that does not resize parents. Keep fast CI as requested; add scheduled **manual** iPhone checks at visual milestones.

**Acceptance:** No header, meter, chest or controls width jump across intro, Steer, Flip, Bank, Snap, win, reload and font load. Confirm live visible SHA matches the version under review.

## Recommended portrait composition

1. Quiet header: Level | secured gold | chances. Version at the bottom edge.
2. Fixed-width numbered horizontal meter with a symmetric center-to-edges gradient; red zero marker with a distinct Zero Break treatment; **three numeric-only hanging factor pills**.
3. Compact **pending Pot** near the Bank decision, visibly separate from glass.
4. Clear glass chest showing physically accumulated **banked gold**, with a discreet outside progress affordance.
5. Large three-card hand on shelf; only **Bank** and **Flip** action buttons.

**Eye path:** choose card → meter response → pending value / multiplier gain → Bank decision → secured chest.

Avoid reintroducing the old 1/200 strip, permanent oversized target, decorative Snap button or verbose rule panels.

## First-session onboarding (no stacked tutorial dialogs)

| Moment | What happens | Single lesson |
|---|---|---|
| First card | Signed marker visibly moves | Cards change swing |
| Next safe card | Absolute amount travels into pending Pot | Both signs can contribute positive reward |
| First Bank | Pending gold travels into chest | Bank secures the reward |
| First factor event | Numeric reward flies to one of three pills | Multipliers increase the payout |
| First zero / Snap | Distinct outcomes and animation | Zero resets factors; Snap loses pending |

This is a proposed teaching order, not an assertion that the current deterministic Level 1 deck naturally demonstrates every case. Adjust example sequencing after observing actual runs.

## Motion contract

| Event | Visual feedback | Forbidden implication |
|---|---|---|
| Ordinary card | Press → grow at center → shrink toward pending Pot | Value is already banked |
| Negative card | Signed leftward swing and positive absolute Pot deposit | Negative gold penalty |
| Flip | Reveal movement and only earned factor gains | All factors grow every Flip |
| Strict crossing | Award from meter to exactly the relevant pill(s) | Fake or wrong multiplier award |
| Exact zero | Reset-only feedback; Pot remains | Snap-style Pot loss |
| Snap | Edge danger, Pot loss, chance consumed | Previously secured chest gold lost |
| Bank | Actual payout transferred to chest; count-up and settling | Pre-bank card was already secure |
| Win | High-impact completion feedback | Abrupt or ambiguous transition |

## Fast research and analytics plan

Run five unbriefed iPhone sessions. Give only “Play the level” and avoid explanations. Measure: time to first action, sign interpretation, absolute-value interpretation, Bank understanding, multiplier recognition, goal recall, comprehension of Zero Break versus Snap, level completion and desire to replay.

An early design gate of **4/5** succeeding on each critical concept is a **formative usability heuristic**, not a statistically powered metric or an established industry benchmark.

Suggested instrumentation: level_start, first_action, steer, flip, multiplier_changed(kind/before/after), bank_enabled, bank, snap, zero_break, level_complete, restart, hint_shown, target_recalled. Analyze by new/returning user, screen size, level and session. Track first-level completion, early exits, time to meaningful Bank and retention in real testing; never infer revenue success from screenshots.

## Ordered implementation backlog

| Order | Work | Severity | Complete when |
|---:|---|---|---|
| 1 | Separate pending Pot from chest | P0 | Only Bank increases secured glass |
| 2 | Cause/effect animation chain | P0 | Signed swing and absolute gain clearly distinct |
| 3 | Teach individual factor pills | P0 | Correct engine factor reward flies to correct pill |
| 4 | Subtle goal recall/progress | P0 | Players can identify remaining goal after intro |
| 5 | Zero Break vs Snap visual vocabulary | P0 | Outcomes cannot be confused |
| 6 | Bank payout and risk affordance | P1 | Player can identify what would be locked |
| 7 | Chest stacking and feedback hierarchy | P1 | Banks feel more rewarding than taps |
| 8 | Consistent art, responsive polish | P2 | Cohesive asset language and stable dimensions |
| 9 | Five-player no-instructions test and retest | Verification | P0 misunderstandings logged, addressed, retested |

## Design constraints and references

- Keep the **real original Overswing** rules as source of truth; do not write another multiplier or payout engine.
- Treat at-risk Pot and secured gold as distinct financial/reward states in both visuals and logic.
- Success as a commercial casual game requires measured comprehension, retention and market validation; it cannot be guaranteed by aesthetic review.
- Browser automation was intentionally removed from automatic Pages CI; this does **not** eliminate the need for hands-on device review.

Related repository materials:
- docs/swing-casual-v05-plan.md — simplified screen, intro and first animation specification.
- docs/swing-casual-v06-implementation.md — three factors and explicit casual-only absolute-value scoring rule.
- src/external/engines.js — canonical Overswing engine.
- src/casual/firstLevel.js — Level 1 rules and deck.
- src/casual/SimplifiedGame.jsx, MinimalBoard.jsx, minimalMotion.js and minimal.css — current visual implementation.

---

**Bottom line:** The next iteration should deliver honest, easy-to-understand visual consequences—especially **pending vs secured**, the signed meter, and earned factor changes—before investing in more decorative polish.
