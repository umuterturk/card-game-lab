// Three original procedural horror/thriller gameplay scores.
// Independent of the 16 existing synthwave scores. No samples or audio downloads.
// The same beat clock and gradual tension engine drive both libraries.
import {MUSIC_TRACKS} from './overswingTracks.js';

const parseBar=text=>{
  const notes=text.split(' ').map(note=>note==='-'?null:note);
  if(notes.length!==16)throw new Error('Thriller score bars require 16 steps');
  return Object.freeze(notes);
};
const pieces=[
  {
    id:'the-knock',name:'The Knock',style:'knock',lead:'sine',
    octave:1.5,leadGain:.95,
    roots:['E','D','C','B'],bass:[1,1.059,1.498,1],
    chord:[1.059,1.414],hats:[7,15],kicks:[0,3,8,11],
    bars:[
      'E - - - F - - E - - B - F - - -',
      'D - - - E - - D - - A - E - - -',
      'C - - - D - - C - - G - F - - -',
      'B - - - C - - B - - F - C - - -'
    ]
  },
  {
    id:'corridor-chase',name:'Corridor Chase',style:'chase',lead:'square',
    octave:1.25,leadGain:.76,
    roots:['A','G','E','B'],bass:[1,1,1.189,1.059],
    chord:[1.059,1.414],hats:[1,3,5,7,9,11,13,15],
    kicks:[0,3,6,8,11,14],
    bars:[
      'A - C - A - G - E - G - B - G -',
      'G - B - G - F - D - F - A - F -',
      'E - G - E - F - B - G - F - E -',
      'B - D - B - C - F - D - C - B -'
    ]
  },
  {
    id:'dead-frequency',name:'Dead Frequency',style:'signal',lead:'triangle',
    octave:1.75,leadGain:.72,
    roots:['C','B','E','D'],bass:[1,1.414,1.059,1.498],
    chord:[1.059,1.414],hats:[2,5,10,13],kicks:[0,7,8,15],
    bars:[
      'C - - B - - F - C - - D - F - -',
      'B - - A - - F - B - - C - F - -',
      'E - - D - - B - E - - F - B - -',
      'D - - C - - A - D - - E - A - -'
    ]
  }
];
export const THRILLER_TRACKS=Object.freeze(pieces.map(track=>Object.freeze({
  ...track,theme:'thriller',
  riff:Object.freeze(track.bars.map(parseBar)),
  roots:Object.freeze(track.roots),bass:Object.freeze(track.bass),
  chord:Object.freeze(track.chord),
  hats:Object.freeze(track.hats),kicks:Object.freeze(track.kicks)
})));
export const THRILLER_START=MUSIC_TRACKS.length;
export const GAMEPLAY_TRACKS=Object.freeze([...MUSIC_TRACKS,...THRILLER_TRACKS]);
// Faster even at low tension, with four distinctly audible tension stages.
export const THRILLER_GROOVE_TEMPOS=Object.freeze([92,112,136,158]);
export function thrillerTempoForGroove(level){
  if(!Number.isInteger(level)||level<0||level>=THRILLER_GROOVE_TEMPOS.length)
    throw new RangeError('Invalid thriller groove');
  return THRILLER_GROOVE_TEMPOS[level];
}
export function thrillerNoteAt(step,globalTrackId){
  const track=THRILLER_TRACKS[globalTrackId-THRILLER_START];
  if(!track||!Number.isInteger(step)||step<0)
    throw new RangeError('Invalid thriller score position');
  return track.riff[Math.floor(step/16)%4][step%16];
}
export function thrillerTrackForClassic(classicTrackId){
  if(!Number.isInteger(classicTrackId)||classicTrackId<0||
     classicTrackId>=THRILLER_START)
    throw new RangeError('Invalid gate music selection');
  // Derive the choice from the established gate seed, never the card RNG.
  return THRILLER_START+classicTrackId%THRILLER_TRACKS.length;
}
