import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('standalone entry stays separated from the catalog and uses local assets',()=>{
  const html=source('../overswing.html');
  const app=source('../src/overswing-main.jsx');
  const manifest=JSON.parse(source('../public/overswing.webmanifest'));
  assert.match(html,/overswing-main.jsx/);
  assert.doesNotMatch(app,/import App from/);
  assert.match(app,/fullView\/>/);
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.orientation,'portrait-primary');
  assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
  for(const file of ['../src/styles.css','../src/external/overswing.css'])
    assert.doesNotMatch(source(file),/fonts.googleapis.com/);
});
test('offline registration and build cache are versioned and origin safe',()=>{
  const service=source('../scripts/finalize-release.mjs');
  const register=source('../src/release/registerOffline.js');
  assert.match(register,/navigator.serviceWorker.register/);
  assert.match(service,/createHash\('sha256'\)/);
  assert.match(service,/await cache.addAll/);
  assert.match(service,/request.mode==='navigate'/);
  assert.match(service,/url.origin!==self.location.origin/);
});
test('release excludes CrazyGames SDK and preserves existing local saves',()=>{
  const pkg=JSON.parse(source('../package.json'));
  assert.ok(pkg.scripts['build:overswing']);
  assert.ok(pkg.scripts['package:crazygames']);
  assert.doesNotMatch(source('../src/external/OverswingJourney.jsx'),/localStorage.clear\(/);
  assert.doesNotMatch(JSON.stringify(pkg),/crazygames-sdk/i);
});
