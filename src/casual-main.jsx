import React from 'react';
import {createRoot} from 'react-dom/client';
import SimplifiedGame from './casual/SimplifiedGame.jsx';
import './casual/minimal.css';

// The persistent HTML badge carries the exact release commit, even if React fails.
document.documentElement.dataset.casualBuild=__SWING_BUILD_ID__;

createRoot(document.getElementById('root')).render(<React.StrictMode><SimplifiedGame/></React.StrictMode>);
