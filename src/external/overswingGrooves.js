// Original dark synthwave beat, inspired by the *energy* of classic
// top-down arcade action soundtracks. No sampled or copied composition.
// Four arrangements share the same kick/snare pulse and 16-step grid.
// The riff never restarts; beat changes are infrequent and bar-aligned.
export const STEPS_PER_BAR=16;
export const GROOVE_NAMES=Object.freeze(['DREAD','PULSE','PURSUIT','PANIC']);
/* Actual quarter-note tempos. Low tension is an ominous 60 BPM, not merely
   half-time drums played over a fast 132 BPM riff. */
export const GROOVE_TEMPOS=Object.freeze([60,82,108,132]);
export function tempoForGroove(level){
  if(!Number.isInteger(level)||level<0||level>=GROOVE_TEMPOS.length)
    throw new RangeError('Invalid groove tempo');
  return GROOVE_TEMPOS[level];
}
export function approachTempo(current,target,maxDelta=2){
  if(!Number.isFinite(current)||!Number.isFinite(target)||
     !Number.isFinite(maxDelta)||maxDelta<=0)throw new RangeError('Invalid tempo ramp');
  return current+Math.max(-maxDelta,Math.min(maxDelta,target-current));
}

// A four-beat original minor-key bass sequence that stays consistent while
// the kick, hi-hats and syncopations change with intensity.
export function synthwaveBassPitch(root,step){
  if(!Number.isFinite(root)||root<=0||
     !Number.isInteger(step)||step<0)throw new RangeError('Invalid synth bass note');
  const degrees=[1,1,1.498,1.189]; // root, root, fifth, minor third
  return root*degrees[Math.floor(step%16/4)];
}

const freezePattern=arr=>Object.freeze([...arr]);
const pattern=(name,drums)=>Object.freeze({
  name,
  kick:freezePattern(drums.kick),
  snare:freezePattern(drums.snare),
  hat:freezePattern(drums.hat),
  ghost:freezePattern(drums.ghost||[]),
  openHat:freezePattern(drums.openHat||[]),
  bass:freezePattern(drums.bass),
  chug:freezePattern(drums.chug||[]),
  chord:freezePattern(drums.chord||[]),
  echo:freezePattern(drums.echo||[]),
});
// Synthwave foundation: kick on every quarter-note, snare on 2 and 4,
// shuffled offbeat hi-hats, bass pulses and later syncopated arpeggiation.
export const MUSIC_GROOVES=Object.freeze([
  pattern('DREAD', {
    kick:[0,4,8,12],snare:[4,12],hat:[2,6,10,14],
    bass:[0,4,8,12],chord:[0,8]
  }),
  pattern('PULSE', {
    kick:[0,4,8,12,14],snare:[4,12],hat:[0,2,4,6,8,10,12,14],
    ghost:[15],openHat:[14],
    bass:[0,3,4,8,11,12],chug:[6,14],chord:[0,8],echo:[7,15]
  }),
  pattern('PURSUIT', {
    kick:[0,3,4,6,8,11,12,14],snare:[4,12],
    hat:[0,2,4,6,8,10,12,14],ghost:[7,15],openHat:[6,14],
    bass:[0,2,4,6,8,10,12,14],chug:[3,7,11,15],
    chord:[0,8],echo:[3,7,11,15]
  }),
  pattern('PANIC', {
    kick:[0,2,3,4,6,8,10,11,12,14],snare:[4,12],
    hat:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    ghost:[7,11,15],openHat:[6,14],
    bass:[0,2,3,4,6,8,10,11,12,14],chug:[1,5,7,9,13,15],
    chord:[0,8],echo:[3,7,11,15]
  })
]);
// Hysteresis prevents a pendulum hovering near a threshold from toggling the
// beat back and forth. Values are lower to leave a state than to enter it.
export const GROOVE_UP=Object.freeze([.24,.46,.69]);
export const GROOVE_DOWN=Object.freeze([.16,.36,.58]);

const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function grooveForTension(tension){
  const t=clamp(tension);
  return GROOVE_UP.reduce((tier,threshold)=>tier+(t>=threshold?1:0),0);
}
export function nextGroove(current,tension){
  if(!Number.isInteger(current)||current<0||current>=MUSIC_GROOVES.length)
    throw new RangeError('Invalid groove level');
  const t=clamp(tension);
  if(current<3&&t>=GROOVE_UP[current])return current+1;
  if(current>0&&t<GROOVE_DOWN[current-1])return current-1;
  return current;
}
export function grooveEvents(level,step,bar=0){
  if(!Number.isInteger(step)||step<0||!Number.isInteger(bar)||bar<0)
    throw new RangeError('Invalid music position');
  const groove=MUSIC_GROOVES[level];
  if(!groove)throw new RangeError('Invalid groove');
  const pos=step%STEPS_PER_BAR;
  const isFinalBar=bar%4===3;
  // A small drum fill, anchored to the end of the original four-bar phrase.
  const fill=isFinalBar&&pos>=12&&level>=2&&(pos%2===1);
  return {
    kick:groove.kick.includes(pos),
    snare:groove.snare.includes(pos)||fill,
    hat:groove.hat.includes(pos),
    ghost:groove.ghost.includes(pos)&&!fill,
    openHat:groove.openHat.includes(pos),
    bass:groove.bass.includes(pos),
    chug:groove.chug.includes(pos),
    chord:groove.chord.includes(pos),
    echo:groove.echo.includes(pos),
    fill,
  };
}
