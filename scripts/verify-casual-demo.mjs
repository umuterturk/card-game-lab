// Regression test for the casual screen: interaction animation and stable
// dimensions on an iPhone-sized viewport. Uses the real production Vite build.
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
assert.ok(chrome,'Chromium is required for the casual browser smoke test');
const url='http://127.0.0.1:4175/casual.html';
const server=spawn(process.execPath,
  ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4175','--strictPort'],
  {stdio:['ignore','pipe','pipe']});
let logs='',browser;
server.stdout.on('data',data=>{logs+=data.toString();});
server.stderr.on('data',data=>{logs+=data.toString();});
const sizes=async page=>page.evaluate(()=>{
  const rect=selector=>{
    const r=document.querySelector(selector)?.getBoundingClientRect();
    return r?{width:r.width,height:r.height}:null;
  };
  return {gauge:rect('.sg-gauge-wrap'),progress:rect('.sg-progress'),
    stats:rect('.sg-tiny-stats'),jar:rect('.sg-score-cluster'),
    goal:rect('.sg-objective')};
});
const sameWidths=(before,after)=>{
  for(const key of Object.keys(before)){
    assert.ok(before[key]&&after[key],key+' must be visible');
    assert.ok(Math.abs(before[key].width-after[key].width)<1.5,
      key+' width shifted: '+before[key].width+' -> '+after[key].width);
  }
};
try{
  let ready=false;
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw new Error('Vite exited: '+logs);
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await delay(125);
  }
  assert.ok(ready,'Preview failed to start: '+logs);
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForSelector('.sg-card');
  const version=await page.$eval('#swing-visible-build',e=>e.textContent.trim());
  assert.match(version,/Swing v0\.4\.0\s*·\s*(?:[a-f0-9]{8}|local)/);
  assert.equal(await page.$eval('#swing-visible-build',e=>getComputedStyle(e).position),'fixed');

  assert.equal(await page.$('.sg-particle-layer')!==null,true);
  assert.equal(await page.$('.sg-gauge-wrap')!==null,true);
  const start=await sizes(page);

  // A hand card lifts off the board and lands before the real engine moves.
  await page.click('.sg-hand .sg-card');
  await page.waitForSelector('.sg-flying-card',{timeout:2000});
  await page.waitForFunction(()=>document.querySelector('.sg-swing-value')?.textContent==='+3',
    {timeout:4000});
  await delay(90);
  sameWidths(start,await sizes(page));
  assert.equal(await page.$('.sg-flying-card'),null,'Flight clone must be removed');

  // Play the deterministic first round to its Bank: both Flip and gold flights
  // are visible and count up instead of jumping abruptly.
  await page.reload({waitUntil:'networkidle0'});
  const reset=await sizes(page);
  await page.click('.sg-flip');
  await page.waitForSelector('.sg-flying-card',{timeout:2000});
  await page.waitForFunction(()=>document.querySelector('.sg-phone')?.getAttribute('aria-busy')==='false',
    {timeout:4000});
  await page.click('.sg-flip');
  await page.waitForSelector('.sg-flying-card',{timeout:2000});
  await page.waitForFunction(()=>document.querySelector('.sg-phone')?.getAttribute('aria-busy')==='false',
    {timeout:4000});
  assert.equal(await page.$eval('.sg-bank',e=>e.disabled),false);
  sameWidths(reset,await sizes(page));
  await page.click('.sg-bank');
  await page.waitForSelector('.sg-flying-gold',{timeout:2000});
  await page.waitForSelector('.sg-end-overlay',{timeout:5000});
  assert.match(await page.$eval('.sg-end-card h1',e=>e.textContent),/Level complete/i);
  assert.ok(Number(await page.$eval('.sg-wallet b',e=>e.textContent))>=24);
  sameWidths(reset,await sizes(page));
  assert.deepEqual(errors,[],'Browser console has uncaught page errors');
  console.log('Casual smoke passed: card flight, Flip flight, Bank gold, goal, stable mobile meter widths.');
}finally{
  await browser?.close();server.kill('SIGTERM');
}
