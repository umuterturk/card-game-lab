# Swing Casual v0.5 — Single-Screen Implementation Plan

Status: implementation in this branch; does not replace the original Overswing game.
Scope: `casual.html`, first-level presentation and motion only. Core rules remain in `src/casual/firstLevel.js` and `src/external/engines.js`.

## Player experience
A level opens directly to a colorful, uncluttered garden screen. An oversized golden coin showing **Collect 24** flies into the scene, remains legible briefly, and floats/fades out. There is no menu, progress strip, target panel, Snap button, permanent bonus badge, or floating Pot badge. The only two action buttons are **Bank** and **Flip**. Cards, horizontal swing and a glass chest form the visual hierarchy.

## Components and layout
1. **Top HUD:** Level 1 on the left, compact gold total on the right, and two small hearts for remaining Snap chances. The gold counter must be outside the chest. Keep the version label visible at the bottom edge, with real publishing SHA.
2. **Horizontal swing meter:** Range inclusive `-8 … +8`, numbered ticks `-8,-6,-4,-2,0,+2,+4,+6,+8`. Track width remains fixed to its container; all motion is a `left`/transform change to the marker only. Marker shows signed current value. Green center zone, purple body, soft danger edges. On Snap, marker returns to zero and hearts decrease; no Snap action.
3. **Glass chest:** Large transparent jar/chest occupying center-lower space; curved blue glass with transparent opening, wooden rim, stone plinth. Gold stars/chips accumulate visibly inside from bottom upwards, based on banked amount. No overlay text or bonus on the glass itself. Pot is conveyed by the Bank label (e.g., `BANK +7`).
4. **Cards:** Three large green/pink/blue glossy numbered tiles on a wooden shelf. Inactive hand positions remain muted slots. Icons and signed values remain visible.
5. **Controls:** Big Bank and Flip buttons only. Flip indicates deck remaining. The existing game engine owns availability and payout, not the component.

## Motion
- Opening: `0.0–0.35s` golden coin flies into center and scales up; `0.35–1.55s` holds with `Collect 24`; `1.55–2.2s` shrinks, flies up and fades. Does not block controls.
- Steer: on tap, lift and scale down briefly (`80ms`); clone travels to center and grows to `1.3x` (`340ms`); afterward travels to the chest while shrinking to `0.12x` (`360ms`) and disappears. The underlying deterministic action is applied once. Do not credit the chest until Bank.
- Flip: use the same two-leg trajectory starting from the Flip preview; reveal the actual signed card midway.
- Bank: from the Bank button, spawn 5–9 gold particles traveling along curved paths into the chest in `0.7–1.1s`; banked counter rises with the particles and the gold pile fills visibly. Jar gently bounces.
- Reduced-motion users get immediate state transitions; effects never mutate engine state. Actions are locked while animated to prevent double plays.

## Engine invariants
`FIRST_LEVEL` remains deck of 10, initial hand 3, target 24, Snap limit ±8, two Snap chances, and no Royal/ability/relic modifiers. `stepFirstLevel` validates all actions. Banked gold only increases through real Bank. Snap is automatic from engine. No code changes in the existing full Overswing game.

## Verification / acceptance
- A fresh load shows Level 1, two hearts, coin total, nine numbered ticks, three cards, only Bank/Flip and the always-visible version label; no permanent target or Snap control.
- Opening target disappears after 2.2s while gameplay remains usable.
- Card flight has two visibly distinct stages (enlarge in center, shrink into chest); Flip uses the same trajectory.
- After each play the meter shows the authoritative signed value and its container width differs by < 1.5px from initial width at 390×844.
- After Bank the coin total increases, gold chips visibly appear inside the glass, and there is no counter over the chest.
- The normal deterministic first-round Flip→Flip→Bank path still wins; restarting restores intro, cards, empty chest and hearts.
- Smoke-test the real production build before/after interactions; failing tests must report errors. No modifications to `overswing.html` or its engine.
- Confirm GitHub Pages **Deploy** succeeds and inspect the live version badge, rather than inferring deployment success from a merge.
