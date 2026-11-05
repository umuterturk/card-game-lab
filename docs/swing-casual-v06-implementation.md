# Swing Casual v0.6 — Engine parity and meter rewards

## Objective
Bring the minimal casual presentation in line with Overswing's real factor model, while retaining the clean horizontal-meter / glass chest layout.

## Verified source of truth
`src/external/engines.js` has three independent factors:
- Swing = `W+1` (strict sign-crossing grows it; noncrossing STEER/FLIP can spend tiers).
- Flip = `flipFactor` (safe noncrossing Flip streaks grow it).
- Jackpot = `jackpotFactor` (strict-crossing FLIPs grow it).
- Combined multiplier = Swing × Flip × Jackpot; Bank pays `floor((sum(abs(pot cards)) + resonance) * combined multiplier)` before tax.
- Landing exactly on zero is Zero Break, resetting all multipliers without dropping the Pot. Snap loses unbanked Pot and resets factors.

## Specific casual rule adjustment
A successful (nonsnapping) card always enters the Pot at its **absolute rank**.
The original engine currently discards safe STEERs that are neither opening, strict crossing nor Zero Break.
Introduce an explicit boolean engine rule `steerAlwaysToPot` defaulting to `false`. Set it to `true` only in the casual first-level rules. All other factors, crossing/zero-break logic, and Bank scoring must remain shared with the original engine.
The red/black sign still determines movement direction; it must never subtract from the Pot. Snapping cards still go to discard without adding to Pot.

## Design
- Keep the existing horizontally numbered ±8 meter, stable width, cards and only Bank/Flip buttons.
- Replace the green center band with a symmetric **danger-at-edges → calm-at-center** multicolor gradient. Mark zero with a thick red vertical line, visible behind the marker.
- Three small pills **hanging beneath the meter**, with numerical values only in left-to-right order: Swing, Flip, Jackpot. Each pill has an accessible label and title even though it visually contains only `×N`.
- Source values directly from `deal.W+1`, `deal.flipFactor`, `deal.jackpotFactor` on the real engine. No fake or combined multiplier in place of individual ones.
- When the engine reports a positive tier change, animate a small numeric `+N` reward from the meter marker to the matching pill and briefly bounce that pill. Strict-crossing Flip can award Swing and Jackpot simultaneously.
- Resets / penalties update pills without a flying positive reward. The visually banked gold and Bank payout stay consistent with the engine.
- Remove prior static BONUS overlay; keep only the three hanging factors.

## Acceptance
1. On load three multiplier pills show ×1 / ×1 / ×1, with only numbers inside them.
2. One noncrossing Flip grows Flip, not Jackpot. A crossing Flip grows Swing and Jackpot; no false Flip gain.
3. Every successful signed card adds `abs(value)` to the casual Pot, including ordinary safe STEERs that did not cross; original mode still discards those STEERs.
4. Exact zero resets all three factors and preserves accumulated Pot; Snap loses unbanked Pot.
5. Bank payout matches original factor product and sum of absolute card ranks; no independent casual payout approximation.
6. Green zone is absent; symmetric center-to-edges gradient and thick red zero line appear.
7. Version badge shows `v0.6.0` + deployed SHA. No browser tests in automatic Pages workflow.
8. Unit tests cover original mode regression, casual sum behavior, strict crossing, zero break, and factor bonus descriptors. Run unit, production build and release checks in GitHub Actions; check Deploy result before claiming live success.

## Evaluation
This deliberately makes Level 1 more forgiving than full Overswing, without changing its scoring or factor dynamics. This is appropriate for an onboarding level, but later levels should decide explicitly whether `steerAlwaysToPot` remains on. Large factor gains are possible with a short deck; balance the 24-gold target only after observing live play.
