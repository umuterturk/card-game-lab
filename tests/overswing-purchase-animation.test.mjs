import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {purchaseFlightPoints} from '../src/external/overswingPurchaseGeometry.js';
import {bankBurstPoints} from '../src/external/overswingFlipFlight.js';

const read=name=>readFileSync(new URL('../src/external/'+name,import.meta.url),'utf8');
const rect=(left,top,width,height)=>({left,top,width,height});

test('purchases use exactly the BANK particle flight in reverse direction',()=>{
  const walletBounds=rect(20,30,100,25),itemBounds=rect(180,280,70,50);
  const wallet={getBoundingClientRect:()=>walletBounds};
  const target={getBoundingClientRect:()=>itemBounds,
    closest:()=>({querySelector:()=>wallet})};
  const flight=purchaseFlightPoints(target,{querySelector:()=>null});
  assert.deepEqual(flight.style,bankBurstPoints(walletBounds,itemBounds));
  assert.equal(flight.style['--bank-start-x'],'59px');
  assert.equal(flight.style['--bank-end-x'],'204px');
  const component=read('OverswingPurchaseFlight.jsx');
  assert.match(component,/os8-bank-flying-coin/);
  assert.match(component,/os8-bank-burst-label/);
  assert.match(component,/bankCoinCount/);
});
test('all paid actions identify their Treasury and purchase destination',()=>{
  const journey=read('OverswingJourney.jsx');
  assert.match(journey,/purchaseFlightPoints\(target,document\)/);
  assert.match(journey,/launchPurchase\(target,price,'RELIC SECURED'/);
  assert.match(journey,/launchPurchase\(target,journeyRetryPrice\(run\),'GATE REPLAY'/);
  assert.match(journey,/launchPurchase\(target,price,'ROYAL ACQUIRED'/);
  assert.match(journey,/launchPurchase\(target,price,'WILD \+1'/);
  assert.match(journey,/launchPurchase\(target,offer.price,'DECK REVEALED'/);
  for(const name of ['OverswingMarket.jsx','OverswingGateBriefing.jsx','RevealedCards.jsx']){
    assert.match(read(name),/data-oj-treasury/);
  }
  assert.match(read('overswingJourney.css'),/oj-market-emblem/);
});
