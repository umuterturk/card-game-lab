import React from 'react';
import './overswingAbilityIcon.css';

// Original low-resolution pixel glyphs; no emoji or font-dependent artwork.
export default function AbilityIcon({kind}){
  const paths={
    shuffle:<>
      <path d="M8 6H21V9H26V13H30V18H26V15H22V12H8V16H4V10H8Z"/>
      <path d="M27 3H32V13H27V9H22V6H27Z"/>
      <path d="M6 25H21V21H26V18H30V24H26V28H21V31H6Z"/>
      <path d="M7 27V31H3V23H7Z"/>
    </>,
    polarity:<>
      <rect x="4" y="11" width="13" height="5"/>
      <rect x="8" y="7" width="5" height="14"/>
      <rect x="19" y="23" width="13" height="5"/>
      <rect x="19" y="6" width="13" height="3" opacity=".45"/>
    </>,
    shield:<>
      <path d="M18 2L31 8V20L26 28L18 33L10 28L5 20V8Z" fill="#332132"/>
      <path d="M18 6L27 10V19L24 25L18 29L12 25L9 19V10Z"/>
      <path d="M13 16L17 20L24 12L27 15L17 25L10 19Z" fill="#fff1ae"/>
    </>,
    revealed:<>
      <path d="M4 5H18V28H4Z" fill="#2e1b29"/>
      <path d="M18 5H32V28H18Z" fill="#2e1b29"/>
      <path d="M7 8H16V25H7Z"/>
      <path d="M20 8H29V25H20Z"/>
      <rect x="10" y="12" width="4" height="4" fill="#38222b"/>
      <rect x="22" y="12" width="4" height="4" fill="#38222b"/>
      <rect x="7" y="30" width="22" height="3"/>
    </>
  };
  return <svg className={'os8-ability-pixel-icon os8-icon-'+kind}
    viewBox="0 0 36 36" shapeRendering="crispEdges"
    aria-hidden="true" focusable="false" fill="currentColor">
    {paths[kind]||null}
  </svg>;
}
