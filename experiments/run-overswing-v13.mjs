// Reproduce the 27,000-game matched-seed comparison:
//   node experiments/run-overswing-v13.mjs 3000 710000 > v13-results.csv
// Optional selected strategies, comma-separated:
//   node experiments/run-overswing-v13.mjs 20 710000 fixed_bank_flip,fixed_bank_steer
import {runBenchmark,STRATEGIES} from './overswing-v13-benchmark.mjs';
const count=Number(process.argv[2]??3000),startSeed=Number(process.argv[3]??710000);
const list=process.argv[4]?.split(',')||STRATEGIES;
if(!Number.isInteger(count)||count<1||count>100000||
   !Number.isSafeInteger(startSeed)||startSeed<0||
   list.length===0||list.some(name=>!STRATEGIES.includes(name))){
  process.stderr.write('Usage: node experiments/run-overswing-v13.mjs [count=3000] [seed=710000] [strategy1,strategy2,...]\n');
  process.exit(2);
}
const rows=runBenchmark(count,startSeed,list),keys=Object.keys(rows[0]);
process.stdout.write(keys.join(',')+'\n');
for(const r of rows)process.stdout.write(keys.map(k=>r[k]).join(',')+'\n');
process.stderr.write('Completed '+rows.length+' games over '+count+' seeds and '+list.length+' strategies.\n');
