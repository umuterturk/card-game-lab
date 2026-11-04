import React from 'react';
import {createRoot} from 'react-dom/client';
import CasualGame from './casual/CasualGame.jsx';
import './casual/casual.css';
import './casual/casual-polish.css';
import './casual/casual-stability.css';

// The persistent HTML badge carries the exact release commit, even if React fails.
document.documentElement.dataset.casualBuild=__SWING_BUILD_ID__;

createRoot(document.getElementById('root')).render(<React.StrictMode><CasualGame/></React.StrictMode>);
