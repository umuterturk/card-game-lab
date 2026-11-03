// Self-contained PNG generator: release icons are built without remote services.
import {mkdirSync,writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {join} from 'node:path';

const crcTable=Array.from({length:256},(_,index)=>{
  let c=index;
  for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;
  return c>>>0;
});
function crc32(buffer){
  let crc=0xffffffff;
  for(const byte of buffer)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
  const name=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);
  length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([length,name,data,crc]);
}
function rounded(x,y,left,top,width,height,radius){
  const dx=Math.max(left+radius-x,0,x-(left+width-radius));
  const dy=Math.max(top+radius-y,0,y-(top+height-radius));
  return dx*dx+dy*dy<=radius*radius && x>=left && x<left+width && y>=top && y<top+height;
}
function pixel(x,y){
  let c=[16,11,19];
  const dist=Math.hypot(x-0.5,y-0.52);
  c=[22+Math.max(0,Math.floor(15-40*dist)),12+Math.max(0,Math.floor(5-22*dist)),25];
  // A stack of two cards, the signature pendulum diamond and a small flame.
  if(rounded(x,y,.16,.22,.55,.62,.06))c=[91,45,44];
  if(rounded(x,y,.18,.20,.55,.62,.06))c=[191,113,63];
  if(rounded(x,y,.20,.22,.51,.58,.045))c=[42,27,38];
  if(rounded(x,y,.30,.13,.55,.64,.06))c=[255,191,103];
  if(rounded(x,y,.33,.16,.49,.58,.04))c=[49,29,40];
  if(rounded(x,y,.35,.18,.45,.54,.025))c=[32,23,39];
  const d=Math.abs(x-.57)/.115+Math.abs(y-.44)/.18;
  if(d<1)c=d>.74?[255,202,107]:[238,131,56];
  if(Math.abs(x-.57)<.014&&y>.58&&y<.72)c=[244,174,83];
  if(Math.hypot(x-.57,y-.73)<.04)c=[255,210,118];
  return c;
}
function createPng(size){
  const rowSize=1+size*4,raw=Buffer.alloc(rowSize*size);
  for(let y=0;y<size;y++){
    const offset=y*rowSize;raw[offset]=0;
    for(let x=0;x<size;x++){
      const c=pixel((x+.5)/size,(y+.5)/size),at=offset+1+x*4;
      raw[at]=c[0];raw[at+1]=c[1];raw[at+2]=c[2];raw[at+3]=255;
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);
  ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('public',{recursive:true});
for(const size of [180,192,512])writeFileSync(join('public',`overswing-icon-${size}.png`),createPng(size));
console.log('Generated local Overswing PWA icons (180, 192, 512).');
