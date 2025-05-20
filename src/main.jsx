import './index.css';
import './App.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';

// Registrar Service Worker según entorno
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // import.meta.env.BASE_URL es '/' en dev y '/gestion-campo/' en prod
    const swUrl = import.meta.env.BASE_URL + 'sw.js';
    navigator.serviceWorker
      .register(swUrl)
      .then(reg => console.log('✅ SW registrado:', reg.scope))
      .catch(err => console.error('❌ Error registrando SW:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter basename={import.meta.env.BASE_URL}>
    <App />
  </HashRouter>
);
