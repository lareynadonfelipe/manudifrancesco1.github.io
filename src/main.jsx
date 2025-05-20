import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

// Registrar el Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Aquí usamos la BASE_URL para apuntar a /gestion-campo/sw.js en producción
    const swUrl = import.meta.env.BASE_URL + 'sw.js'
    navigator.serviceWorker
      .register(swUrl)
      .then(reg => console.log('✅ SW registrado con scope:', reg.scope))
      .catch(err => console.error('❌ Error registrando SW:', err))
  })
}

ReactDOM
  .createRoot(document.getElementById('root'))
  .render(
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  )
