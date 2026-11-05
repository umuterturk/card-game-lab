import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('P0 currency surfaces use a minted coin, never a star as money',()=>{
  const board=read('src/casual/MinimalBoard.jsx');
  const screen=read('src/casual/SimplifiedGame.jsx');
  const motion=read('src/casual/minimalMotion.js');
  assert.match(board,/export function CoinIcon/);
  assert.doesNotMatch(board,/★/, 'board gold, Pot, chest, and target must not use stars');
  assert.doesNotMatch(motion,/★/, 'flying Bank rewards must be coins');
  assert.match(screen,/<CoinIcon className="sgv-gold-icon"\s*\/>/);
  assert.match(screen,/<CoinIcon className="sgv-bank-coin"\s*\/>/);
  assert.match(screen,/<CoinIcon className="sgv-bank-coin"\s*\/>/);
  assert.match(screen,/<span className="sgv-bank-title">BANK<\/span>/);
  assert.match(screen,/overswingPayout\(game,FIRST_LEVEL\.rules\)/);
});

test('P0 feedback does not alter engine scores',()=>{
  const motion=read('src/casual/minimalMotion.js');
  assert.match(motion,/export function animateSnapLoss\(root,lostPot\)/);
  assert.match(motion,/onCount\(Math\.round\(displayed\.value\)\)/);
  assert.match(motion,/reward\.textContent='\+'\+\(toScore-fromScore\)/);
  assert.match(motion,/action\.type==='flip'\?\.22:\.08/);
});
