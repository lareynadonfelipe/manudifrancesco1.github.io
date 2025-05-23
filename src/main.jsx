// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';      // Tus estilos globales (Tailwind + reset)
import App from './App';
import { supabase } from '@/lib/supabase';  // <-- importa tu cliente Supabase

// Exponlo en window para usarlo en la consola de DevTools
window.supabase = supabase;

const rootElement = document.getElementById('root');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
