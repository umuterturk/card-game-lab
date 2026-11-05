# Swing Casual — Next Improvements After Meter Alignment

**Updated:** 2026-11-05  
**Baseline:** P0 reward-loop PR #14 (merged, `83867834`), followed by the in-track meter-number alignment change.
**Source of truth:** `src/external/engines.js`, `docs/swing-casual-ux-review.md`, `docs/swing-casual-v06-implementation.md`, and the Swing Casual project brief.

## Product objective

Make **one level** feel as legible, tactile, and dependable as a successful top-tier mobile casual puzzle before introducing a big level catalog. Use Magic Sort as a **quality benchmark**, not as a request to copy content or rules.

The verified implementation has: a pending Pot separate from the glass chest, three engine-backed multipliers, signed meter movement, Bank payout, target recall, and distinct zero/Snap presentation. **Unit tests and GitHub Pages build passing are not device usability validation.**

The new meter places scale values **inside the bar** and makes the marker and every tick share the same inset track geometry. Keep numeric correctness and touch stability in future changes.

## Next iteration A — Mobile UX verification and targeted corrections (highest priority)

**Reason:** The new reward/score presentation changed the portrait composition. It has not been visually accepted on a real iPhone.

1. On iPhone Safari, capture start, safe + card, safe − card, Flip, first multiplier gain, Bank, zero break, Snap, and win.
2. Review common CSS viewport targets: 320×568, 375×667, 390×844, 430×932; include real safe-area insets, address bar changes, and reduced-motion mode.
3. Check meter number legibility at the center (white 0 over red line), endpoints (−8/+8), and marker positions at −8, 0, +8 without clipping.
4. Ensure pending Pot and progress badge **never overlap** the glass, action buttons, or cards. Stabilize all layout dimensions (even during intro and scoring count-up).
5. Run low-speed / rapid double-tap / restart-during-animation scenarios; repair ghost/card or locked-input leaks.
6. Preserve the user's choice **not to run browser smoke tests automatically in Pages CI**.

**Exit:** No scale misalignment, text overlap, mis-tap, clipping, layout jump, or stranded animation in the test sequence. Capture screenshots/video for comparison; report device and exact deployed SHA.

## Next iteration B — Richer but honest P0 tactile feedback

**Reason:** The foundation of the reward loop is in place, but its execution still needs human-perceived weight and event differentiation.

1. **Normal card (lightweight):** Make the signed motion and positive absolute-value arrival immediately readable; keep card feedback fast and avoid dramatic full-screen enlargement.
2. **Earned factor (medium):** Time the real engine bonus chip so it visibly reaches the correct factor *after* the meter changes; first-time labels must be readable, not obscured or stacked.
3. **Snap (loss):** Make the attempted beyond-limit direction clear, discard the offending card, visibly empty/dissolve *only* the pending Pot, and remove one chance. Never disturb secured gold.
4. **Zero Break (reset):** Brief neutral factor-reset pulse and Pot preservation; no loss/error explosion and no fake bonus flight.
5. **Bank (major reward):** Real payout leaves Pot, coins enter through the glass mouth and visibly settle. Count-up and chest impact should finish before win overlay.
6. **Add minimal sound only if compatible with external audio:** Short cues for tap, bonus, Bank, Snap, and zero; gated by a real user gesture, respect mute, never initialize audio when sound is zero, never interrupt background YouTube/music. Audio is supplemental; all effects must work silently.
7. Preserve `prefers-reduced-motion`; use capped CSS/GSAP transforms and avoid heavy filters or asset loading at tap time.

**Exit:** A sound-off screen recording demonstrates the entire cause-and-effect chain. Bank is clearly more rewarding than a normal card; Snap and Zero Break are distinct. No gameplay rule changes, UI-derived payouts, or unbanked value entering the chest.

## Next iteration C — Real first-session onboarding and comprehension research

**Reason:** A beautiful screenshot alone cannot prove a casual newcomer understands the game.

1. Ask five new players to attempt Level 1 **without explanation**; record errors and hesitations, not only completion.
2. Check: what −4 does to meter and Pot; what ×Swing/×Flip/×Jackpot mean; what can be lost on Snap; what Bank secures; how close the player is to 24; how zero differs from Snap.
3. Evaluate whether short contextual hints appear at the **right event**. Prefer one-time motion labels and gentle highlights to tutorial popups or permanent text bars.
4. Instrument a minimal anonymous event trail: level_start, first_action, steer, flip, factor_changed, bank_eligible, bank, snap, zero_break, level_complete, restart, hint_shown.
5. Fix any repeated observed misunderstanding and retest the critical actions. **4/5 clear explanations of each key concept is only a formative heuristic**—not a statistically valid retention metric.

