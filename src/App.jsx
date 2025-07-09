// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";
import Inicio from "./pages/Inicio";
import CosechasPage from "./pages/CosechasPage";
import SiembrasPage from "./pages/SiembrasPage";
import CamionesPage from "./pages/CamionesPage";
import VentasPage from "./pages/VentasPage";
import CalculadoraPage from "./pages/CalculadoraPage";
import EditorPage from "./pages/EditorPage";
import PlanillasCosechas from "./pages/PlanillasCosechas";
import IngresoAcopios from "./pages/IngresoAcopios";
import CargarDatosPage from "./pages/CargarDatosPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Ruta pública de login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Layout principal para rutas protegidas */}
      <Route element={<MainLayout />}>
        {/* Inicio */}
        <Route element={<ProtectedRoute permissionKey="inicio" />}>
          <Route path="/inicio" element={<Inicio />} />
        </Route>

        {/* Cosechas */}
        <Route element={<ProtectedRoute permissionKey="cosechas" />}>
          <Route path="/cosechas" element={<CosechasPage />} />
        </Route>

        {/* Siembras */}
        <Route element={<ProtectedRoute permissionKey="siembras" />}>
          <Route path="/siembras" element={<SiembrasPage />} />
        </Route>

        {/* Camiones */}
        <Route element={<ProtectedRoute permissionKey="camiones" />}>
          <Route path="/camiones" element={<CamionesPage />} />
        </Route>

        {/* Ventas */}
        <Route element={<ProtectedRoute permissionKey="ventas" />}>
          <Route path="/ventas" element={<VentasPage />} />
        </Route>

        {/* Calculadora: solo autenticación, sin control de permiso específico */}
        <Route path="/calculadora" element={<ProtectedRoute><CalculadoraPage /></ProtectedRoute>} />

        {/* Editor y páginas asociadas */}
        <Route element={<ProtectedRoute permissionKey="editor" />}>
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/planillas-cosechas" element={<PlanillasCosechas />} />
          <Route path="/ingreso-acopios" element={<IngresoAcopios />} />
          <Route path="/cargar-datos" element={<CargarDatosPage />} />
        </Route>

        {/* Acceso denegado */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* Fallback a login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
