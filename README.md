# Card Game Lab

A mobile-first React (Vite) catalog for 18 experimental solo card-game designs.

## Features

- Browse 18 experiments, including scores, mechanic descriptions, review findings, and verdicts.
- Search, sort, and filter by prototype candidate, revision, rejected, playable, or starred.
- Star games to keep a shortlist. Stars persist via browser `localStorage` on that device; they **do not sync between browsers/devices**.
- Open shareable game detail URLs (`#/games/stormfreight`).
- Read full archived Markdown reports for experiments 010–018, and clearly labeled abridged summaries for 001–009.
- Play **all 18 experiments**. Stormfreight (004) and Shortfuse (010) have their original dedicated layouts; the other 16 use a compact mobile game board with distinct game engines, legal moves, hidden draws, scoring, banking, setbacks and restarts.
- Confirm potentially destructive voluntary gambles and inspect action history.
- Resume a run on the same browser using local storage.
- Responsive portrait/mobile layout and Add to Home Screen manifest.

## Develop

Requires Node.js 22 or later.

```bash
npm install
npm test
npm run dev
npm run build
```

## GitHub Pages

The repository includes `.github/workflows/pages.yml`, which deploys the `dist` folder whenever commits are pushed to `main`.

In repository Settings → Pages, set **Build and deployment → Source → GitHub Actions**. After pushing, watch the **Actions** tab and then open <https://umuterturk.github.io/card-game-lab/>.

The site uses hash navigation and a relative Vite base so deep links are compatible with GitHub Pages without server-side rewrites.

## Structure

- `src/App.jsx` — React catalog, favorites, game details and prototype screens.
- `src/logic.js` — pure Stormfreight and Shortfuse gameplay state transitions.
- `src/prototypes/engines.js` — 16 independent game engines, ported from the archived Python simulators.
- `src/prototypes/PrototypePlay.jsx` — responsive playable interface and persistent local runs.
- `src/prototypes/prototype.css` — touch-first board and actions styling.
- `src/data/games.json` — metadata for all 18 games. Add future experiments here.
- `public/reports/` — archived reports (001–009 abridged, 010–018 complete).
- `tests/` — Node.js built-in test runner for catalog and game logic.
- `.github/workflows/pages.yml` — GitHub Actions build, test and Pages deploy.

## Limitations

The experiment scores and simulations are exploratory research, **not human playtesting results**. Browser favorites are intentionally local-only. These are exploratory, locally saved browser prototypes—not commercial-release-ready implementations. The generic interface prioritizes functional rule coverage over custom animations, touch drag interactions, and high-fidelity art. Stars and game saves are stored per browser only.


## Four guest prototypes

The catalog includes **Kindling, Overswing, Bondstone, and Undertow** (IDs 019–022). Each has a separate browser-side rules engine and mobile play interface following the supplied final specifications. Their scores are shown as **unrated** because the other agent did not provide an eight-category rating directly comparable with our original 18.

Full guest implementation specifications are under `public/reports/019-kindling.md` through `022-undertow.md`. Reference fixture and randomized legal-play checks are in `tests/external.test.mjs`.
