# BEE HOP
## Game Design Document — Honeycomb Route-Puzzle

**Version:** 1.0 — Design proposal  
**Date:** 11 November 2026  
**Status:** Proposed experience and mechanics; not all systems are implemented  
**Prototype:** [Play Bee Hop](https://umuterturk.github.io/card-game-lab/bee-hop.html)  
**Repository:** [card-game-lab](https://github.com/umuterturk/card-game-lab)  
**Audience:** Design, engineering, art, sound, analytics, QA

> **Design promise:** One bee. A field of pollen. Every jump matters. A small set of honeycomb-inspired abilities turns an apparently impossible route into a clever solution.

---

## 1. Executive vision

Bee Hop is a **portrait-first, single-player spatial puzzle game**. A bee moves in six straight directions along the three axes of a hexagonal honeycomb. Every ordinary move must cross **exactly one pollen flower**, which disappears. The player may choose **any empty landing cell beyond the flower**, making the destination—not just the captured flower—the critical decision. Collect all pollen without becoming stranded.

The game must be learnable visually in seconds but sustain increasingly demanding planning, especially once player-supplied abilities can change the bee's position, the pollen layout, or the number of controllable bees.

**Three experience pillars**

1. **Clarity before complexity.** Show possible actions directly on the board; no arithmetic, opaque rules, or long tutorials.
2. **Agency before luck.** Puzzles are deterministic and verified solvable with their included tools. Setbacks result from understandable decisions; the player can learn and retry.
3. **Anticipation → tension → insight → delight.** The exciting moment is spotting a route that looks unlikely, committing to it, and seeing a chain of captures complete—not triggering a random jackpot.

**Non-goals:** Time-pressure as the default, reflex mechanics, lives/energy that interrupt play, randomized outcomes in a fixed puzzle, pay-to-solve mechanics, misleading visual feedback, or a cluttered board full of power-up buttons.

### What's implemented vs. proposed

| System | Current 40-level prototype | This document's target |
|---|---|---|
| Single bee; six hex directions; flexible landing; pollen removal | Implemented | Preserve |
| Seeded reverse construction + solver-backed fixed levels | Implemented | Extend to abilities |
| Exact decision-DAG analysis for ordinary jumps | Implemented | Extend to tool-aware state |
| 40 levels and five-level waves | Implemented | Retune after tool introduction |
| Unlimited Undo, Restart, solver Hint | Implemented | Change Undo to limited after onboarding; make hints contextual |
| Worker Bee, Wax Tunnel, Pollen Seed, Waggle Dance | Not implemented | Stage as distinct tools |
| Hives / permanent tunnel terrain / boss-specific mechanics | Not implemented | Add later only if core tests well |
| Metrics and human playtesting | Not established | Instrument and validate |

No current level is claimed to require or be solved with abilities; that guarantee is a **publication gate for all future tool-aware levels**, not a claim about deployed code.

---

## 2. Core game rules (authoritative proposed baseline)

**Board.** A rectangular footprint of pointy-top hexes, implemented with odd-row-offset rendering and axial coordinates for movement. Six legal directions are the axial vectors `(1,0), (0,1), (-1,1), (-1,0), (0,-1), (1,-1)`.

**Ordinary jump.** Select a bee, then choose a destination on one of its six straight axial rays:

- It may fly through any number of empty cells before encountering the **first pollen** on that ray.
- It must cross that pollen and land on **any empty hex after it**, up to—but not including—the next pollen or a boundary.
- The crossed pollen is removed; no other pollen is collected.
- It cannot pass through or land on another bee when multiple bees exist.
- Every legal ordinary jump removes exactly one pollen. No ordinary movement without a capture.

**Objective.** Collect all starting pollen, plus any pollen created by abilities. The number of turns is not a scoring currency; minimizing errors and unnecessary assistance can support optional mastery rewards.

**Success.** `remainingPollen === 0`, regardless of bee positions or ability charges.

**Stuck.** No ordinary jump remains for any bee, and no remaining position-changing or board-changing ability can rescue the state. The interface must not display a definitive loss until it checks *all* remaining legal ability actions. Undo and Restart remain available even when stuck.

**Interaction.** Show all legal landing hexes immediately. Tapping a pollen flower optionally filters those landings; tapping a bee selects it and resets the filter. When multiple bee/capture combinations reach the same landing, the UI must require disambiguation rather than silently choosing one.

**Determinism.** The same level and same actions always produce the same outcome. No concealed roll after a jump. A procedural generator may choose level layouts **before** a level is published, not randomize the outcome of a player's action.

---

## 3. Ability system: creativity, not automatic victory

Abilities should perform different *topological operations* on the puzzle. A player should be able to describe their function in one sentence. At most **three contextually relevant tool controls** should be visible on a phone; Undo is a separate persistent action.

### 3.1 Second Wing — Undo (recovery)

- Rewind the last **committed player action**, restoring bee positions, collected and seeded pollen, tool inventory/charges, tunnel state, and selection state consistently.
- Unlimited for Levels 1–5; proposed budget of **three free rewinds per level** beginning at Level 6, subject to playtesting.
- A rewind never has a gameplay penalty other than spending a rewind charge. Charges used for rewinds must not be restored by rewinding a rewind; track them outside the reversible action snapshot.
- Restart always resets to the original level with its supplied tools. Players cannot become permanently locked out of progression by experimenting.
- Undo is a recovery interface, **not** a forward-solver action or a source of additional logical solutions: if the player can win after Undo, an earlier forward choice could have reached that same state.

### 3.2 Waggle Dance — foresight (information)

- Reveal one **solver-verified promising jump** with a preview of its pollen and possible landings; ideally let players request one more layer of explanation instead of playing the move automatically.
- Optional, non-consuming in onboarding; later two free reveals per level as a *tentative* tuning point.
- Never claim a move is safe merely because it has a next jump. Distinguish **immediate continuation** from **eventual victory**.
- If no winning route remains, state that clearly and offer Undo/Restart, not a fake hint.
- Because it changes information, not board state, Waggle Dance does not alter whether a puzzle is solvable.

### 3.3 Wax Tunnel — reposition (space)

**Proposed MVP rule:** Spend one supplied Tunnel charge to move the currently selected bee to **any empty cell within axial hex distance ≤ 3**. This is an *independent action*, usable even when no pollen jump is available. It does not collect pollen and cannot pass or land on another bee.

- Tap Tunnel → choose a glowing valid exit → see bee burrow into wax and reappear.
- No cost in pollen; one charge consumed on successful placement only. Cancel freely.
- First release: **one charge**; optional levels might supply two.
- A tunnel may create a route that could not exist from the old bee position. It must not be an unrestricted any-cell teleport.
- Future **paired hive tunnels** are board terrain, a separate mechanic from the consumable tool. Do not ship both in the same tutorial.

**Why it matters:** Changes the active bee's position without changing remaining pollen.

### 3.4 Pollen Seed — reshape (material)

- Spend one Seed charge to place **one extra pollen** in an empty hex **within distance ≤ 2 of a selected bee**; the hex cannot contain a bee, pollen, or a blocked terrain cell.
- The newly planted pollen **joins the collection objective**. The counter increases visibly, e.g. `3 remaining → 4 remaining`.
- Planting is allowed even when no ordinary jump remains.
- Cancel before placement without consuming the charge.
- First release: one charge in assigned levels only. This power can easily enlarge the solution state space, so it needs careful solver budgets and level-specific limits.

**Why it matters:** Alters which lines contain capturable pollen; it is not a free capture.

### 3.5 Call a Worker Bee — coordinate (agents)

**Signature ability.** Spend one Worker charge to summon a second bee onto **one player-chosen, designated hive entrance**, which must be empty. A level may expose one or more entrances.

- The second bee remains until completion, and both bees may independently perform ordinary jumps.
- Before each move the player selects which bee to control; the inactive bee is a **solid blocker** along rays.
- Neither bee can occupy the same cell, cross the other bee, or capture the other bee.
- Both share the same pollen objective; either can finish a level.
- The summon itself captures no pollen. It is legal even if the original bee is stuck.
- For MVP, max **two total bees**, one Worker charge, no despawn or bee swapping. Summoning is optional unless a level is explicitly labeled as an ability puzzle.
- When a level contains multiple entrances, choosing where and when to summon is itself the puzzle. The entrance positions must be visible before the player uses the tool.

**Why it matters:** Creates a second agent and a new family of routes while introducing blocking interactions. For a Worker Bee boss, verify that winning paths require **captures by both bees**, not merely that the second bee replaces a stranded original.

### 3.6 Later mechanics (not MVP)

- **Bee Breeze:** Shift a pollen into one adjacent empty hex; board reshaping with no new pollen.
- **Royal Jelly:** Permit one jump that captures two pollen on a single axial ray; major rules exception, reserve for advanced expansion.
- **Paired wax tunnels:** Fixed linked entrances as board terrain for themed worlds.

Do not add these until the four-tool system demonstrates distinct value and the interface stays readable.

### Ability design matrix

| Ability | Change to game state | Can rescue stuck? | Creates a new forward route? | Solver treatment |
|---|---|---|---|---|
| Undo | Return to previous snapshot | Yes, through retry | Not logically new | Exclude from forward route counting |
| Waggle Dance | Information only | No | No | Derive from solver; not an action |
| Wax Tunnel | Bee position, charge | Yes | Yes | Enumerate valid exits |
| Pollen Seed | Pollen set, charge | Yes | Yes | Enumerate valid placements |
| Worker Bee | Bee set, charge | Yes | Yes | Enumerate entrances and subsequent bee choices |

**Economy principle:** If a level requires a tool for solvability, it is **included free with that level**. A user must never need to watch an ad, buy currency, or wait for a refill to complete a mandatory puzzle. Optional tools may soften difficulty, but purchasing power must not be the intended solution to a broken puzzle.

---

## 4. Excitement design: anticipation, tension, insight, relief

“Dopamine” and “adrenaline” are useful shorthand for a *subjective* pattern of anticipation, suspense, action, and reward. We cannot measure or guarantee neurotransmitter responses through a game design. The goal is a rewarding **skill-learning loop**, not artificial compulsion.

### 4.1 A target 30–90-second play loop (hypothesis)

1. **Read (0–5s):** Bee and pollen are immediately visible; legal landings softly glow. No modal tutorial after the opening levels.
2. **Anticipate (5–20s):** Multiple plausible landing positions invite prediction. When hovering or touching a pollen, preview the exact capture and a line of travel.
3. **Commit (0.2–0.5s):** Bee darts along the chosen axis; intercepted pollen bursts, and the bee arrives with a soft landing.
4. **Re-evaluate (2–15s):** New reachable options illuminate quickly. Wrong routes are legible, not arbitrary.
5. **Insight (variable):** A player recognizes a promising sequence or realizes that a Tunnel/Worker can recover a path.
6. **Resolve (1–2s):** The final pollen produces a larger honey release, a brief screen celebration, then a clear Next Level action.

Time ranges are **initial UX hypotheses** requiring observation, not mandated deadlines. Do not force the player to hurry.

### 4.2 The desired emotional waveform

| Moment | Intended feeling | Design trigger | Avoid |
|---|---|---|---|
| First look | Curiosity, competence | One simple objective and readable board | Text walls |
| Two credible routes | Productive uncertainty | Distinct landing consequences | Indistinguishable choices |
| Last 2–3 pollen | Rising suspense | Board quiets; remaining flowers gain focus | Fake countdowns, screen shake |
| Apparent trap | Concern, agency | Clear Undo/ability options | Invisible rules or punitive popups |
| Clever recovery | Relief, pride | Tool creates route, visible new possibilities | Auto-completing puzzle |
| Final capture | Release, accomplishment | Rich but short animation and sound | Excessive confetti / lengthy lockout |
| Next puzzle | Fresh curiosity | New shape or meaningful choice pattern | Mandatory interruption |

**Tension is generated by foresight:** the player sees that a wrong landing can strand the bee. No random loss, hidden danger, or escalating monetary stake is necessary.

### 4.3 A surprise-and-certainty balance

- **Certain rules, uncertain discovery.** The outcome of every action is deterministic; what the player has not yet discovered is the route.
- **Frequent microfeedback:** Every capture removes one flower, increments progress, and creates a sound/particle accent.
- **Rare macrofeedback:** Boss victory opens a new honeycomb region and changes its ambience. The celebration feels earned because difficulty increased.
- **No random reward boxes or variable payouts.** Reward variety comes from solution structure, different movement patterns, and visual presentation.
- **No artificial cliffhanger while the player is thinking.** Ambient tension should be subtle and responsive rather than loud or fatiguing.

### 4.4 Audio and motion specification

- **Move preview:** 80–130ms line highlight; do not delay tap responsiveness.
- **Jump:** approximately 180–320ms including takeoff and landing, scaled down when multiple captures occur quickly.
- **Pollen collection:** crisp pop plus a short honey-particle trail to the jar; avoid covering neighboring legal moves.
- **Last pollen:** 450–900ms controlled flourish, then interactive Next Level immediately.
- **Worker Bee summon:** hive pulse → second bee emerges → both are visually distinguishable, 350–600ms.
- **Wax Tunnel:** wax ripple → brief bee disappearance → exit glow, 250–450ms.
- **Sound mix:** soft wing/buzz ambience, distinct directional movement cue, restrained success chord. Allow separate sound and music controls.
- **Accessibility:** reduced-motion mode, high-contrast legal highlights, haptic/audio toggles, large touch targets, labels that do not depend on color alone.
- Never prevent an input solely for a decorative animation longer than necessary; allow skip/fast-forward for repeat play.

---

## 5. Level architecture: 40 levels, linear onboarding, then waves

**Current progression contract:** Levels 1–5 are a steady onboarding ramp. From Level 6 onward, five-level waves rise toward a boss (10, 15, 20, 25, 30, 35, 40), then the next wave begins easier **on a larger board**. Board size must remain fixed *within* each post-onboarding wave.

| Levels | Board size | Learning goal | Target beat |
|---|---|---|---|
| 1 | 3×3 | First capture and destination choice | Immediate competence |
| 2–5 | 4×4 | Flexible landing and planning 1–2 moves ahead | Steadily rising tutorial |
| 6–10 | 5×5 | Multiple valid routes, first real traps | Boss 10: first lookahead test |
| 11–15 | 6×5 | Limited Undo + optional Dance | Boss 15: recognize false continuations |
| 16–20 | 7×6 | Wax Tunnel basics | Boss 20: one intentional relocation |
| 21–25 | 8×7 | Pollen Seed basics | Boss 25: create a bridge without blocking progress |
| 26–30 | 9×7 | Worker Bee introduction | Boss 30: both bees contribute captures |
| 31–35 | 10×8 | Controlled tool combinations | Boss 35: positional sacrifice and recovery |
| 36–40 | 11×9 | Integrated route planning | Boss 40: combined-agent finale |

**Note:** This table describes *future tool-specific content*. The 40 currently deployed puzzles use the basic single-bee rule only. Ability-introduction levels must be regenerated and reverified before shipping the proposed progression.

### 5.1 Per-wave pacing after Level 5

A five-level wave is designed as:

1. **Reset:** Easier, new board size, teach an affordance.
2. **Practice:** Introduce two or more genuine options.
3. **Twist:** Add an attractive but ultimately unproductive continuation.
4. **Challenge:** More lookahead and a small number of winning routes.
5. **Boss:** Highest decision complexity in wave, a memorable final pattern, larger success presentation.

Difficulty should **wave**, but not arbitrarily spike: the first level after a boss should feel like a breath of fresh air; its baseline can still be above the preceding wave's opening.

### 5.2 Three classes of levels

1. **Pure:** Solvable without tools. Target primary route-planning mastery.
2. **Assisted:** Solvable without tools, but included ability can create alternate routes or help recover mistakes.
3. **Ability-required:** No winning route under ordinary jumps, but at least one complete winning route exists using only the **free abilities supplied**. Clearly telegraph the required mechanic in the level intro, not as a surprise paywall.

**Boss guidelines:** A boss is not simply “more pollen.” It should require a distinct insight and include at least one meaningful decision. Worker Bee bosses should show coordination rather than a trivial replacement spawn. Avoid too many deep traps that require long unwinds.

### 5.3 Difficulty bands are hypotheses, not final scores

The existing exact evaluator reports legal landings, immediate continuations, winning routes, total/real terminal routes, forks, and trap depth. Tool-aware candidates need the analogous metrics with tool states included. Do **not** equate a small solution count with a hard puzzle: a forced linear route can have one winning path and no meaningful decisions.

Difficulty ranking should primarily use:

- **Productive branching**: alternatives that win immediately or support at least one subsequent legal action.
- **Winning branching**: alternatives that admit at least one complete successful route.
- **Deep traps**: branches that continue for several captures but cannot finish.
- **Solution variety**: distinct successful pollen orders, not merely different choices of equivalent landing hexes.
- **Lookahead demand**: minimum number of moves before a wrong choice becomes recognizable under local information.
- **Forced-step ratio**: excessive forced play makes a puzzle slow rather than difficult.
- **Tool necessity and sensitivity**: whether a winning route requires tools, which tool, and whether timing/placement matters.

Difficulty is ultimately calibrated against **human** playtesting (completion rates, hints, retries, thinking time). Exact combinatorics is the quality filter and design instrument, not the final arbiter of fun.

---

## 6. Ability-aware generator and solver (engineering contract)

### 6.1 Canonical state

```ts
type PuzzleState = {
  board: { width: number; height: number; blocked: number[]; hiveEntrances: number[] };
  bees: number[];           // sorted, 1 or 2, no duplicates
  pollen: number[];         // sorted, unique; includes seeded pollen
  charges: { tunnel: number; seed: number; worker: number };
  // Nonreversible UI state (hint, selection) is excluded from solver identity.
};
```

The solver state excludes Undo and Waggle Dance: they are retry/information mechanics, not new forward-reachability actions. For no-tool levels, ordinary single-bee `legalMoves` remains the reference implementation.

### 6.2 Actions

```ts
Jump(beeIndex, pollenCell, landingCell) // exactly one pollen crossed
Tunnel(beeIndex, exitCell)               // distance <= 3; one charge
Seed(beeIndex, emptyCell)                // distance <= 2; one charge; adds pollen
Summon(hiveEntranceCell)                 // one charge; max two bees
```

Every action must have a pure legality check and immutable transition function. An invalid action leaves state unchanged. Actions must be deterministic and enumerable for exhaustive solver analysis.

### 6.3 Why exhaustive search is still possible

Ordinary jumps always remove pollen, but **Seed adds pollen** and **Tunnel/Summon may consume turns without captures**. The state graph remains acyclic if each non-capture action irreversibly consumes a finite charge, and no action regenerates a charge. Memoization must key on **both bee positions, sorted pollen, remaining charges, and applicable terrain state**. No zero-cost forward-move loops may be introduced.

Use arbitrary-precision integers for exact path counts and memoized state results. Set hard budgets for examined states, memory, and generation time. **Truncation means unknown**, never “unsolvable” or “exact.” Reject a candidate or hand it to an offline, higher-budget process; never publish it as verified if the proof did not complete.

### 6.4 Candidate generation

1. Select the wave's fixed grid size, desired pollen budget, supplied tools, and level type.
2. Generate *constructive candidate states*, extending reverse capture construction for simple cases. For Worker/Tunnel/Seed-required puzzles, synthesize an explicit valid action witness (or use an offline constraint search that produces one) rather than assuming the old one-bee reverse constructor covers every tool state.
3. Replay each witness in the **forward engine**; reject any illegal action or incomplete final state.
4. Run an **independent exact solver** for each candidate, including all available ordinary and ability actions.
5. Count distinct winning action sequences, productive continuations, trap depth, forced-step ratio, and pollen-capture-order equivalence classes where tractable.
6. For explicitly ability-required puzzles, rerun with that ability removed. Require **unsolvable without it** and **solvable with supplied inventory**.
7. For Worker Bee cooperation bosses, search for a witness where each bee makes at least one capture; optionally reject any candidate with a winning path using only one bee.
8. Rank quality within the desired wave difficulty band. Reject boards with trivial forced routes, excessive guesswork, degenerate tool exploits, or unusably small touch targets.
9. Commit published level fixtures **with their solution witness, generator seed, evaluator version, difficulty metrics, and tool inventory**. Runtime must load fixed curated fixtures rather than spend seconds generating puzzles on launch.

### 6.5 Acceptance tests / hard invariants

- **All 40** levels load, render, and have at least one solver-confirmed successful action sequence.
- Every tool action passes legality and transition tests, including cancel behavior and exhaustion of charges.
- Every ability-required puzzle is provably winnable with its included inventory and not winnable in the designated no-ability variant.
- Summoned bees never overlap; bees block axial rays; either bee can win; no diagonal/parity errors.
- Seed-created pollen is counted toward victory; an ability may not make the victory counter inconsistent.
- Solver results with a state-cap truncation are never used as certification or labeled exact.
- A level can have a reachable state with no ordinary jump but a legal Tunnel or Summon; UI must not incorrectly declare loss.
- A rewind restores the complete previous board/inventory snapshot, without refunding the meta Undo charge.
- For every level, one winning witness is replayed with the **same reducer as the UI**.
- 40-level tutorial/wave contracts hold: first five increase on the design index; within every later five-level wave, size stays fixed and the boss is the peak; size increases only at wave boundaries.

**Performance target (provisional):** Maintain responsive input under 50ms for common actions on mid-range mobile devices. Keep solver/hint work off the rendering critical path as complexity expands; precompute hints or use a worker where necessary.

---

## 7. Product UX: less UI, more board

### 7.1 Portrait screen priority

1. Current level name, wave identity, and optional boss marker.
2. Pollen remaining / progress, compact and always readable.
3. Large honeycomb board centered on available space; bee, pollen, accessible hexes unmistakable.
4. Persistent Undo; a **single contextual tool tray** for abilities granted in the level.
5. Hint and Restart as secondary controls.

The **11×9 board** is a known touch-target risk. Use responsive board zoom/panning, min-sized hit regions (when geometrically feasible), larger tap targets through an interaction overlay, and clear selected-source/destination feedback. A cell must be tappable without accidentally choosing a neighbor.

### 7.2 Two-step selection only when useful

- One bee, unambiguous destination: tap a glowing landing directly.
- Many source flowers feeding different outcomes: tap pollen to filter possible landings.
- Two bees: tap the desired bee; potential jumps for that bee glow. A distinct outline/color cue identifies the selected bee in addition to its appearance.
- Active ability: clearly show valid targets, give a cancel affordance, and charge the ability **only after successful action**.

Do not ask for confirmation of ordinary jumps. Undo is the safety net.

### 7.3 Skill expression without numerical clutter

- No main score or multiplier is needed.
- Progress is collected pollen, emerging honey in the jar, and visible route completion.
- Optional post-level badges: **Pure Flight** (no abilities), **Clean Wings** (no Undo), **Hive Master** (boss complete). Do not shame players for using tools.
- The evaluator's counts and difficulty index stay in a developer/debug overlay, not on the default gameplay screen.

---

## 8. Healthy engagement, retention, and monetization guardrails

Design for the desire to solve **one more interesting puzzle**, not the fear of losing access.

**Positive engagement drivers:** visible mastery, solvable challenges, short retry loops, variety across wave mechanics, explicit improvement in route planning, and a satisfying final capture. Bosses provide meaningful milestones; new board sizes provide novelty without multiplying rules.

**Avoid:** fake urgency, punitive timers, forced ads after failure, near-miss manipulation, deceptive odds, energy refills, purchased mandatory tools, compulsory daily streaks, or celebrations longer than the time spent solving.

**Monetization (if considered later):** cosmetics, themes, bee trails, hive skins, and optional non-intrusive purchases. Required tools are always supplied. If optional paid assistance is ever tested, do not let it replace core level solvability or degrade deliberately engineered difficulty.

**Break-friendly design:** no countdown; safe pause/resume; easy level restart; no punishment for returning after a long absence. This sustains enjoyment rather than relying on compulsive loops.

---

## 9. Telemetry and research: prove excitement, don't assume it

Instrument with privacy-preserving, aggregate metrics; avoid collecting unnecessary personal data.

| Signal | Interpretation | Initial hypothesis to test |
|---|---|---|
| Level completion without tools | True standalone puzzle accessibility | High on tutorial; lower but healthy on bosses |
| First-try completion | Whether new levels feel fair | Smooth waves, no unexplained cliffs |
| Median time to first move | Readability vs analysis burden | Short for early levels |
| Time between moves | Useful planning vs confusion | Higher at key forks, not uniformly high |
| Undo / Restart frequency | Error cost and recovery quality | Some use is healthy; repeated loops signal traps |
| Ability use and timing | Whether a tool has interesting agency | Diverse legitimate usage, not a forced button press |
| Abandonment at stuck states | Fairness and escape clarity | Low after recovery options are shown |
| Successful alternative routes | Replay and solution diversity | Multiple strategies on selected levels |
| Taps on invalid hexes | Touch/UX failure, not puzzle difficulty | Minimize, especially on 11×9 |
| Player-rated satisfaction and fairness | Real experience | Improves across iterations |

Do not attach universal numerical thresholds to “dopamine” or claim laboratory accuracy. Run instrumented playtests (e.g., 10–20 players per iteration), review recordings with consent, compare within-subject reactions to different levels, and use a small post-level question: **“Was this satisfying?”** and **“Did the next move feel understandable?”**

**Prioritize fairness over mere retention.** If players spend longer because the UI is confusing or a board is unfair, that is a failure, not success.

### Questions for the first playtest

1. Do players understand why a particular landing captures one pollen and not another?
2. Is choosing any landing beyond the pollen enjoyable, or do too many glowing destinations overload the eye?
3. Do players recognize the difference between “has a next move” and “can eventually finish”?
4. Does Tunnel feel like creative relocation or an unearned escape hatch?
5. Does summoning a Worker Bee feel like cooperation, especially when both bees are needed?
6. Are wave bosses memorable, and does the next wave provide a welcome reduction in tension?
7. Do players feel proud of a clever solution without requiring excessive audiovisual reward?

---

## 10. Development plan and release gates

### Milestone A — Ability-aware foundation

- Extract pure action reducer and canonical multi-bee game state.
- Implement independent exact solver with finite tool charges and bounded state budgets.
- Add brute-force cross-checks on small boards and witness replays.
- Keep existing 40 basic levels intact while refactoring.

**Gate:** All existing tests pass; no changes to base jumping behavior.

### Milestone B — First abilities

- Implement limited Undo with meta charge handling; Waggle Dance as solver-derived foresight.
- Implement Wax Tunnel and Pollen Seed with complete previews, cancellation, and deterministic transitions.
- Evaluate which dead-end states can be rescued; identify degenerate exploits.

**Gate:** Every tool can be used intentionally, accurately displayed, undone/restarted correctly, and incorporated into solver certification where relevant.

### Milestone C — Worker Bee signature mechanic

- Hive entrance(s), second bee summon, multi-bee selection, occupancy/ray blocking.
- Construct at least five bespoke coordination puzzles and a boss where both bees perform captures.
- Measure the new branching factor and hint performance.

**Gate:** No collision, double-capture, phantom jump, incorrect stuck state, or solver/UI divergence.

### Milestone D — Curated 40-level campaign

- Retune the 40 levels into pure, assisted, and ability-required categories according to the wave roadmap.
- Generate/curate candidates offline using exact metrics, then replay every stored winning witness.
- Verify each ability-required level is solved by **included tools only**.
- Playtest pacing and board readability on representative small and large phones.

**Gate:** 40/40 solver-certified, correct wave difficulty pattern, no paywall or consumable shortage, manual gameplay acceptance on mobile.

### Milestone E — Feel, instrumentation, and polish

- Tune transitions, camera emphasis, sound layers, win choreography, and low-motion options.
- Add instrumentation and repeated human playtests.
- Tune bosses for memorable insight, not simply maximal path count.

**Gate:** Smooth performance, legible feedback, positive player-rated fairness and satisfaction, and no recurring UX blockers.

---

## 11. Open decisions and testable design bets

| Question | Initial recommendation | How to validate |
|---|---|---|
| Must Worker Bee be mandatory in some levels? | Yes, only where supplied free | Confirm alternate no-worker solver fails |
| Can second bee block first bee? | Yes; makes coordination meaningful | Tests and player comprehension |
| Tunnel range | ≤3 hexes, independent action | Evaluate recovery power and route inflation |
| Seed range | ≤2 hexes, new pollen must be collected | Check exploit patterns and solution complexity |
| Undo count after tutorial | Three per level | Observe retries, drop-off, feelings of fairness |
| Solution uniqueness | Not universally required | Compare satisfaction of one vs several winning orders |
| Level duration | Short without a clock | Human completion-time distribution |
| Introduce multiple tools together? | No; one new idea per wave | Learning and cognitive-load testing |
| Tool necessity in bosses | Occasional and explicit | Ability-aware solver certification |

---

## 12. Definition of a great Bee Hop level

A great level is **solvable, legible, and surprising**. It presents at least one honest choice, lets the player reason about the consequences, makes an apparent obstacle feel self-imposed rather than arbitrary, and ends with a clean moment of mastery. An advanced level earns its difficulty through **connected decisions**, not the sheer number of hexes or flowers.

A great *ability* level adds another layer: the player understands how a bee, tunnel, or seeded pollen changes the route—and feels that **they invented the solution**, not that the game solved itself.

**North-star experience:** *“I thought I was stuck. Then I saw the landing—and everything clicked.”*
