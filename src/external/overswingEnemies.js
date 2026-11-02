// Each level is a three-gate fight against one named opponent.
// Art is deliberately shared until unique enemy portraits are ready.
const placeholder='enemies/hell-enforcer.webp';
export const OVERSWING_ENEMIES=Object.freeze([
  ['THE ASH BUTCHER','No one leaves the furnace whole.'],
  ['CINDER WRAITH','Your fear is fuel.'],
  ['THE IRON GOAT','Its horns remember every defeat.'],
  ['THE FLAMEBOUND','Even death cannot cool its blood.'],
  ['THE TOLLKEEPER','Every escape has its price.'],
  ['BONE HOARDER','It collects what others lose.'],
  ['CHAIN WARDEN','The gates obey its chains.'],
  ['THE SCARLET DEALER','One more wager. One more soul.'],
  ['THE COLLECTOR','Nothing you bank is forgotten.'],
  ['FIRE JAILER','The walls have begun to breathe.'],
  ['LAST EXECUTIONER','The blade waits for everyone.'],
  ['CROWN OF ASHES','Only one flame survives.']
].map(([name,line],i)=>Object.freeze({level:i+1,name,line,art:placeholder})));
export const opponentForLevel=level=>OVERSWING_ENEMIES[level-1]||OVERSWING_ENEMIES[0];
