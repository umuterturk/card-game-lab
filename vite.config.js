import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig(({mode})=>({
  base:'./',
  build:{rollupOptions:{input:mode==='overswing'
    ?resolve('overswing.html')
    :{catalog:resolve('index.html'),overswing:resolve('overswing.html'),casual:resolve('casual.html')}}}
}));
