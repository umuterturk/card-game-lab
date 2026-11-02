// Sixteen original, game-owned procedural synthwave scores.
// All themes share the same 16-step/4-bar grid so they can crossfade on-beat.
// No sampled audio or borrowed melodic passages.
const parseBar=text=>{
  const notes=text.split(' ').map(note=>note==='-'?null:note);
  if(notes.length!==16)throw new Error('Every score bar must have 16 steps');
  return Object.freeze(notes);
};
const raw=[
  {
    "id": "iron-pulse",
    "name": "Iron Pulse",
    "lead": "sawtooth",
    "octave": 1,
    "leadGain": 1,
    "bass": [
      1,
      1,
      1.498,
      1.189
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "E",
      "C",
      "B"
    ],
    "hats": [
      2,
      10
    ],
    "kicks": [],
    "bars": [
      "E - E G E - F E B - G F E - D B",
      "E - E A G E F - D E G F E B - E",
      "C - C G E - D E C - B G A - G E",
      "B - B D E G F E B - A G F D E -"
    ]
  },
  {
    "id": "night-drive",
    "name": "Night Drive",
    "lead": "triangle",
    "octave": 2,
    "leadGain": 0.77,
    "bass": [
      1,
      1.189,
      1.498,
      1
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "C",
      "G",
      "D"
    ],
    "hats": [
      6,
      14
    ],
    "kicks": [
      14
    ],
    "bars": [
      "E - G - B - G E - D E - G - B -",
      "C - E G - B G E - C - D E - C -",
      "G - B D - B G - E - G - A B - D",
      "D - F A - F D - B - A - G F - D"
    ]
  },
  {
    "id": "blackout",
    "name": "Blackout",
    "lead": "square",
    "octave": 1.5,
    "leadGain": 0.67,
    "bass": [
      1,
      1,
      1.059,
      1.498
    ],
    "chord": [
      1.059,
      1.498
    ],
    "roots": [
      "E",
      "D",
      "C",
      "B"
    ],
    "hats": [
      3,
      11
    ],
    "kicks": [
      3,
      11
    ],
    "bars": [
      "E E - E - F E - B - E G - F E -",
      "D - D F - D - E G - F - D - C -",
      "C C - E - D C - G - E D - C B -",
      "B - B D B - F E - D - B - A B -"
    ]
  },
  {
    "id": "violet-static",
    "name": "Violet Static",
    "lead": "sine",
    "octave": 2,
    "leadGain": 0.78,
    "bass": [
      1,
      1.498,
      1.189,
      1.498
    ],
    "chord": [
      1.189,
      1.781
    ],
    "roots": [
      "E",
      "G",
      "C",
      "D"
    ],
    "hats": [
      1,
      5,
      9,
      13
    ],
    "kicks": [
      6,
      14
    ],
    "bars": [
      "E - - G B - - G - E - D - - E -",
      "G - - B D - - B - G - E - - G -",
      "C - - E G - - E - C - B - - C -",
      "D - - F A - - F - D - C - - D -"
    ]
  },
  {
    "id": "ash-runner",
    "name": "Ash Runner",
    "lead": "sawtooth",
    "octave": 1.5,
    "leadGain": 0.8,
    "bass": [
      1,
      1.498,
      1.189,
      1
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "E",
      "G",
      "B"
    ],
    "hats": [
      7,
      15
    ],
    "kicks": [
      2,
      10
    ],
    "bars": [
      "E - G E - B - E G - F E - D E -",
      "E - A E - G - F E - D E - B E -",
      "G - B G - D - G B - A G - F G -",
      "B - D B - F - E D - B A - G B -"
    ]
  },
  {
    "id": "last-neon",
    "name": "Last Neon",
    "lead": "triangle",
    "octave": 1.5,
    "leadGain": 0.9,
    "bass": [
      1,
      1.189,
      1,
      1.498
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "C",
      "D",
      "B"
    ],
    "hats": [
      3,
      7,
      11,
      15
    ],
    "kicks": [
      7
    ],
    "bars": [
      "E - - B G - E - D - F E - - G -",
      "C - - G E - C - B - D C - - E -",
      "D - - A F - D - C - E D - - F -",
      "B - - F D - B - A - D B - - E -"
    ]
  },

  {
    "id": "ember-highway",
    "name": "Ember Highway",
    "lead": "sawtooth",
    "octave": 1.5,
    "leadGain": 0.8,
    "bass": [
      1,
      1,
      1.498,
      1.334
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "C",
      "D",
      "B"
    ],
    "hats": [
      1,
      9
    ],
    "kicks": [
      7,
      15
    ],
    "bars": [
      "E - G B - G E - E - D F - E G -",
      "C - E G - B G - E - C D - E C -",
      "D - F A - F D - D - C E - D F -",
      "B - D F - A F - D - B D - E B -"
    ]
  },
  {
    "id": "chrome-graves",
    "name": "Chrome Graves",
    "lead": "square",
    "octave": 1,
    "leadGain": 0.76,
    "bass": [
      1,
      1.059,
      1,
      1.498
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "B",
      "B",
      "C",
      "E"
    ],
    "hats": [
      3,
      11,
      15
    ],
    "kicks": [
      3,
      10
    ],
    "bars": [
      "B B - D B - F - B - A B - G F -",
      "B - D B - F B - A - G F - E D -",
      "C C - E G - E - C - D E - G C -",
      "E - E G - F E - D - B - G F E -"
    ]
  },
  {
    "id": "pulse-cathedral",
    "name": "Pulse Cathedral",
    "lead": "triangle",
    "octave": 2,
    "leadGain": 0.8,
    "bass": [
      1,
      1.498,
      1.189,
      1.498
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "C",
      "G",
      "D",
      "E"
    ],
    "hats": [
      2,
      6,
      10,
      14
    ],
    "kicks": [
      6
    ],
    "bars": [
      "C - - G - E - C G - - E - D - C",
      "G - - D - B - G D - - B - A - G",
      "D - - A - F - D A - - F - E - D",
      "E - - B - G - E B - - G - F - E"
    ]
  },
  {
    "id": "midnight-voltage",
    "name": "Midnight Voltage",
    "lead": "sawtooth",
    "octave": 1,
    "leadGain": 0.91,
    "bass": [
      1,
      1.189,
      1.498,
      1
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "E",
      "G",
      "B"
    ],
    "hats": [
      1,
      3,
      9,
      11
    ],
    "kicks": [
      2,
      14
    ],
    "bars": [
      "E - E - G E - B - E - F G - E -",
      "E - G - A G - E - D - E F - B -",
      "G - G - B G - D - B - A G - F -",
      "B - D - F D - B - A - G F - E -"
    ]
  },
  {
    "id": "wraith-circuit",
    "name": "Wraith Circuit",
    "lead": "sine",
    "octave": 2,
    "leadGain": 0.88,
    "bass": [
      1,
      1,
      1.189,
      1.498
    ],
    "chord": [
      1.189,
      1.781
    ],
    "roots": [
      "D",
      "C",
      "B",
      "E"
    ],
    "hats": [
      7,
      15
    ],
    "kicks": [
      11
    ],
    "bars": [
      "D - F - A - F - D - E - F - D -",
      "C - E - G - E - C - D - E - C -",
      "B - D - F - D - B - C - D - B -",
      "E - G - B - G - E - F - G - E -"
    ]
  },
  {
    "id": "crimson-lanes",
    "name": "Crimson Lanes",
    "lead": "square",
    "octave": 1.5,
    "leadGain": 0.83,
    "bass": [
      1,
      1.498,
      1,
      1.189
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "A",
      "G",
      "E",
      "D"
    ],
    "hats": [
      3,
      7,
      11,
      15
    ],
    "kicks": [
      14
    ],
    "bars": [
      "A - C E - C A - G - A C - B A -",
      "G - B D - B G - F - G B - A G -",
      "E - G B - G E - D - E G - F E -",
      "D - F A - F D - C - D F - E D -"
    ]
  },
  {
    "id": "ghost-frequency",
    "name": "Ghost Frequency",
    "lead": "triangle",
    "octave": 1.5,
    "leadGain": 0.75,
    "bass": [
      1,
      1.189,
      1.189,
      1
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "G",
      "D",
      "E",
      "C"
    ],
    "hats": [
      5,
      13
    ],
    "kicks": [
      7,
      15
    ],
    "bars": [
      "G - - B D - - B G - - A - - G -",
      "D - - F A - - F D - - E - - D -",
      "E - - G B - - G E - - F - - E -",
      "C - - E G - - E C - - D - - C -"
    ]
  },
  {
    "id": "neon-descent",
    "name": "Neon Descent",
    "lead": "sawtooth",
    "octave": 2,
    "leadGain": 0.72,
    "bass": [
      1,
      1.498,
      1.189,
      1
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "D",
      "C",
      "B"
    ],
    "hats": [
      1,
      5,
      9,
      13
    ],
    "kicks": [
      6,
      14
    ],
    "bars": [
      "B - A - G - F E - G - F - E D -",
      "A - G - F - E D - F - E - D C -",
      "G - F - E - D C - E - D - C B -",
      "F - E - D - C B - D - C - B E -"
    ]
  },
  {
    "id": "ashen-horizon",
    "name": "Ashen Horizon",
    "lead": "sine",
    "octave": 2,
    "leadGain": 0.84,
    "bass": [
      1,
      1,
      1.498,
      1.189
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "C",
      "E",
      "G",
      "B"
    ],
    "hats": [
      6,
      14
    ],
    "kicks": [
      10
    ],
    "bars": [
      "C - - - G - - E - - G - D - C -",
      "E - - - B - - G - - B - F - E -",
      "G - - - D - - B - - D - A - G -",
      "B - - - F - - D - - F - C - B -"
    ]
  },
  {
    "id": "terminal-light",
    "name": "Terminal Light",
    "lead": "triangle",
    "octave": 1.5,
    "leadGain": 0.96,
    "bass": [
      1,
      1.189,
      1.498,
      1.189
    ],
    "chord": [
      1.189,
      1.498
    ],
    "roots": [
      "E",
      "B",
      "C",
      "E"
    ],
    "hats": [
      2,
      7,
      10,
      15
    ],
    "kicks": [
      3,
      11
    ],
    "bars": [
      "E G - B E - G - B G - E D - E -",
      "B D - F B - D - F D - B A - B -",
      "C E - G C - E - G E - C B - C -",
      "E B - G E - B - G F - E D - E -"
    ]
  }

];
export const MUSIC_TRACKS=Object.freeze(raw.map(track=>Object.freeze({
  ...track,riff:Object.freeze(track.bars.map(parseBar)),
  roots:Object.freeze(track.roots),bass:Object.freeze(track.bass),
  chord:Object.freeze(track.chord),
  hats:Object.freeze(track.hats),kicks:Object.freeze(track.kicks)
})));
export const MUSIC_RIFF=MUSIC_TRACKS[0].riff;

