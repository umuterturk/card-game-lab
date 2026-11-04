import React from 'react';
import {createRoot} from 'react-dom/client';
import CasualGame from './casual/CasualGame.jsx';
import './casual/casual.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><CasualGame/></React.StrictMode>);
