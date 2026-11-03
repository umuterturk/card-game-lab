// The earlier black-screen regression passed unit tests: a position:fixed
// cinematic intro was trapped inside FullscreenFit's transform/zero-height
// surface. Exercise the actual screen in headless Chrome before publication.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const chrome=[
  process.env.CHROME_BIN,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].find(path=>path&&existsSync(path));
assert.ok(chrome,'Headless Chromium/Chrome must be installed for the browser regression test');

const url='http://127.0.0.1:4174/?view=full#/play/overswing';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
  '--host','127.0.0.1','--port','4174','--strictPort'],{stdio:['ignore','pipe','pipe']});
let serverLogs='';
server.stdout.on('data',data=>{serverLogs+=data.toString();});
server.stderr.on('data',data=>{serverLogs+=data.toString();});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    if(server.exitCode!==null)throw new Error('Vite preview exited: '+serverLogs);
    try{const response=await fetch(url);if(response.ok){ready=true;break;}}catch{}
    await delay(100);
  }
  assert.ok(ready,'Vite preview did not start: '+serverLogs);
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle0',timeout:30000});
  await page.waitForSelector('.ocm-actions .oj-primary',{timeout:15000});
  await page.click('.ocm-actions .oj-primary');
  await page.waitForSelector('body > .oe-intro .oe-intro-continue',{timeout:8000});
  await delay(2500); // Wait for the portrait entrance; ensure unchanged afterward.
  const before=await page.evaluate(()=>{
    const root=document.querySelector('body > .oe-intro');
    const image=document.querySelector('.oe-intro-image-shell');
    const rect=image?.getBoundingClientRect();
    return {portal:!!root,position:root&&getComputedStyle(root).position,
      image:{x:rect?.x,y:rect?.y,width:rect?.width,height:rect?.height}};
  });
  assert.ok(before.portal,'Cinematic must be portaled directly under body');
  const horror=await page.evaluate(()=>({
    echo:!!document.querySelector('.oe-intro-echo'),
    film:!!document.querySelector('.oe-intro-film'),
    ghostAnimation:getComputedStyle(document.querySelector('.oe-intro-echo')).animationName,
    signalAnimation:getComputedStyle(document.querySelector('.oe-intro-signal-flash')).animationName
  }));
  assert.ok(horror.echo&&horror.film,'Cursed videotape layers must exist');
  assert.equal(horror.ghostAnimation,'oe-ring-ghost');
  assert.equal(horror.signalAnimation,'oe-ring-signal');
  assert.equal(before.position,'fixed');
  assert.ok(before.image.width>=300&&before.image.height>=300,
    'Cinematic image must have a real, full-size bounding rectangle');
  await page.click('.oe-intro-continue');
  await delay(1500);
  const after=await page.evaluate(()=>{
    const image=document.querySelector('.oe-intro-image-shell')?.getBoundingClientRect();
    const preparation=document.querySelector('.oe-intro-preparation');
    const button=document.querySelector('.oe-intro-continue');
    return {image:{x:image?.x,y:image?.y,width:image?.width,height:image?.height},
      opacity:Number(getComputedStyle(preparation).opacity),
      buttonOpacity:Number(getComputedStyle(button).opacity),
      relics:document.querySelectorAll('.oe-intro-preparation .og-relic').length,
      oldPortraits:document.querySelectorAll('.og-portrait').length};
  });
  assert.ok(Math.abs(after.image.x-before.image.x)<2&&
    Math.abs(after.image.y-before.image.y)<2,
    'PREPARE must never move the portrait');
  assert.ok(after.opacity>.9,'Rules and relics must be visibly faded in');
  assert.equal(await page.$eval('.oe-intro-prep-flash',
    el=>getComputedStyle(el).animationName),'oe-ring-prepare');
  assert.ok(after.buttonOpacity<.1,'Prepare button must be faded out');
  assert.equal(after.relics,3);
  assert.equal(after.oldPortraits,0,'No small bordered portrait may appear');
  await page.reload({waitUntil:'networkidle0',timeout:30000});
  await page.waitForSelector('body > .oe-intro.oe-intro-prepared',{timeout:10000});
  await delay(1350);
  const restored=await page.evaluate(()=>({
    opacity:Number(getComputedStyle(document.querySelector('.oe-intro-preparation')).opacity),
    relics:document.querySelectorAll('.oe-intro-preparation .og-relic').length,
    oldPortraits:document.querySelectorAll('.og-portrait').length,
    portal:!!document.querySelector('body > .oe-intro')
  }));
  assert.ok(restored.portal&&restored.opacity>.9,'Refresh must restore the cinematic briefing');
  assert.equal(restored.relics,3);
  assert.equal(restored.oldPortraits,0);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const still=await page.$eval('.oe-intro-echo',el=>({
    animation:getComputedStyle(el).animationName,
    opacity:getComputedStyle(el).opacity
  }));
  assert.equal(still.animation,'none','Reduced motion must disable ghost flashes');
  assert.equal(still.opacity,'0');
  await page.click('.oe-intro-preparation .og-fight');
  await page.waitForSelector('.oj-playing',{timeout:8000});
  assert.equal(await page.$('body > .oe-intro'),null,'Starting fight removes cinematic overlay');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('Browser smoke passed: PREPARE, stationary portrait, relic fade, refresh, FIGHT');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
