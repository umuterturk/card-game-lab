import React from 'react';
import './overswingSoundControls.css';

export default function OverswingSoundControls({sound,className=''}){
  if(!sound)return null;
  return <div className={'os-sound-controls '+className}
    role="group" aria-label="Music and sound controls">
    <button type="button"
      className={'os8-audio-toggle '+(sound.musicOn?'on':'off')}
      onClick={sound.toggleMusic}
      aria-label={sound.musicOn?'Turn music off':'Turn music on'}
      aria-pressed={sound.musicOn} title={sound.musicOn?'Music on · tap to mute':'Play original battle music'}>
      ♫<span>{sound.musicOn?'ON':'OFF'}</span>
    </button>
    <button type="button"
      className={'os8-audio-toggle '+(sound.sfxOn?'on':'off')}
      onClick={sound.toggleSfx}
      aria-label={sound.sfxOn?'Mute sound effects':'Enable sound effects'}
      aria-pressed={sound.sfxOn} title={sound.sfxOn?'SFX on · tap to mute':'SFX muted'}>
      ◖))<span>{sound.sfxOn?'ON':'OFF'}</span>
    </button>
  </div>;
}
