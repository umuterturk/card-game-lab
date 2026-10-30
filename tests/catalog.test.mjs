import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=new URL('../',import.meta.url).pathname;const games=JSON.parse(fs.readFileSync(path.join(root,'src/data/games.json'),'utf8'));
test('contains all 18 archived experiments',()=>{assert.equal(games.length,18);assert.equal(new Set(games.map(g=>g.id)).size,18);assert.equal(games[0].name,'Twinlock');assert.equal(games.at(-1).name,'Rootweave')});
test('statuses, scores and reports are valid',()=>{for(const game of games){assert.ok(['pass','revise','reject'].includes(game.status));assert.ok(game.score>=1&&game.score<=10);assert.ok(game.risk&&game.loop&&game.description);assert.ok(fs.existsSync(path.join(root,'public',game.report)))}});
