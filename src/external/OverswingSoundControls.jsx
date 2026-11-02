import React,{useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {MUSIC_TRACKS} from './overswingTracks.js';
import './overswingSoundControls.css';

function PixelGear(){
  return <svg className="os-audio-gear-icon" aria-hidden="true"
    viewBox="0 0 24 24" shapeRendering="crispEdges" fill="currentColor">
    <path d="M9 1H15V4H18V6H21V9H23V15H21V18H18V20H15V23H9V20H6V18H3V15H1V9H3V6H6V4H9Z"/>
    <path d="M9 9H15V15H9Z" fill="#302025"/>
  </svg>;
}
function VolumeRow({id,title,value,onChange}){
  return <div className="os-audio-volume">
    <div className="os-audio-volume-head">
      <label htmlFor={id}>{title}</label>
      <output htmlFor={id}>{value===0?'OFF':value+'%'}</output>
    </div>
    <input id={id} type="range" min="0" max="100" step="1"
      value={value} onChange={e=>onChange(Number(e.target.value))}
      style={{'--audio-progress':value+'%'}}
      aria-valuetext={value===0?'Off':value+' percent'}/>
    <div className="os-audio-range-labels"><span>0 · OFF</span><span>100 · FULL</span></div>
  </div>;
}
// One compact settings button instead of separate Music and SFX toggles.
// Portal keeps the modal above cards, coin flights, and all feedback layers.
export default function OverswingSoundControls({sound,className=''}){
  const [open,setOpen]=useState(false);
  const trigger=useRef(null),panel=useRef(null),closeButton=useRef(null);
  const dialogId=useId(),trackId=useId(),musicId=useId(),sfxId=useId();
  useEffect(()=>{
    if(!open)return;
    closeButton.current?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
      if(event.key!=='Tab'||!panel.current)return;
      const focusables=[...panel.current.querySelectorAll(
        'button:not(:disabled),select:not(:disabled),input:not(:disabled)')];
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){
        event.preventDefault();last.focus();
      }else if(!event.shiftKey&&document.activeElement===last){
        event.preventDefault();first.focus();
      }
    };
    document.addEventListener('keydown',keydown);
    return ()=>document.removeEventListener('keydown',keydown);
  },[open]);
  const close=()=>{setOpen(false);trigger.current?.focus();};
  if(!sound)return null;
  return <>
    <div className={'os-sound-controls '+className}>
      <button type="button" ref={trigger} className="os-audio-settings-trigger"
        aria-haspopup="dialog" aria-expanded={open}
        aria-controls={dialogId} aria-label="Music and sound settings"
        title="Music & sound settings"
        onClick={()=>{
          sound.unlock(); // direct gesture: resume saved music if enabled
          setOpen(true);
        }}>
        <PixelGear/>
        <span>AUDIO</span>
      </button>
    </div>
    {open&&typeof document!=='undefined'&&createPortal(
      <div className="os-audio-modal-backdrop" role="presentation"
        onMouseDown={event=>{if(event.target===event.currentTarget)close();}}>
        <section className="os-audio-modal" id={dialogId} ref={panel}
          role="dialog" aria-modal="true" aria-labelledby={dialogId+'-title'}>
          <div className="os-audio-modal-title">
            <div>
              <span className="os-audio-kicker">OVERSWING · SOUND SYSTEM</span>
              <h2 id={dialogId+'-title'}>MUSIC &amp; SOUND</h2>
            </div>
            <button type="button" ref={closeButton} className="os-audio-close"
              onClick={close} aria-label="Close audio settings">✕</button>
          </div>
          <div className="os-audio-select-section">
            <label htmlFor={trackId}>MUSIC TRACK</label>
            <select id={trackId}
              value={sound.trackChoice===null?'auto':String(sound.trackChoice)}
              onChange={event=>sound.setTrackChoice(
                event.target.value==='auto'?null:Number(event.target.value))}>
              <option value="auto">AUTO · RANDOM EACH GATE</option>
              {MUSIC_TRACKS.map((track,index)=>
                <option key={track.id} value={index}>
                  {String(index+1).padStart(2,'0')} · {track.name.toUpperCase()}
                </option>)}
            </select>
            <p className="os-audio-current-track">
              NOW SELECTED: <strong>{MUSIC_TRACKS[sound.effectiveTrack]?.name||'Iron Pulse'}</strong>
            </p>
            <p className="os-audio-hint">Auto rotates tracks each gate. Manual selection
              keeps your chosen track until you return to Auto.</p>
          </div>
          <VolumeRow id={musicId} title="MUSIC VOLUME"
            value={sound.musicVolume} onChange={sound.setMusicVolume}/>
          <VolumeRow id={sfxId} title="SOUND EFFECTS"
            value={sound.sfxVolume} onChange={sound.setSfxVolume}/>
          <p className="os-audio-note">
            Changes apply immediately. Music at 0 is off; the two volumes are
            independent. Your preferences are saved.
          </p>
          <button className="os-audio-done" type="button" onClick={close}>
            BACK TO GAME
          </button>
        </section>
      </div>,document.body)
    }
  </>;
}
