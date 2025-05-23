// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import MainLayout from "./layouts/MainLayout";
import Inicio from "./pages/Inicio";
import CosechasPage from "./pages/CosechasPage";
import SiembrasPage from "./pages/SiembrasPage";
import CamionesPage from "./pages/CamionesPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <Routes>
      {/* login público */}
      <Route path="/login" element={<LoginPage />} />

      {/* rutas con layout */}
      <Route element={<MainLayout />}>
        <Route path="/inicio"    element={<Inicio />} />
        <Route path="/cosechas"  element={<CosechasPage />} />
        <Route path="/siembras"  element={<SiembrasPage />} />
        <Route path="/camiones"  element={<CamionesPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
