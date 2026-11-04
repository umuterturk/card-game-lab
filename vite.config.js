import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// GitHub Actions sets GITHUB_SHA to the commit that publishes this release.
const casualCommit=(process.env.GITHUB_SHA||process.env.VITE_CASUAL_COMMIT||'local').slice(0,8);
const casualBuild='v0.4.0-'+casualCommit;
export default defineConfig(({mode})=>({
  base:'./',
  define:{__SWING_BUILD_ID__:JSON.stringify(casualBuild)},
  plugins:[{name:'embed-casual-version-in-html',
    transformIndexHtml(html){return html.replaceAll('__CASUAL_COMMIT__',casualCommit);}}],
  build:{rollupOptions:{input:mode==='overswing'
    ?resolve('overswing.html')
    :{catalog:resolve('index.html'),overswing:resolve('overswing.html'),casual:resolve('casual.html')}}}
}));
