# Card Game Lab

A mobile-first React (Vite) catalog for 17 experimental solo card-game designs.

## Features

- Browse 17 experiments, including scores, mechanic descriptions, review findings, and verdicts.
- Search, sort, and filter by prototype candidate, revision, rejected, playable, or starred.
- Star games to keep a shortlist. Stars persist via browser `localStorage` on that device; they **do not sync between browsers/devices**.
- Open shareable game detail URLs (`#/games/stormfreight`).
- Read full archived Markdown reports for experiments 010–017, and clearly labeled abridged summaries for 001–009.
- Play two small functional prototypes: **Stormfreight (004)** and **Shortfuse (010)**. Other games are browseable research concepts, not playable implementations.
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
- `src/data/games.json` — metadata for all 17 games. Add future experiments here.
- `public/reports/` — archived reports (001–009 abridged, 010–017 complete).
- `tests/` — Node.js built-in test runner for catalog and game logic.
- `.github/workflows/pages.yml` — GitHub Actions build, test and Pages deploy.

## Limitations

The experiment scores and simulations are exploratory research, **not human playtesting results**. Browser favorites are intentionally local-only. Games 001–003, 005–009 and 011–017 are not implemented as playable React games yet.
