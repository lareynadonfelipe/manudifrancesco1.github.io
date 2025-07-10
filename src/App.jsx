import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage         from "./pages/LoginPage";
import MainLayout        from "./layouts/MainLayout";
import Inicio            from "./pages/Inicio";
import CosechasPage      from "./pages/CosechasPage";
import SiembrasPage      from "./pages/SiembrasPage";
import CamionesPage      from "./pages/CamionesPage";
import VentasPage        from "./pages/VentasPage";
import CalculadoraPage   from "./pages/CalculadoraPage";
import EditorPage        from "./pages/EditorPage";
import PlanillasCosechas from "./pages/PlanillasCosechas";
import IngresoAcopios    from "./pages/IngresoAcopios";
import UnauthorizedPage  from "./pages/UnauthorizedPage";
import ProtectedRoute    from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* 1) Login (público) */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2) Rutas que requieren login */}
      <Route element={<MainLayout />}>
        {/* 2.1 Calculadora: solo exige autenticación */}
        <Route element={<ProtectedRoute />}>
          <Route path="/calculadora" element={<CalculadoraPage />} />
        </Route>

        {/* 2.2 Rutas con permiso específico */}
        <Route element={<ProtectedRoute permissionKey="inicio" />}>
          <Route path="/inicio" element={<Inicio />} />
        </Route>
        <Route element={<ProtectedRoute permissionKey="cosechas" />}>
          <Route path="/cosechas" element={<CosechasPage />} />
        </Route>
        <Route element={<ProtectedRoute permissionKey="siembras" />}>
          <Route path="/siembras" element={<SiembrasPage />} />
        </Route>
        <Route element={<ProtectedRoute permissionKey="camiones" />}>
          <Route path="/camiones" element={<CamionesPage />} />
        </Route>
        <Route element={<ProtectedRoute permissionKey="ventas" />}>
          <Route path="/ventas" element={<VentasPage />} />
        </Route>
        <Route element={<ProtectedRoute permissionKey="editor" />}>
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/planillas-cosechas" element={<PlanillasCosechas />} />
          <Route path="/ingreso-acopios" element={<IngresoAcopios />} />
        </Route>

        {/* 2.3 Acceso denegado */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* 3) Fallback: todo lo demás va a login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
