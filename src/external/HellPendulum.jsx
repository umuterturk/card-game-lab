import React from 'react';

// Decorative 10–12 FPS pixel pendulum in burning coals. The pendulum is
// presentation-only; the real game meter is unchanged.
const FLAME_SPRITE=[
  '.....r.....',
  '....ror....',
  '...rooor...',
  '..rooyoor..',
  '..rooyoor..',
  '.rooyyyoor.',
  '.rooywyyoor',
  '.rooywyyoor',
  'rrooowooorr',
  '.rroooooorr',
  '..rrddddrr.'
];
const FLAME_COLORS={r:'#c6341b',o:'#ff6c22',y:'#ffbb38',w:'#ffe9a0',d:'#3a1a16'};
export default function HellPendulum(){
  return <svg className="oj-hell-pendulum" viewBox="0 0 260 122"
      role="img" aria-label="A flaming pixel-art pendulum swinging over embers"
      shapeRendering="crispEdges" focusable="false">
    <g className="oj-hell-pendulum-bg" aria-hidden="true">
      <rect x="20" y="111" width="220" height="5" fill="#3b1c18"/>
      <rect x="36" y="116" width="190" height="4" fill="#6d2c1a"/>
      <rect x="50" y="109" width="18" height="3" fill="#b8401b"/>
      <rect x="178" y="109" width="18" height="3" fill="#c14b1e"/>
      <rect x="93" y="114" width="54" height="4" fill="#ff6e29"/>
      <rect x="111" y="116" width="32" height="4" fill="#ffb44a"/>
    </g>
    <g className="oj-hell-pendulum-arm" aria-hidden="true">
      <rect x="117" y="15" width="6" height="76" fill="#311b23"/>
      <rect x="119" y="15" width="3" height="76" fill="#f0a65f"/>
      <rect x="116" y="76" width="8" height="11" fill="#ffb850"/>
      <g className="oj-hell-pendulum-flame">
        {FLAME_SPRITE.flatMap((row,y)=>[...row].map((code,x)=>
          code==='.'?null:<rect key={y+'-'+x} x={108+x*4} y={69+y*4}
            width="4" height="4" fill={FLAME_COLORS[code]}/>
        ))}
      </g>
      <rect x="121" y="87" width="8" height="8" fill="#2a1520"/>
      <rect x="123" y="88" width="4" height="4" fill="#fff4c8"/>
    </g>
    <rect x="109" y="8" width="22" height="15" fill="#24141b"/>
    <rect x="113" y="11" width="14" height="9" fill="#c4612c"/>
    <rect x="117" y="13" width="6" height="5" fill="#ffd089"/>
    <g className="oj-hell-pendulum-sparks" aria-hidden="true">
      <rect x="49" y="81" width="3" height="3" fill="#f38a31"/>
      <rect x="72" y="55" width="3" height="3" fill="#f3a548"/>
      <rect x="190" y="73" width="4" height="4" fill="#fd8c35"/>
      <rect x="211" y="47" width="3" height="3" fill="#db4a2a"/>
    </g>
  </svg>;
}
