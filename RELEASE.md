# Overswing release

## Web and offline
- `npm install`
- `npm run build` builds the original Card Game Lab site **and**
  `/overswing.html`, a direct game-only entry on GitHub Pages.
- `npm run build:overswing` builds the standalone PWA to
  `dist-overswing/index.html` (deploy this directory at an HTTPS origin).
- `npm run package:crazygames` creates `overswing-crazygames.zip`
  (HTML5 game only; **no CrazyGames SDK**).
- `npm run verify:release` checks the site build; run
  `node scripts/verify-release.mjs dist-overswing standalone` for the
  standalone release.
- GitHub Actions runs unit tests, a browser cinematic regression,
  offline smoke test, package checks, and publishes the site.
  It also uploads the HTML5 portal ZIP as a workflow artifact.

## Offline design
- All Google Fonts are bundled locally, along with the procedural
  music, portraits and other game assets.
- The generated service worker precaches the **entire game** from the exact
  content-hashed build. It uses cache-first static assets, network-first
  HTML, and versioned atomic cache updates. The service worker is only
  registered by `overswing.html` / standalone `index.html`.
- First visit needs network to install the cache. Thereafter the game
  launches and saves offline as long as the browser has not deleted site
  storage. Browsers may evict data. Saves stay local to the origin/device.
- The in-game save warning appears if saving local progress is blocked.
  TWA and CrazyGames will have distinct origins, hence independent saves.
- Third-party embeds may block service workers. Standalone packaged assets
  still load normally; CrazyGames' own offline distribution is separate.

## Platform checklist
- PWA: HTTPS, install manifest, local PNG icons, offline smoke, portrait
  safe areas, reduced-motion controls, background audio safety.
- Android TWA: see `twa/README.md`; a real domain and Android signing
  credentials are required before Google Play release.
- HTML5 portals: upload the zip and test at mobile portrait and desktop
  907×510. Intro flow and readable buttons should be reviewed on real
  devices; do not assume platform approval.
- CrazyGames SDK v3, ads, platform cloud saves, gameplay events and
  SDK-specific muting are **deliberately not integrated**.
- Store artwork/videos, policy URL, classification, submission approval
  and marketing assets are manual publisher deliverables.

## Save compatibility
The game retains existing `overswing_journey`, sound and
`card-game-lab.external.overswing.v13` keys; do not clear localStorage on
release updates. Offline cache and game saves are separate mechanisms.
