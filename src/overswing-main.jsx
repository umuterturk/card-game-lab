import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import ExternalPlay from './external/ExternalPlay.jsx';
import './fonts.js';
import './styles.css';
import './release/standalone.css';
import {registerOverswingOffline} from './release/registerOffline.js';

// Dedicated portal/PWA entry. It intentionally does not load the Game Lab catalog.
const GAME={slug:'overswing'};
function OverswingStandalone(){
  useEffect(()=>{
    document.documentElement.classList.add('overswing-full-active');
    document.body.classList.add('overswing-full-active');
    return ()=>{
      document.documentElement.classList.remove('overswing-full-active');
      document.body.classList.remove('overswing-full-active');
    };
  },[]);
  return <div className="overswing-fullscreen" lang="en">
    <ExternalPlay game={GAME} fullView/>
  </div>;
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode><OverswingStandalone/></React.StrictMode>
);
registerOverswingOffline();
