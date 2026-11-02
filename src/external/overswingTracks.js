// Six entirely original, royalty-free-to-this-game procedural synthwave scores.
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
// Seeded Fisher-Yates shuffle bag: all six distinct tracks play in each
// six-gate block. No consecutive repeats, even between shuffled bags.
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
