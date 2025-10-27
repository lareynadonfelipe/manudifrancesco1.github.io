import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage               from "./pages/LoginPage";
import MainLayout              from "./layouts/MainLayout";

import Inicio                  from "./pages/Inicio";
import CosechasPage            from "./pages/CosechasPage";
import SiembrasPage            from "./pages/SiembrasPage";
import CamionesPage            from "./pages/CamionesPage";
// import VentasPage              from "./pages/VentasPage";
import VentasPage2Protected   from "./pages/VentasPage2";
import LiquidacionesAfipPageProtected from "./pages/LiquidacionesAfipPage";
import CalculadoraPage         from "./pages/CalculadoraPage";
import EditorPage              from "./pages/EditorPage";
import PlanillasCosechas       from "./pages/PlanillasCosechas";
import IngresoAcopios          from "./pages/IngresoAcopios";
import UnauthorizedPage        from "./pages/UnauthorizedPage";
import ClientesProveedoresPage from "./pages/ClientesProveedoresPage";
import FacturasPage            from "./pages/FacturasPage";

import ProtectedRoute          from "./components/ProtectedRoute";

// **Nuevas páginas de facturación**
import FacturasPendientesPage   from "./pages/FacturasPendientesPage";

export default function App() {
  return (
    <Routes>
      {/* 1) Login (público) */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2) Rutas que requieren autenticación */}
      <Route element={<MainLayout />}>
 {/* 2.1 Rutas protegidas genéricas */}
<Route element={<ProtectedRoute />}>
  {/* Calculadora */}
  <Route path="/calculadora" element={<CalculadoraPage />} />
  <Route path="/facturas" element={<FacturasPage />} />
  {/* Facturación */}
  <Route path="/facturas/pendientes" element={<FacturasPendientesPage />} />
  {/* Contactos */}
  <Route path="/contactos" element={<ClientesProveedoresPage />} />
</Route>


        {/* 2.2 Rutas con permisos específicos */}
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
          <Route path="/ventas2" element={<VentasPage2Protected />} />
          <Route path="/liquidaciones-afip" element={<LiquidacionesAfipPageProtected />} />
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
