import React from 'react';
import {createRoot} from 'react-dom/client';
import CasualGame from './casual/CasualGame.jsx';
import './casual/casual.css';
import './casual/casual-polish.css';
import './casual/casual-stability.css';

// A version label appears only when explicitly requested with ?debug=1.
// It lets us distinguish an old Safari/service-worker cache from a new deployment.
const CASUAL_BUILD='2026-11-04-style-order-fix';
document.documentElement.dataset.casualBuild=CASUAL_BUILD;
if(new URLSearchParams(window.location.search).has('debug')){
  const indicator=document.createElement('div');
  indicator.textContent='Swing build: '+CASUAL_BUILD;
  indicator.setAttribute('data-casual-debug','');
  Object.assign(indicator.style,{position:'fixed',left:'6px',bottom:'6px',zIndex:'9999',
    padding:'5px 7px',borderRadius:'5px',background:'#24253de6',color:'white',
    font:'11px ui-monospace,monospace',pointerEvents:'none'});
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(indicator),{once:true});
}


createRoot(document.getElementById('root')).render(<React.StrictMode><CasualGame/></React.StrictMode>);
