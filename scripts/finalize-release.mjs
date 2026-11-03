// Assemble deterministic complete offline cache from the exact emitted Vite files.
import {existsSync,readdirSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,relative,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
const out=resolve(process.argv[2]||'dist'),mode=process.argv[3]||'site';
if(!['site','standalone'].includes(mode))throw Error('Mode must be site or standalone');
if(!existsSync(out))throw Error('Build output does not exist: '+out);
const entry=mode==='standalone'?'index.html':'overswing.html';
if(mode==='standalone'){
  renameSync(join(out,'overswing.html'),join(out,'index.html'));
  rmSync(join(out,'reports'),{force:true,recursive:true});
  rmSync(join(out,'manifest.webmanifest'),{force:true});
  rmSync(join(out,'icon.svg'),{force:true});
  const manifestPath=join(out,'overswing.webmanifest');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  manifest.start_url='./index.html';manifest.id='./';
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}
function list(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(item=>
    item.isDirectory()?list(join(dir,item.name)):[join(dir,item.name)]);
}
const files=list(out).filter(path=>!path.endsWith('.map')&&
  !path.endsWith('sw.js')&&
  !relative(out,path).split(sep).includes('reports'))
  .map(path=>({path:relative(out,path).split(sep).join('/'),contents:readFileSync(path)}))
  .sort((a,b)=>a.path.localeCompare(b.path));
if(!files.some(f=>f.path===entry))throw Error('Missing offline entry '+entry);
if(!files.some(f=>f.path==='overswing.webmanifest'))throw Error('Missing PWA manifest');
const digest=createHash('sha256');
for(const file of files){digest.update(file.path);digest.update(file.contents);}
const version=digest.digest('hex').slice(0,16);
const paths=files.map(f=>'./'+f.path);
const sw=`// Generated from the release build, not hand-maintained.
const CACHE_NAME=${JSON.stringify('overswing-offline-'+version)};
const OFFLINE_ENTRY=${JSON.stringify('./'+entry)};
const PRECACHE=${JSON.stringify(paths)};
const SCOPE=self.registration.scope;
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE.map(path=>new Request(new URL(path,SCOPE),{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())
      if(key.startsWith('overswing-offline-')&&key!==CACHE_NAME)
        await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(SCOPE).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(request.mode==='navigate'){
      // Prefer the server's latest HTML online; always permit an offline launch.
      try{
        const online=await fetch(request);
        if(online.ok)return online;
      }catch{}
      return await cache.match(request,{ignoreSearch:true})||
        await cache.match(new URL(OFFLINE_ENTRY,SCOPE))||Response.error();
    }
    return await cache.match(request,{ignoreSearch:true})||fetch(request);
  })());
});
`;
writeFileSync(join(out,'sw.js'),sw);
console.log(`Offline release: ${mode}, ${files.length} assets, cache ${version}`);
