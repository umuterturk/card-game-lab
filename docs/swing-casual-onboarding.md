# Swing Casual — Progressive Onboarding Master Plan

**Status:** Proposed design for implementation and player validation; not shipped or play-tested.  
**Date:** 5 November 2026  
**Design objective:** Maximize first touch, first win, and completion of the entire onboarding while teaching every **enabled player-facing core mechanic** through play.

## 1. Product decision

**Replace the current all-in-one Level 1 with ten short, graduated levels.** The player should start playing on launch without menus, instructions, a full HUD, Flip, or multiplier pills. The first win should require **two card taps and one Bank tap**. Every subsequent stage teaches one new concept and rehearses the established loop. The tenth is a guided-free mastery level.

This follows Apple's [Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/): teach objectives incrementally, let the player act immediately, demonstrate competence before expanding complexity, provide contextual help, and delay nonessentials. As a **design reference**, [Gamedexy's captured Magic Sort! onboarding](https://www.gamedexy.com/games/magic-sort) shows an early directed tap/pour sequence and rapid first success. Do **not** treat unverified Magic Sort level details or any time estimates from third parties as proven benchmarks.

### Rules of the first session

- **Action before explanation.** No pre-level how-to popup, forced tutorial video, title screen, account prompt, shop, boosters, ratings, or lives indicator on Level 1.
- **One new lesson per level.** Newly visible mechanics are always relevant immediately. Never display three unexplained `×1` multipliers.
- **Never fake the engine.** If a mechanic is hidden, it must either be impossible to trigger with that level's deck or genuinely disabled by an explicit tutorial-only engine rule.
- **Minimum early agency, then gradual choice.** Levels 1–2 have one obvious next action, Level 3 opens card choice, and subsequent levels increasingly allow independent play.
- **One-to-one motion.** Card value enters the pending Pot; only Bank moves pending reward into secured glass. Signed direction changes the meter independently of the positive value added to the Pot.
- **Never force a failure for spectacle.** Introduce Snap risk through an understandable edge preview. If the player does Snap, apply the real loss but provide a winnable recovery.
- **Do not make the tutorial a corridor.** From Level 3, allow meaningful alternative winning paths; hints should recover from inactivity, not override a player's decision.
- **Short victories, fast continuation.** A short Bank celebration and immediate, thumb-reachable Next affordance. Do not auto-advance so quickly that players miss the result.

## 2. Exactly what Level 1 feels like

At launch, the screen shows **one large card marked `2`**, a small glass goal vessel engraved `0 / 5`, and a quiet garden background. There is **no meter, no Flip, no multiplier, no hearts, no deck count, no menu, no large level banner**, and no permanent tutorial text. The Pot is initially empty/quiet. The actionable card gets a subtle delayed attention cue only if the player has not tapped.

| Moment | Player input | Visual consequence | Exposed elements |
|---|---|---|---|
| Open | — | Large `2` card and glass goal `0 / 5` | Card, target glass |
| First action | Tap `2` | Card contributes **2** into a newly prominent pending Pot; a `3` card slides into the same slot | Card, Pot, glass |
| Second action | Tap `3` | Pot grows to **5**; a `BANK 5` affordance appears **on/at the Pot** | Pot, Bank affordance, glass |
| Third action | Tap Bank | **5** flows from Pot into glass; progress `5 / 5`; gratifying win effect | Secured gold, success |
| Win | Tap Next | Level 2 starts promptly | Next |

**Target:** 5, **minimum successful gameplay taps:** 3 (plus Next), **loss probability by design:** zero. The `2` and `3` example must be implemented with engine cards that do not create an unseen resonance bonus. The hidden engine still moves Swing, but safe values and the absent meter make it irrelevant to Level 1's explanation.

The engine currently requires `initialHandSize >= 2`; the Level 1 UI can initially reveal **one of two real hand cards** and unveil the other after the first tap. That is a *presentation and action-availability restriction*, not a fake draw. The Bank rule requires two actions, which matches the proposed sequence. Keep the Bank interaction on the pending Pot (the current casual control pattern), but show the word `BANK` when it first becomes actionable.

## 3. Ten-level teaching ladder

**All action counts and targets below are provisional design targets, not tested/generated decks.** Each deck needs engine-backed simulation before shipping. The word 'unlock' means both actual engine availability and UI exposure.

| Level | Introduce exactly one lesson | New visible element | Designed play pattern | Approx. gameplay actions | Guardrail / competence check |
|---|---|---|---|---:|---|
| **1 — First Treasure** | Tap cards to collect; Bank secures the Pot | One card → pending Pot → contextual Bank | `2`, `3`, Bank for 5 | **3** | Guaranteed win; no Flip, meter, factors, hearts |
| **2 — Left and Right** | Signed cards move in opposite directions while **both add positive value** | Horizontal meter, signed card arrows | `+4` moves right; `−2` moves left; +6 Pot; Bank | **3** | Meter ends at +2; no crossing, no Snap |
| **3 — Your Choice** | Choose between visible cards | **Two-card hand** | Multiple safe routes to the same reachable goal; Bank when ready | **4–5** | Player chooses without a compulsory hand pointer; all available paths viable |
| **4 — Hidden Card** | Flip draws and immediately plays a face-down card | **Flip** and face-down deck | One safe Flip and other card plays, then Bank | **4–5** | Safe scripted Flip; factor gains genuinely disabled here |
| **5 — Crossing Bonus** | Crossing through (not landing on) zero boosts **Swing** | First `×1` Swing pill, then actual `×2` | Example: `+3` then `−5` crosses +3 to −2; Bank | **3–5** | Award comes from engine; show single correct pill increase |
| **6 — Flip Streak** | Safe, non-crossing Flip boosts **Flip** factor | Second `×1` Flip pill, then earned `×2` | Example: `+2` then Flip `+3`; Bank | **4–6** | Player witnesses a real non-crossing Flip gain |
| **7 — Jackpot Flip** | Crossing zero **with a Flip** boosts Jackpot | Third `×1` Jackpot pill, then earned increase | Example: `+4` then Flip `−6`; Swing and Jackpot may both legitimately grow | **4–6** | Two rewards can occur; animate individually and accurately |
| **8 — Exactly Zero** | Landing **on** zero resets factors, **not** the pending Pot | Temporary neutral Zero Break effect | Example: `+3`, `−5` (Swing gain), `+2` (exact zero), then Bank | **4–7** | Pot persists and factors reset to `×1`; contrast with crossing |
| **9 — Edge Danger** | Beyond ±limit Snaps: pending Pot lost, secured gold stays | Edge danger, hearts/chances, Snap consequence | Bank once; then meet a choice near an edge. Risky play may Snap; recovery remains possible | **6–9** | No forced Snap; first Snap is recoverable without purchased continue |
| **10 — Your First Real Puzzle** | Combine what was learned without mandatory prompts | Full casual HUD, 3-card hand, Flip, 3 pills, remaining deck/chances | At least two valid strategies and a meaningful Bank-vs-continue choice | **6–10** | Win without scripted actions; no unexplained new mechanic |

**Unlock continuity:** Once a mechanic is introduced it stays visible, unless a specific level rule makes it irrelevant and that is clearly signaled. Keep the meter from Level 2 onward; Flip from Level 4; Swing, Flip, Jackpot pills from Levels 5/6/7; danger/chances from Level 9. After Level 10, players enter normal Level 11 with the full casual vocabulary.

### The one thing not to teach by surprise

The current Overswing engine can award **resonance points** for consecutive matching suits. They alter the true Bank payout without changing the absolute card ranks. **Decision required:** either (preferred for initial Swing Casual onboarding) explicitly disable resonance through a tested casual-only rule, including for post-onboarding levels until it gets a dedicated lesson, **or** add a separate resonance teaching level before the unguided mastery stage. Similarly, keep bank hand-cap loss/tax, Royals, relics, and other variations unavailable until separately introduced. Do not invisibly modify scores.

## 4. Contextual guidance, not tutorials as interruptions

**First tap:** Give a subtle 1-cycle card glint after ~2–3 seconds of inactivity. If still idle, a small pointing hand can tap the actual card and disappear as soon as the player acts. Never require dismissing a prompt. These are proposed timings for A/B testing, not universal standards.

**First Bank:** After the second tap, the pending Pot glows once and displays `BANK 5`. The player taps the Pot. They learn through physically seeing value move into the glass. Subsequent Banks show the **engine-computed potential payout**, not a fabricated UI sum.

**First multiplier:** Fade in one pill at `×1` as its level begins. After a real engine event, animate the numerical gain from the meter to that pill. Only afterward may a short, one-line contextual hint appear (e.g., `Cross zero → stronger Bank`). Hints never cover the controls.

**First Snap risk:** At an edge, a selected risky card can preview the marker beyond the boundary, accompanied by an edge highlight. A successful alternative should be visible. If the player proceeds, the real engine Snaps; animate the **pending** Pot breaking but do not animate the **secured** glass losing its contents. Show one lost chance and an immediately viable comeback.

**Help and skip:** All learned rules should be discoverable from a tiny help affordance after early levels; provide a Skip Tutorial option for returning/experienced players, with a simple full-rule summary available. Save progress after each completed level and restore a session after interruption without replaying compulsory prompts.

**Animation hierarchy:** Card tap = extremely responsive, lightweight; factor gain = medium and precise; Bank = major satisfaction; win = brief celebratory punctuation. Respect reduced-motion and muted/audio-focus settings. All tap regions must be comfortable on a small iPhone and controls must not shift position during animations.

## 5. Engineering contract

Current source: `src/external/engines.js` (authoritative payout and action rules), `src/casual/firstLevel.js`, `SimplifiedGame.jsx`, `MinimalBoard.jsx` and active `minimal.css`. Inspect latest main before modifying; the original brief's pinned handoff is `11acc66bdc75e5b4e4f9a18032c3c763b65a0e09`.

**Add a data-driven onboarding layer, not a second scoring engine.** Proposed level data schema:

```js
{
  id: 1,
  target: 5,
  deck: [/* validated engine card IDs */],
  initialHandSize: 2,      // engine currently requires 2..8
  visibleHandSlots: 1,     // tutorial presentation
  rules: {
    snapLimit: 8,
    bankCapacityLoss: 0,
    steerAlwaysToPot: true,
    steerNoncrossPenalty: 0,
    flipNoncrossPenalty: 0,
    // Explicit engine-supported casual tutorial gates, to implement:
    enableSwingFactor: false,
    enableFlipFactor: false,
    enableJackpotFactor: false,
    enableResonance: false
  },
  unlocks: ['cards', 'pot', 'bank', 'target'],
  guidance: { mode: 'contextual', firstHintAfterMs: 2500 },
  success: { requiresBankedTarget: true }
}
```

This is **proposed schema**, not API currently accepted by the engine. The engine currently supports `steerAlwaysToPot`, `bankCapacityLoss`, and factor gain/penalty modifiers, but **does not** expose individual `enable*Factor` or resonance toggles. Add these only as explicit, tested, opt-in casual rules; full Overswing default behavior must remain identical. Example: Level 4's first non-crossing Flip currently increases Flip factor in the core engine, so merely hiding its pill while still paying the bonus is unacceptable. Until feature-gating is implemented, do not ship that lesson ordering.

**Action gating:** `overswingActions` supplies the actual legal set; the onboarding overlay may further restrict actions *only during the first guided steps*. An action shown as enabled must be both engine-legal and tutorial-allowed. Do not physically show one card while secretly letting another receive a click. Bank becomes available after at least two actions under the current rules; Level 1 exploits that invariant. At Level 3+, introduce freedom; avoid soft locks from a wrong but legal choice.

**Simulator checks, required for each level:** Enumerate or sample every available action sequence; prove a winning path, and for Levels 1–3 prove every permitted sequence wins. Verify target reached by actual Bank payout, legal Bank timing, factor event sequence, no unintended Snap before Level 9, no hidden resonance/factor score changes, no exhausted-deck dead end, Snap recovery in Level 9, and a choice of strategies in Level 10. Test fixed seeds and note whether a restart reproduces the same teaching sequence. Verify the engine doesn't set `status='over'` before the final Bank.

**UI composition:** Use one shared game screen with level-derived visibility flags; do not create ten custom components/pages or duplicate payout logic. Reserve stable layout space for later reveals so the hand, Pot, chest and meter do not jump positions as controls appear. Keep card, Pot and Bank presentation as separate states; only actual Bank increases secured total. Test fast tapping, refresh during animations, screen heights, iOS Safari and reduced motion.

## 6. Validation gates and instrumentation

The five-player no-instructions test from the project brief is still necessary; **test the full ten-level ladder**, not just the old Level 1. Observe without coaching. Questions should check card direction, absolute Pot gains, the meaning of Bank, each multiplier's cause, exact zero vs Snap, remaining objective and what the player could have done differently. The existing **4/5 correctly explaining each critical concept** is a formative acceptance heuristic, not a statistically powered performance threshold.

Instrument: `onboarding_start`, `level_start`, `first_action`, `card_play`, `flip`, `bank_available`, `bank`, `factor_changed` (kind/values), `zero_break`, `snap`, `hint_shown`, `level_complete`, `level_exit`, `level_retry`, `onboarding_complete`, `tutorial_skip`. Track elapsed time, screen size and level ID. Never record invented user outcomes as benchmarks.

**Provisional product targets to test, not facts:** time to first meaningful tap <5 seconds for most new players; 90%+ Level 1 completion among players who enter it; 80%+ completion of the ten-level sequence among those who start; no exceptional dropout spike on Levels 4, 7 or 9; evidence that unprompted Level 10 play demonstrates real Bank-vs-risk understanding. Replace these targets after real cohorts and recordings.

A first-touch test should include players who have **never played Overswing** and people who have never played card roguelikes. Have them start at the app's launch state rather than a prearranged Level 1 screen.

## 7. Delivery order

1. Implement small, data-driven level specs and explicit engine-backed feature gates; build the simulator before authoring all ten decks.
2. Ship **Levels 1–3** together and validate first touch, Bank comprehension and negative card interpretation on an actual iPhone.
3. Implement Levels 4–7 with real multiplier event tests. Confirm no concealed score bonuses.
4. Implement Levels 8–10 and test exact-zero/Snap differences, recovery and unguided completion.
5. Perform five unbriefed onboarding sessions and a second iteration driven by observed failure points. Only then design Levels 11–20 and, much later, a large content rollout.

### Product principle to keep

**The first level is not a simplified version of the entire game. It is one satisfying action loop that earns permission to reveal the next mechanic.** The desired trajectory is **tap → reward → choice → risk → mastery**, with the complete Swing experience in the player's hands by the end of Level 10.