import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage        from './pages/LoginPage'
import Inicio          from './pages/Inicio'
import CosechasPage    from './pages/CosechasPage'
import SiembrasPage    from './pages/SiembrasPage'
import CamionesPage    from './pages/CamionesPage'
import UnauthorizedPage from './pages/UnauthorizedPage'

export default function App() {
  return (
    <Routes>
      {/* root renders LoginPage directly */}
      <Route path="/" element={<LoginPage />} />
      {/* Pantalla pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas */}
      <Route path="/inicio"      element={<Inicio />} />
      <Route path="/cosechas"    element={<CosechasPage />} />
      <Route path="/siembras"    element={<SiembrasPage />} />
      <Route path="/camiones"    element={<CamionesPage />} />

      {/* No autorizado */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Cualquier otra ruta redirige al login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
