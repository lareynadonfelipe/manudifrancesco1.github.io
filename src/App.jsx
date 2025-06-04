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
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<MainLayout />}>
        {/* Sólo si permissions.inicio === true */}
        <Route element={<ProtectedRoute permissionKey="inicio" />}>
          <Route path="/inicio" element={<Inicio />} />
        </Route>

        {/* Sólo si permissions.cosechas === true */}
        <Route element={<ProtectedRoute permissionKey="cosechas" />}>
          <Route path="/cosechas" element={<CosechasPage />} />
        </Route>

        {/* Sólo si permissions.siembras === true */}
        <Route element={<ProtectedRoute permissionKey="siembras" />}>
          <Route path="/siembras" element={<SiembrasPage />} />
        </Route>

        {/* Sólo si permissions.camiones === true */}
        <Route element={<ProtectedRoute permissionKey="camiones" />}>
          <Route path="/camiones" element={<CamionesPage />} />
        </Route>

        {/* Sólo si permissions.ventas === true */}
        <Route element={<ProtectedRoute permissionKey="ventas" />}>
          <Route path="/ventas" element={<VentasPage />} />
        </Route>

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
