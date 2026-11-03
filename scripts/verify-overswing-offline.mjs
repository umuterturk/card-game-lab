// Browser-level offline smoke test against the actual production build.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';
const chrome=[process.env.CHROME_BIN,process.env.PUPPETEER_EXECUTABLE_PATH,
 '/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium',
 '/usr/bin/chromium-browser'].find(path=>path&&existsSync(path));
assert.ok(chrome,'Chrome/Chromium needed for offline smoke test');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview',
 '--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let attempt=0;attempt<50;attempt++){
    try{const result=await fetch('http://127.0.0.1:4176/overswing.html');if(result.ok){ready=true;break;}}
    catch{}
    await delay(200);
  }
  assert.ok(ready,'Preview server failed to start');
  browser=await puppeteer.launch({executablePath:chrome,headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4176/overswing.html',{waitUntil:'networkidle0'});
  await page.waitForSelector('.overswing-fullscreen .oj-shell',{timeout:20000});
  await page.evaluate(()=>localStorage.setItem('overswing.release-test','saved'));
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:20000})
    .catch(async()=>{await page.reload({waitUntil:'networkidle0'});});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:20000});
  const cacheFiles=await page.evaluate(async()=>{
    const cachesFound=await caches.keys();
    const ours=cachesFound.find(key=>key.startsWith('overswing-offline-'));
    return ours?(await (await caches.open(ours)).keys()).length:0;
  });
  assert.ok(cacheFiles>=8,'Precache was not installed');
  const session=await page.target().createCDPSession();
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions',{
    offline:true,latency:0,downloadThroughput:0,uploadThroughput:0
  });
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForSelector('.overswing-fullscreen .oj-shell',{timeout:20000});
  assert.equal(await page.evaluate(()=>localStorage.getItem('overswing.release-test')),'saved');
  assert.deepEqual(errors,[],'Browser errors during online/offline reload');
  console.log('Offline browser smoke passed: game renders, service worker caches, saved data persists.');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