**Exit:** Players can explain the core loop without written instructions, understand the objective and current risk, and finish/retry without external prompting. Log unresolved confusion and changes.

## Next iteration D — Visual cohesion and meaningful level progression (after comprehension gate)

1. Write a small **material/art style sheet** for card surfaces, meter, glass, gold, Pot, shelf and garden: light direction, outline widths, bevels, shadows, saturation and text sizes. Remove conflicting clutter, not features needed to understand the rules.
2. Introduce a validated, data-driven level specification: target, deck, order/seed, hand size, Snap bound, chances, per-level modifiers, and teaching objective.
3. Keep deterministic engine replay and add simulator-based balancing across levels. Vary **one teaching dimension at a time**, especially during early levels; only then raise difficulty.
4. Prototype **Levels 2–10** first; measure completion, restart, first-bank timing, early quits, and understandability before aiming for ~200 levels.
5. Begin offline/PWA packaging, performance/error telemetry, and portal/store acceptance work only after the core mobile session and early levels are stable.

**Exit:** Coherent reusable art language, validated Level 1, playable and tested small level sequence, repeatable difficulty tuning. No speculative monetization or new Royals/relic systems.

## Engineering guardrails / acceptance checks

- All rules come from `src/external/engines.js`; React stays presentation-only. Bank shows the *actual* engine payout; Pot remains the raw at-risk value (plus any explicit resonance bonus).
- Every move: signed meter direction; safe `abs(card)` into open Pot; only a successful Bank increases secured gold.
- Meter ticks and marker must use the same `meterPercent` function and the same containing scale element.
- Keep stable widths, tabular digits, iPhone safe areas, large touch targets and a visible deployed commit identifier.
- PR checks: `npm test`, `npm run build`, `npm run verify:release`. The main Pages pipeline also checks offline packaging. Actual iPhone checks remain manual.
- Do not silently change Bank eligibility, hand refill, multiplier rules, target or deck while polishing UI.
- Prioritize A → B → C → D; do not claim Magic Sort-level quality, retention or market readiness based on passing code checks alone.

## Not now

No 200-level bulk creation, shops, monetization, Royals/relics, giant onboarding panels, extra actions, horror theme, forced browser CI, or large-scale repository refactoring until the single-level interaction is proven.


## Implementation update — 2026-11-05 (Bank and currency consistency)

This iteration addresses remaining visible flaws in the earlier iPhone reference and starts the next tactile-feedback milestone. **Not yet validated on a fresh iPhone screenshot.**

### Implemented in feature branch

- Replace the star as a **currency symbol** with a single embossed coin across HUD, at-risk Pot, Bank payout, intro objective, chest contents, and flying bank rewards. Stars are retained only for non-currency level/victory decoration.
- Redesign Bank from a crowded three-part horizontal button into a deliberate centered **BANK** heading over a minted-coin **+engine payout** line. The payout is still read from `overswingPayout`; no UI math.
- Pace Bank as: Pot empties when transfer launches → minted coins travel into glass → secured counter counts up on arrival → exact earned payout briefly lifts above the chest → chest settles → optional win overlay.
- Add small falling-coin loss feedback for Snap, leaving already secured glass untouched; honor reduced-motion.
- For Flip, show the revealed signed card **before** moving the meter. Known Steer cards retain immediate signed-meter feedback.
- Announce Zero Break at actual multiplier reset rather than at card lift.
- Preserve current engine, deterministic deck, hand refill, Snap/Zero semantics, multipliers and all legality rules.

### QA requirements before signing off

1. Confirm the Bank control at the actual phone width in normal, disabled, payout +10, and larger payout states. The heading and gain must remain centered, with no overlap or cramped corners.
2. Confirm header, Pot, Bank, chest, flying coins, and intro all use the same recognizable minted-coin form. A level medal/star must not suggest that coins and stars are separate currencies.
3. Confirm Bank count-up begins when coins touch the chest, not as coins leave the Pot. Verify no overlay interrupts a high-value Bank.
4. Confirm a Snap visually spills only pending coins; secured value never drops, and Zero Break keeps the Pot.
5. Re-check 320/375/390/430 CSS px, short viewports, safe areas and reduced-motion on a real iPhone. Unit/build checks do **not** replace this.

### Still outstanding in master plan

- Full on-device video walkthrough and touch/animation reliability, including rapid repeat taps and restart.
- Timed factor rewards and first-time help validation with sound off.
- Lightweight optional sound cues with external-audio friendliness; do not add autoplay audio.
- Five-player, no-instructions Level 1 comprehension research.
- Only then art-system cohesion and prototype Levels 2–10 before a 200-level rollout.
