import test from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTIONS,LEVELS,LEVEL_SPECS,WAVE_NAMES,legalMoves,playMove,
  selectableMoves,solvePuzzle,statusOf,stepHex,verifyPath,evaluatePuzzle,generatePuzzle} from '../src/bee-hop/puzzle.js';

function brutePaths(initial){
  if(!initial.pollen.length)return {total:1n,wins:1n};
  const moves=legalMoves(initial);
  if(!moves.length)return {total:1n,wins:0n};
  let total=0n,wins=0n;
  for(const m of moves){const child=brutePaths(playMove(initial,m));total+=child.total;wins+=child.wins;}
  return {total,wins};
}
test('hex steps visit six different neighbors and reverse correctly',()=>{
  assert.equal(DIRECTIONS.length,6);
  const at=2*5+2, neighbors=DIRECTIONS.map(d=>stepHex(at,d,5,5));
  assert.equal(new Set(neighbors).size,6);
  assert.deepEqual(neighbors.sort((a,b)=>a-b),[6,7,11,13,16,17]);
  for(const d of DIRECTIONS)assert.equal(stepHex(stepHex(at,d,5,5),[-d[0],-d[1]],5,5),at);
});
test('landings are directly playable without requesting hints',()=>{
  const state={width:5,height:5,bee:0,pollen:[1,5,6]};
  const moves=legalMoves(state);
  assert.equal(moves.length,6);
  assert.deepEqual(selectableMoves(moves),moves);
  assert.equal(selectableMoves(moves,1).length,3);
  const next=playMove(state,selectableMoves(moves)[0]);
  assert.equal(next.pollen.length,2);
  assert.deepEqual(selectableMoves(moves,null),moves);
});
test('meaningful branching excludes immediate dead ends (6 landings -> 2 continue)',()=>{
  const s={width:5,height:5,bee:0,pollen:[1,5,6]};
  const metrics=evaluatePuzzle(s);
  assert.equal(metrics.exact,true);
  assert.equal(metrics.legalFirst,6);
  assert.equal(metrics.continuingFirst,2);
  assert.equal(metrics.winningFirst,2);
  assert.equal(metrics.totalPaths,'8');
  assert.equal(metrics.realPaths,'2');
  assert.equal(metrics.winningPaths,'2');
});
test('exact winning and total path counts match independent brute force',()=>{
  const fixtures=[
    {width:5,height:1,bee:0,pollen:[2]},
    {width:5,height:5,bee:0,pollen:[1,5,6]},
    {width:4,height:4,bee:1,pollen:[4,6,7]},
    {width:3,height:3,bee:0,pollen:[8]}
  ];
  for(const s of fixtures){
    const brute=brutePaths(s),stats=evaluatePuzzle(s);
    assert.ok(stats.exact);
    assert.equal(stats.totalPaths,brute.total.toString());
    assert.equal(stats.winningPaths,brute.wins.toString());
  }
});
test('all 40 published levels have a valid full solution and exact metrics',()=>{
  assert.equal(LEVELS.length,40);
  assert.equal(LEVEL_SPECS.length,40);
  assert.equal(WAVE_NAMES.length,8);
  for(let i=0;i<40;i++){
    const level=LEVELS[i],spec=LEVEL_SPECS[i];
    assert.equal(level.id,i+1);
    for(const key of ['width','height','pollen']){
      if(key==='pollen')assert.equal(level.pollen.length,spec.pollen);
      else assert.equal(level[key],spec[key]);
    }
    assert.equal(level.boss,spec.boss);
    assert.equal(level.wave,Math.floor(i/5));
    assert.equal(new Set(level.pollen).size,level.pollen.length);
    assert.ok(!level.pollen.includes(level.bee));
    assert.ok(level.pollen.every(p=>p>=0&&p<level.width*level.height));
    assert.ok(legalMoves(level).length>0);
    const solved=solvePuzzle(level,{maxStates:150000});
    assert.ok(solved.solvable&&!solved.truncated,`Level ${level.id} not solvable`);
    assert.equal(solved.moves.length,level.pollen.length);
    assert.ok(verifyPath(level,solved.moves));
    const exact=evaluatePuzzle(level,{maxStates:200000});
    assert.ok(exact.exact,`Level ${level.id} exceeded exact state budget`);
    assert.deepEqual(exact,level.metrics,`Level ${level.id} metrics drifted`);
    if(i>0&&i%5!==0)assert.ok(level.metrics.difficulty>LEVELS[i-1].metrics.difficulty,
      `Difficulty did not rise between ${i} and ${i+1}`);
    if(i>0&&i%5===0)assert.ok(level.metrics.difficulty<LEVELS[i-1].metrics.difficulty,
      `Level ${i+1} should be a breather after the preceding wave boss`);
  }
});
test('board grows only at wave boundaries after the five-level onboarding',()=>{
  assert.deepEqual([LEVELS[0].width,LEVELS[0].height],[3,3]);
  assert.ok(LEVELS.slice(1,5).every(l=>l.width===4&&l.height===4));
  const sizes=[[5,5],[6,5],[7,6],[8,7],[9,7],[10,8],[11,9]];
  for(let wave=1;wave<8;wave++){
    const slice=LEVELS.slice(wave*5,wave*5+5);
    assert.ok(slice.every(l=>l.width===sizes[wave-1][0]&&l.height===sizes[wave-1][1]));
    assert.ok(slice.slice(0,4).every(l=>!l.boss));
    assert.equal(slice[4].boss,true);
    assert.ok(slice[4].metrics.difficulty>slice[3].metrics.difficulty);
  }
});
test('generator deterministically constructs and verifies an unscripted puzzle',()=>{
  const spec=LEVEL_SPECS[2];
  const a=generatePuzzle(spec,{candidates:40});
  const b=generatePuzzle(spec,{candidates:40});
  assert.deepEqual(a,b);
  assert.ok(verifyPath(a,a.witness));
  assert.ok(verifyPath(a,a.solution));
  assert.ok(a.metrics.exact);
});
