# Swing Casual — P0 iPhone Screenshot Audit (2026-11-05)

## Reference and limitations

Reviewed **one user-supplied iPhone screenshot** of the deployed demo build `v0.6.0 · de916af0`. The screenshot shows a mid-round state: swing +1, Swing ×2, Flip ×1, Jackpot ×1, raw Pot 5, potential Bank payout +10, secured 0/24, 2 chances, 7 cards remaining, and one active +5 card.

The displayed arithmetic is internally consistent (5 × 2 × 1 × 1 = 10), but this single static screenshot does **not** verify animations, touch targets, safe-area behavior in other browsers, or other game states. The iPhone model and CSS-pixel viewport are not confirmed.

## Issues visible in the supplied screenshot

| Severity | Finding | Fix in this release | Validation |
|---|---|---|---|
| P0 | **POT** label is partly hidden under the tray lip, making the player's at-risk reward look unlabeled | Add inner space and foreground text stacking; increase tray height slightly with short-screen overrides | Label and its value fully visible in mid-round state |
| P0 | Large, fixed **build/version pill overlaps the lower-right action region**, competing with the Flip CTA | Reserve a dedicated bottom-safe-area strip below the action buttons and shrink/soften the debug label | Neither Bank nor Flip button, including its border, has text overlay |
| P0 | **BANK** payout `+10` is tiny, baseline-offset into the lower-right button corner; the reward has poor hierarchy and can collide with the button border | Use a centered two-line text group (BANK / +10) beside the star, with fixed line heights and narrow-screen typography | Both the action and full payout remain legible and centered at short and narrow screen sizes |
| P0 | Empty hand slots have so little contrast that their dashed edges and X almost disappear into the grass | Increase dashed-edge and X contrast while keeping empty slots visually weaker than real cards | Slots identifiable at a glance without seeming tappable |

## Additional observations to test, not blindly change

- The empty glass chest is a large visual area; test how rewards accumulate after the first and second Banks. Do not shrink it solely because it is empty in this snapshot.
- The top secured counter and lower **SECURED 0 / 24** show partially redundant information. Consider merging only after a no-instructions comprehension test verifies where players look.
- The thick red center line is a reset condition (Zero Break), not the Snap boundary; test whether the difference is apparent from animation alone.
- One remaining +5 card and two empty slots is legitimate under the current engine hand/refill rule. Do not silently refill or change game mechanics to make the hand appear fuller.
- All three factor pills are visible; do not add permanent labels inside them merely to fill space.

## Acceptance / device QA needed

1. Open the latest deployed build on the same iPhone and recreate the screenshot state; verify **POT** text is not clipped and the version label sits below both action buttons.
2. Confirm safe-area visibility and action-button hit targets in portrait, including browser chrome expanded/collapsed.
3. Recheck at widths 320/375/390/430 CSS px, heights 568/667/844/932 CSS px and in reduced-motion mode; these are test cases, not measurements of this screenshot.
4. Take before/after screenshots at start, 2 safe cards, Bank, Snap, Zero Break, and win. Check no Pot/progress/card/control collisions and no scroll or scale jumps.
5. Validate card → Pot, Bank → chest and reward animations separately. A successful GitHub build does not prove those visual behaviors.

## Keep unchanged

- Core Overswing engine, deck, scoring and Bank eligibility.
- Shared inside-meter numeric scale and floating position marker.
- Three numeric-only multiplier charms, red Zero Break marker, and separate Pot versus secured chest.
- No automatic browser-smoke step in GitHub Pages CI.

## Follow-up

Next priority is motion-timing and Bank/Snap/Zero Break feedback review using **short iPhone screen recordings**, not more UI elements.
