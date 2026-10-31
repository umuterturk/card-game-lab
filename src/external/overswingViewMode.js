// Accept both GitHub Pages URL shapes:
//   /card-game-lab/?view=full#/play/overswing
//   /card-game-lab/#/play/overswing?view=full
// Direct /card-game-lab/?view=full also launches Overswing.
export function isOverswingFullView(route,search=''){
  const pathname=route.split('?')[0];
  const hashQuery=route.includes('?')?route.slice(route.indexOf('?')+1):'';
  const requested=new URLSearchParams(search).get('view')==='full'||
    new URLSearchParams(hashQuery).get('view')==='full';
  return requested&&(pathname==='/'||pathname==='/play/overswing');
}
