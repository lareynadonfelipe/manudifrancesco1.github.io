// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Protege rutas comprobando si hay un "usuario" en sessionStorage
 * y, opcionalmente, si su role está en rolesPermitidos.
 *
 * @param {{ rolesPermitidos?: string[], children: React.ReactNode }} props
 */
export default function ProtectedRoute({ rolesPermitidos = [], children }) {
  const location = useLocation();

  // Leo la sesión
  const raw = sessionStorage.getItem("usuario");
  if (!raw) {
    // No hay usuario → al login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let user;
  try {
    user = JSON.parse(raw);
  } catch {
    // Si el JSON está mal formado, limpio y voy a login
    sessionStorage.removeItem("usuario");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { role } = user;
  // Si hay roles permitidos y el user.role no está entre ellos
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Todo OK → renderizo el children de la ruta
  return <>{children}</>;
}
