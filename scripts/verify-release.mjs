import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
const out=resolve(process.argv[2]||'dist'),mode=process.argv[3]||'site';
const entry=mode==='standalone'?'index.html':'overswing.html';
function list(dir){return readdirSync(dir,{withFileTypes:true})
  .flatMap(item=>item.isDirectory()?list(join(dir,item.name)):[join(dir,item.name)]);}
const files=list(out);
const read=file=>readFileSync(join(out,file),'utf8');
for(const file of [entry,'sw.js','overswing.webmanifest','overswing-icon-192.png',
  'overswing-icon-512.png','overswing-icon-180.png'])
  assert.ok(existsSync(join(out,file)),`Missing ${file}`);
const html=read(entry);
assert.match(html,/Overswing — The Last Flame/);
assert.match(html,/overswing.webmanifest/);
const manifest=JSON.parse(read('overswing.webmanifest'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,mode==='standalone'?'./index.html':'./overswing.html');
const sw=read('sw.js');
assert.match(sw,/addEventListener\('install'/);
assert.match(sw,/addEventListener\('fetch'/);
assert.ok(sw.includes('./'+entry),'Offline entry not cached');
assert.ok(sw.includes('./overswing-icon-512.png'),'Icon not cached');
assert.ok(sw.includes('./enemies/infernal-01-06.webp'),'Enemy art not cached');
assert.ok(files.some(p=>p.endsWith('.woff2')),'Fonts must be local');
for(const path of files.filter(path=>path.endsWith('.css'))){
  const css=readFileSync(path,'utf8');
  assert.doesNotMatch(css,/fonts\.googleapis\.com|fonts\.gstatic\.com/,relative(out,path));
}
const bytes=files.reduce((sum,f)=>sum+statSync(f).size,0);
assert.ok(files.length<=1500,`Too many release files: ${files.length}`);
assert.ok(bytes<=250*1024*1024,`Total package over 250 MiB: ${bytes}`);
const cachedPaths=JSON.parse(sw.match(/const PRECACHE=(\[[^;]+\]);/)[1]);
const precachedBytes=cachedPaths.reduce((sum,p)=>sum+statSync(join(out,p.slice(2))).size,0);
assert.ok(precachedBytes<=50*1024*1024,`Offline initial cache exceeds 50 MiB: ${precachedBytes}`);
if(mode==='standalone'){
  assert.equal(existsSync(join(out,'overswing.html')),false);
  assert.equal(existsSync(join(out,'reports')),false);
  assert.equal(existsSync(join(out,'manifest.webmanifest')),false);
}else{
  assert.ok(existsSync(join(out,'index.html')),'Original Card Game Lab must remain');
}
console.log(`${mode}: ${files.length} files, ${(bytes/1048576).toFixed(2)} MiB total, ${(precachedBytes/1048576).toFixed(2)} MiB pre-cache.`);
