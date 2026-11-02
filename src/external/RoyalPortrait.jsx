import React from 'react';
import {royalRank,royalSuit} from './overswingRoyals.js';
import './royalPortrait.css';

// Three bespoke 48×60 pixel-art character illustrations, drawn as crisp SVG
// shapes so mobile bundles need no large image downloads or extra dependencies.
// Suit stays the actual card suit; red/black is independent of Royal rank.
export const ROYAL_CHARACTER_NAMES=Object.freeze({
  J:'The Scout',Q:'The Mirror',K:'The Melting Crown'
});
export function RoyalPortrait({rank,id,size='card'}){
  const royal=rank||royalRank(id);
  if(!ROYAL_CHARACTER_NAMES[royal])return null;
  const suitIndex=id==null?0:royalSuit(id);
  const red=suitIndex<2;
  return <span className={'os-royal-portrait os-royal-portrait-'+size+
    ' os-royal-portrait-'+royal.toLowerCase()+
    (red?' os-royal-portrait-red':' os-royal-portrait-black')}
    role="img" aria-label={ROYAL_CHARACTER_NAMES[royal]+' portrait'}>
    <svg viewBox="0 0 48 60" shapeRendering="crispEdges" focusable="false"
      aria-hidden="true">
      <rect x="0" y="0" width="48" height="60" fill="#120e19"/>
      <rect x="3" y="3" width="42" height="54" fill="#301a29"/>
      <rect x="5" y="5" width="38" height="50" fill="#1e1723"/>
      <rect x="7" y="7" width="34" height="2" fill={red?'#b9563e':'#7c858c'}/>
      {royal==='J'&&<>
        {/* Scout: violet hood, split mask, glowing amber eye and cloak. */}
        <path d="M20 4H29V7H35V12H39V25H41V49H35V54H8V49H6V24H9V14H13V8H20Z" fill="#49344f"/>
        <rect x="17" y="7" width="16" height="5" fill="#67506d"/>
        <path d="M14 12H31V16H35V30H32V37H12V30H11V18H14Z" fill="#241a31"/>
        <path d="M17 16H29V20H33V29H29V34H17V30H14V21H17Z" fill="#94735f"/>
        <rect x="17" y="18" width="12" height="4" fill="#d09d75"/>
        <rect x="16" y="23" width="16" height="4" fill="#2a1a2c"/>
        <rect x="18" y="23" width="5" height="3" fill="#ffd17a"/>
        <rect x="28" y="23" width="3" height="3" fill="#fac267"/>
        <rect x="21" y="30" width="8" height="3" fill="#503946"/>
        <path d="M10 34H16V38H30V34H37V40H41V54H6V42H10Z" fill="#382a53"/>
        <path d="M16 36H31V40H34V44H14V40H16Z" fill="#b9805e"/>
        <rect x="19" y="37" width="10" height="4" fill="#d19e71"/>
        <path d="M6 47H18V54H6ZM30 47H41V54H30Z" fill="#6d4d75"/>
        <path d="M12 47H16V54H12ZM33 46H37V54H33Z" fill="#9b6d70"/>
        <rect x="22" y="42" width="4" height="8" fill="#d7bd74"/>
        <rect x="18" y="47" width="12" height="3" fill="#8c6b50"/>
        <rect x="20" y="47" width="8" height="2" fill="#f2c782"/>
      </>}
      {royal==='Q'&&<>
        {/* Mirror Queen: white hair, cobalt-blue cloak, jade mirror and silver tiara. */}
        <path d="M15 9H32V13H37V38H40V54H8V37H11V14H15Z" fill="#9faab4"/>
        <rect x="17" y="7" width="14" height="4" fill="#e4dce2"/>
        <path d="M17 16H30V20H34V34H31V39H16V34H13V22H17Z" fill="#bfa3a0"/>
        <rect x="18" y="19" width="13" height="4" fill="#eed4bb"/>
        <rect x="19" y="25" width="5" height="3" fill="#364758"/>
        <rect x="27" y="25" width="4" height="3" fill="#364758"/>
        <rect x="22" y="33" width="8" height="2" fill="#8d6069"/>
        <path d="M11 16H16V33H12V42H9V25H11ZM33 15H38V26H40V42H35V33H33Z" fill="#d9dfe8"/>
        <rect x="13" y="17" width="3" height="9" fill="#f8e8e3"/>
        <rect x="35" y="18" width="3" height="12" fill="#f8e8e3"/>
        <path d="M12 38H18V40H30V38H36V43H41V54H7V43H12Z" fill="#405576"/>
        <rect x="15" y="43" width="19" height="4" fill="#5f7694"/>
        <path d="M19 4H28V7H35V11H31V9H16V11H12V7H19Z" fill="#ced8e3"/>
        <rect x="22" y="5" width="4" height="5" fill="#6dddd8"/>
        <rect x="18" y="9" width="14" height="2" fill="#f0e6ea"/>
        <path d="M34 42H42V46H40V52H34Z" fill="#bac4c4"/>
        <rect x="35" y="44" width="5" height="7" fill="#6cbbb3"/>
        <rect x="36" y="45" width="3" height="3" fill="#c8f2dc"/>
        <rect x="21" y="48" width="8" height="6" fill="#aebac2"/>
      </>}
      {royal==='K'&&<>
        {/* Melting Crown: molten-gold diadem, iron face and fiery beard. */}
        <path d="M11 13H37V31H40V46H42V54H6V46H8V30H11Z" fill="#47313a"/>
        <rect x="14" y="16" width="21" height="22" fill="#b78666"/>
        <rect x="16" y="19" width="18" height="11" fill="#d3a27c"/>
        <rect x="16" y="23" width="6" height="3" fill="#cf652d"/>
        <rect x="28" y="23" width="6" height="3" fill="#cf652d"/>
        <rect x="18" y="23" width="3" height="2" fill="#fff4ae"/>
        <rect x="29" y="23" width="4" height="2" fill="#fff4ae"/>
        <path d="M12 31H17V35H32V31H38V42H35V48H31V52H17V49H13V43H11Z" fill="#81372c"/>
        <path d="M16 36H20V40H28V36H33V43H30V49H18V46H16Z" fill="#c4532b"/>
        <rect x="21" y="39" width="8" height="4" fill="#e48739"/>
        <rect x="23" y="43" width="5" height="5" fill="#f2b856"/>
        <rect x="15" y="47" width="5" height="7" fill="#54292d"/>
        <rect x="31" y="47" width="6" height="7" fill="#54292d"/>
        <path d="M9 17H14V11H18V5H23V13H27V4H32V12H37V8H41V22H8V19H9Z" fill="#b66a28"/>
        <path d="M12 17H17V12H21V8H23V17H29V8H32V16H37V13H39V20H12Z" fill="#ffce57"/>
        <rect x="15" y="18" width="22" height="4" fill="#f09b32"/>
        <rect x="20" y="17" width="5" height="5" fill="#c62a27"/>
        <rect x="30" y="17" width="4" height="4" fill="#f8e89a"/>
        <path d="M6 40H10V48H16V54H7V48H6ZM38 40H42V49H40V54H34V49H38Z" fill="#773b33"/>
        <rect x="9" y="50" width="6" height="4" fill="#e67a32"/>
        <rect x="35" y="50" width="5" height="4" fill="#ffac38"/>
      </>}
      <rect x="3" y="55" width="42" height="2" fill={red?'#b95340':'#92999d'}/>
      <rect x="2" y="2" width="2" height="56" fill="#c89d61"/>
      <rect x="44" y="2" width="2" height="56" fill="#c89d61"/>
    </svg>
  </span>;
}
