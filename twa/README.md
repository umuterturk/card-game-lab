# Android Trusted Web Activity (TWA)

The standalone Overswing build is PWA-ready. A TWA APK/AAB also requires a
real HTTPS origin **you own**, an Android application ID, and signing keys.
These cannot be safely generated or published from the GitHub Pages
`/card-game-lab/` project subpath alone.

1. Deploy `npm run build:overswing` output (`dist-overswing/`) to the **root**
   of your own HTTPS domain (for example `https://play.example.com/`).
2. Confirm `/index.html`, `/overswing.webmanifest`, `/sw.js`, and both PNG
   icons are served with the correct content types. Test offline on Chrome.
3. Install Google's Bubblewrap CLI locally and initialize from
   `https://play.example.com/overswing.webmanifest`. Use a real app ID,
   such as `com.yourcompany.overswing` and keep the signing key safe.
4. Build a signed Android App Bundle (AAB) with Bubblewrap.
5. On **your own origin**, publish `/.well-known/assetlinks.json` using
   `assetlinks.template.json`, replacing the package name and fingerprint.
   With Play App Signing, use the Play app-signing certificate fingerprint
   from Play Console, not just the local upload certificate.
6. Verify address-bar-free TWA launch via Android Digital Asset Links and
   offline relaunch after the first completed installation.
7. Upload the AAB, icons, screenshots, privacy policy and required Play
   disclosures in Google Play Console.

Never commit Android keystores, signing secrets, or certificate private keys.
The PWA and CrazyGames web builds do not require Android tooling.
