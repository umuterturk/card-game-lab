// End-to-end regression for the *published* minimal casual game screen.
// Real browser rendering, deterministic actions and changing numeric values.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const chrome=[
  process.env.CHROME_BIN,process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/usr/bin/chromium','/usr/bin/chromium-browser'
].find(path=>path&&existsSync(path));
assert.ok(chrome,'Chromium required for casual browser smoke');
const url='http://127.0.0.1:4175/casual.html';
const server=spawn(process.execPath,
  ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4175','--strictPort'],
  {stdio:['ignore','pipe','pipe']});
let logs='',browser;
server.stdout.on('data',data=>{logs+=data.toString()});
server.stderr.on('data',data=>{logs+=data.toString()});
const layout=page=>page.evaluate(()=>{
  const rect=selector=>{
    const r=document.querySelector(selector)?.getBoundingClientRect();
    return r?{width:r.width,height:r.height}:null;
  };
  return {meter:rect('.sgv-meter'),track:rect('.sgv-meter-track'),
    hud:rect('.sgv-hud'),chest:rect('.sgv-chest-art')};
});
const stable=(before,after)=>{
  for(const key of Object.keys(before)){
    assert.ok(before[key]&&after[key],key+' should exist');
    assert.ok(Math.abs(before[key].width-after[key].width)<1.5,
      key+' width shifted: '+before[key].width+' to '+after[key].width);
  }
};
const awaitIdle=page=>page.waitForFunction(()=>
  document.querySelector('.sgv-phone')?.getAttribute('aria-busy')==='false',
  {timeout:5000});
try{
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw Error('Vite preview exited: '+logs);
    try{if((await fetch(url)).ok){ready=true;break}}catch{}
    await delay(100);
  }
  assert.ok(ready,'Preview failed to launch: '+logs);
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForSelector('.sgv-card');
  const badge=await page.$eval('#swing-visible-build',e=>e.textContent.trim());
  assert.match(badge,/Swing v0\.5\.0\s*·\s*(?:[0-9a-f]{8}|local)/);
  assert.equal(await page.$$('.sgv-action').then(items=>items.length),2);
  assert.equal(await page.$('.sgv-snap-status'),null,'Snap button must not exist');
  assert.equal(await page.$('.sg-objective'),null,'Old permanent target must be gone');
  assert.equal(await page.$('.sgv-meter-track')!==null,true,'Horizontal meter missing');
  const marks=await page.$$eval('.sgv-meter-labels span',list=>list.map(el=>el.textContent));
  assert.deepEqual(marks,['-8','-6','-4','-2','0','+2','+4','+6','+8']);
  const start=await layout(page);
  assert.equal(await page.$$eval('.sgv-gold-piece',els=>els.length),0);
  await page.waitForFunction(()=>!document.querySelector('.sgv-intro-target'),{timeout:6000});

  // Play a card: source lifts, clone enlarges at the center, then shrinks
  // into the chest. Engine applies once after the entire animation.
  await page.click('.sgv-hand .sgv-card');
  await page.waitForSelector('.sgv-flying-card',{timeout:1800});
  assert.equal(await page.$eval('.sgv-phone',e=>e.getAttribute('aria-busy')),'true');
  await page.waitForFunction(()=>document.querySelector('.sgv-meter')?.dataset.value==='3',
    {timeout:5000});
  await awaitIdle(page);
  assert.equal(await page.$('.sgv-flying-card'),null,'Flight clone must be removed');
  stable(start,await layout(page));

  // Reset through a reload for the intentionally deterministic first round.
  await page.reload({waitUntil:'networkidle0'});
  const reset=await layout(page);
  await page.click('.sgv-flip');
  await page.waitForSelector('.sgv-flying-card',{timeout:1800});
  await awaitIdle(page);
  await page.click('.sgv-flip');
  await page.waitForSelector('.sgv-flying-card',{timeout:1800});
  await awaitIdle(page);
  assert.equal(await page.$eval('.sgv-bank',b=>b.disabled),false);
  stable(reset,await layout(page));
  await page.click('.sgv-bank');
  await page.waitForSelector('.sgv-flying-gold',{timeout:2000});
  await page.waitForSelector('.sgv-end-overlay',{timeout:6500});
  assert.match(await page.$eval('.sgv-end-card h1',x=>x.textContent),/Level complete/);
  const total=Number(await page.$eval('.sgv-gold-counter strong',x=>x.textContent));
  assert.ok(total>=24,'Banked total must reach the level target');
  const visibleCoins=await page.$$eval('.sgv-gold-piece',els=>els.length);
  assert.ok(visibleCoins>=20,'Gold should visibly fill the transparent chest');
  assert.equal(await page.$('.sgv-pot-pill'),null);
  stable(reset,await layout(page));
  await page.click('.sgv-end-card button');
  await page.waitForSelector('.sgv-intro-target',{timeout:2000});
  assert.equal(await page.$$eval('.sgv-gold-piece',els=>els.length),0);
  assert.equal(await page.$$eval('.sgv-heart:not(.sgv-heart-empty)',els=>els.length),2);
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('Casual v0.5 smoke: stable horizontal meter, visible gold, intro, cards, Flip, Bank and replay.');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