export function trackNoteAt(step,trackId=0){
  if(!Number.isInteger(step)||step<0)throw new RangeError('Invalid score step');
  const track=MUSIC_TRACKS[trackId];
  if(!track)throw new RangeError('Invalid music track');
  return track.riff[Math.floor(step/16)%4][step%16];
}
// Seeded Fisher-Yates shuffle bag: all sixteen tracks play in each
// sixteen-gate block. No consecutive repeats, even between shuffled bags.
// Selection is independent from game RNG, so it NEVER affects dealt cards.
const scramble=seed=>{
  let n=(seed>>>0)||0x9e3779b9;
  n^=n<<13;n^=n>>>17;n^=n<<5;
  return n>>>0;
};
export function shuffledTrackBag(runSeed,block){
  if(!Number.isSafeInteger(runSeed)||!Number.isInteger(block)||block<0)
    throw new RangeError('Invalid track selection seed');
  const bag=MUSIC_TRACKS.map((_,i)=>i);
  let state=scramble((runSeed ^ Math.imul(block+1,0x9e3779b9))>>>0);
  for(let i=bag.length-1;i>0;i--){
    state=scramble(state+i);
    const j=state%(i+1);
    [bag[i],bag[j]]=[bag[j],bag[i]];
  }
  if(block>0){
    const previous=shuffledTrackBag(runSeed,block-1);
    if(bag[0]===previous.at(-1)){
      [bag[0],bag[1]]=[bag[1],bag[0]];
    }
  }
  return bag;
}
export function trackForGate(runSeed,levelNumber,encounterIndex){
  if(!Number.isInteger(levelNumber)||levelNumber<1||
     !Number.isInteger(encounterIndex)||encounterIndex<0||encounterIndex>2)
    throw new RangeError('Invalid campaign gate');
  const ordinal=(levelNumber-1)*3+encounterIndex;
  return shuffledTrackBag(runSeed,Math.floor(ordinal/MUSIC_TRACKS.length))
    [ordinal%MUSIC_TRACKS.length];
}
