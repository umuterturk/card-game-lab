import test from 'node:test';
import assert from 'node:assert/strict';
import {numbers,storms,shipValue,initStorm,stormStep,stormChance,initShort,shortStep,shortAfterChoice,targets,laneSum} from '../src/logic.js';
import fs from 'node:fs';

function seqRandom(){return 0.53}
const data=JSON.parse(fs.readFileSync(new URL('../src/data/games.json',import.meta.url),'utf8'));
test('17 unique experiments with valid fields',()=>{assert.equal(data.length,17);assert.equal(new Set(data.map(x=>x.id)).size,17);assert.equal(new Set(data.map(x=>x.slug)).size,17);data.forEach(x=>{assert.ok(x.name&&x.description&&x.risk&&x.score>=0&&x.score<=10);assert.ok(['pass','revise','reject'].includes(x.status))})});
test('deck distributions match published rules',()=>{assert.equal(numbers().length,24);assert.deepEqual(numbers().filter(x=>x===6).length,4);assert.equal(storms().length,14);assert.equal(storms().filter(x=>x===7).length,2)});
test('storm initial state conserves cards',()=>{const s=initStorm(seqRandom);assert.equal(s.deck.length,21);assert.equal(s.hand.length,3);assert.equal(s.weather.length,14)});
test('storm bank uses cargo product and multiplier',()=>{let s=initStorm(seqRandom,{hand:[6,5,4],deck:[],ships:[{cargo:[6,5,4],shield:null,storms:2,sealed:true},{cargo:[],shield:null,storms:0,sealed:false}]});assert.equal(shipValue(s.ships[0]),1080);s=stormStep(s,{type:'bank',ship:0});assert.equal(s.score,1080)});
test('storm guard prevents impossible placements',()=>{const s=initStorm(seqRandom);assert.equal(stormStep(s,{type:'shield',ship:0,card:0}),s);assert.equal(stormStep(s,{type:'cargo',ship:0,card:99}),s)});
test('storm success consumes weather and shield',()=>{const s=initStorm(seqRandom,{ships:[{cargo:[6,5],shield:6,storms:0,sealed:false},{cargo:[],shield:null,storms:0,sealed:false}],weather:[7,1]});const t=stormStep(s,{type:'storm',ship:0});assert.equal(t.ships[0].storms,1);assert.equal(t.ships[0].shield,null);assert.equal(shipValue(t.ships[0]),90);assert.equal(t.weather.length,1)});
test('storm fail loses only selected ship',()=>{const s=initStorm(seqRandom,{ships:[{cargo:[6,5],shield:1,storms:0,sealed:false},{cargo:[4],shield:null,storms:0,sealed:false}],weather:[7]});const t=stormStep(s,{type:'storm',ship:0});assert.equal(t.ships[0].cargo.length,0);assert.deepEqual(t.ships[1].cargo,[4]);assert.equal(t.burns,1)});
test('storm chance uses remaining weather',()=>{const s=initStorm(seqRandom,{ships:[{cargo:[2,3],shield:4,storms:1,sealed:true},{cargo:[],shield:null,storms:0,sealed:false}],weather:[1,4,3]});assert.equal(stormChance(s,0),2/3)});
test('shortfuse initial state',()=>{const s=initShort(seqRandom);assert.equal(s.hand.length,3);assert.equal(s.deck.length,21);assert.equal(s.streak,0);assert.deepEqual(targets,[7,9,11])});
test('shortfuse rejects overfill',()=>{const s=initShort(seqRandom,{hand:[6],deck:[],lanes:[[3],[],[]]});assert.equal(shortStep(s,{type:'place',card:0,lane:0}),s)});
test('shortfuse completion requires immediate bank-or-carry',()=>{const s=initShort(seqRandom,{hand:[4,2],deck:[],lanes:[[3],[],[]]});const t=shortStep(s,{type:'place',card:0,lane:0});assert.equal(t.pot,7);assert.equal(t.pendingChoice,true);assert.deepEqual(t.hand,[2]);const b=shortAfterChoice(t,{type:'bank'});assert.equal(b.score,7);assert.equal(b.pot,0)});
test('shortfuse carry requires deadline and failure burns pot',()=>{const s=initShort(seqRandom,{hand:[4,1,2],deck:[],lanes:[[3],[],[]]});const t=shortStep(s,{type:'place',card:0,lane:0});const c=shortAfterChoice(t,{type:'carry'});assert.equal(c.deadline,2);let d=shortStep(c,{type:'place',card:0,lane:1});assert.equal(d.deadline,1);d=shortStep(d,{type:'place',card:0,lane:1});assert.equal(d.pot,0);assert.equal(d.failed,1)});
test('shortfuse third contract automatically banks 7+14+28',()=>{const s=initShort(seqRandom,{hand:[4],deck:[],lanes:[[3],[],[]],pot:21,streak:2,pendingChoice:false});const t=shortStep(s,{type:'place',card:0,lane:0});assert.equal(t.score,49);assert.equal(t.pot,0);assert.equal(t.streak,0)});
function seeded(seed) {let x=seed|0;return ()=>((x=(1664525*x+1013904223)|0)>>>0)/2**32;}
test('100 complete storm voyages terminate without getting stuck',()=>{
 for(let seed=1;seed<=100;seed++) {
   let s=initStorm(seeded(seed));
   for(let steps=0;steps<120;steps++) {
     const before=s.hand.length+s.deck.length;
     if (!before && !s.ships.some(x=>x.cargo.length)) break;
     if (s.ships[0].cargo.length===3 || (!before&&s.ships[0].cargo.length)) s=stormStep(s,{type:'bank',ship:0});
     else if (s.hand.length) s=stormStep(s,{type:'cargo',ship:0,card:0});
     else assert.fail('Unexpected stalled voyage');
   }
   assert.equal(s.hand.length+s.deck.length,0);
   assert.deepEqual(s.ships.map(x=>x.cargo.length),[0,0]);
   assert.ok(s.score>0);
 }
});
test('100 complete shortfuse runs terminate with every card accounted for',()=>{
 for(let seed=1;seed<=100;seed++) {
   let s=initShort(seeded(seed));let consumed=0;
   for(let steps=0;steps<120;steps++){
     if (s.pendingChoice){s=shortAfterChoice(s,{type:'bank'});continue;}
     if (!s.hand.length) break;
     const old=s.hand.length+s.deck.length;
     const options=[];
     for(let i=0;i<s.hand.length;i++)for(let l=0;l<3;l++)if(laneSum(s.lanes[l])+s.hand[i]<=targets[l])options.push({type:'place',card:i,lane:l});
     s=shortStep(s,options[0]||{type:'scrap',card:0,lane:0});
     assert.equal(s.hand.length+s.deck.length,old-1);
     consumed++;
   }
   assert.equal(consumed,24);
   assert.equal(s.hand.length+s.deck.length,0);
   assert.equal(s.pendingChoice,false);
   assert.ok(s.score>=0);
 }
});
