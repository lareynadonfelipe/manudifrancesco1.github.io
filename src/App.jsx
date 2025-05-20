// src/App.jsx
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Import your actual page components
import LoginPage from './pages/LoginPage'
import Inicio from    './pages/Inicio'
import CosechasPage from './pages/CosechasPage'
import SiembrasPage  from './pages/SiembrasPage'
import CamionesPage  from './pages/CamionesPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

export default function App() {
  return (
    <Routes>
      {/* Redirect from root to your home/dashboard */}
      <Route path="/" element={<Navigate to="/inicio" replace />} />

      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected or main app routes */}
      <Route path="/inicio"      element={<Inicio />} />
      <Route path="/cosechas"    element={<CosechasPage />} />
      <Route path="/siembras"    element={<SiembrasPage />} />
      <Route path="/camiones"    element={<CamionesPage />} />

      {/* Fallback for unauthorized or 404 */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*"              element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
