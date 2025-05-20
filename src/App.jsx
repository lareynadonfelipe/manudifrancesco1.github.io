// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROLES } from "./constants/roles.js";

import LoginPage        from "@/pages/LoginPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import Inicio           from "@/pages/Inicio";
import CosechasPage     from "@/pages/CosechasPage";
import SiembrasPage     from "@/pages/SiembrasPage";
import CamionesPage    from "@/pages/CamionesPage";  // ← import añadido

import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout     from "@/layouts/MainLayout";

export default function App() {
  return (
    <Routes>
      {/* 1) Públicas */}
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="login"       element={<LoginPage />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />

      {/* 2) Protegidas dentro de MainLayout */}
      <Route
        element={
          <ProtectedRoute rolesPermitidos={[
            ROLES.ADMIN,
            ROLES.EDITOR,
            ROLES.VISUALIZADOR
          ]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="inicio"   element={<Inicio />} />
        <Route path="cosechas" element={<CosechasPage />} />
       <Route path="camiones"  element={<CamionesPage />} />  {/* ← ruta agregada */}

        <Route path="siembras" element={<SiembrasPage />} />
      </Route>

      {/* 3) Fallback a login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
