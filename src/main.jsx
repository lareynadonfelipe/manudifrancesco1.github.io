// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// 1) Comprueba si el navegador soporta Service Workers
if ('serviceWorker' in navigator) {
  // 2) Espera a que la página cargue por completo
  window.addEventListener('load', () => {
    // 3) Registra el sw.js que está en /sw.js (debe residir en public/sw.js)
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('✅ Service Worker registrado con scope:', reg.scope))
      .catch(err => console.error('❌ Error registrando Service Worker:', err))
  })
}

ReactDOM
  .createRoot(document.getElementById('root'))
  .render(<App />)
