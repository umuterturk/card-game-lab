import React from 'react';
import './overswingSoundControls.css';

export default function OverswingSoundControls({sound,className=''}){
  if(!sound)return null;
  return <div className={'os-sound-controls '+className}
    role="group" aria-label="Music and sound controls">
    <button type="button"
      className={'os8-audio-toggle '+(sound.musicOn?'on':'off')+
        (sound.musicLevel===2?' loud':'')}
      onClick={sound.toggleMusic}
      aria-label={sound.musicLevel===0?'Turn music on':
        sound.musicLevel===1?'Increase music volume':'Turn music off'}
      aria-pressed={sound.musicLevel>0}
      title={sound.musicLevel===0?'Music OFF · tap for ON':
        sound.musicLevel===1?'Music ON · tap for LOUD':'Music LOUD · tap for OFF'}>
      ♫<span>{sound.musicLevel===2?'LOUD':sound.musicOn?'ON':'OFF'}</span>
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
