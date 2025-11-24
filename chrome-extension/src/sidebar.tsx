import React from 'react';
import ReactDOM from 'react-dom/client';
import { Sidebar } from './components/Sidebar';
import './index.css';

console.log('[AmersurChat] Sidebar iniciado');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sidebar />
  </React.StrictMode>
);
