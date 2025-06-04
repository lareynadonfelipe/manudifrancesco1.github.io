// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";

/**
 * ProtectedRoute ahora recibe:
 *    - permissionKey: la clave dentro de `permissions` en sessionStorage (ej. "cosechas", "siembras", "camiones", "ventas", etc.)
 *    - children (opcional; si no lo pasás, usará <Outlet />)
 *
 * - Si no hay sesión, redirige a /login.
 * - Si hay sesión pero user.permissions[permissionKey] !== true, redirige a /unauthorized.
 * - Si todo OK, renderiza children ó <Outlet />.
 */
export default function ProtectedRoute({ permissionKey, children }) {
  const location = useLocation();

  // 1) Leo la sesión de sessionStorage
  const raw = sessionStorage.getItem("usuario");
  if (!raw) {
    // No hay usuario → redirige a /login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let usuario;
  try {
    usuario = JSON.parse(raw);
  } catch {
    // JSON mal formado → limpio y vuelvo a login
    sessionStorage.removeItem("usuario");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2) Extraigo permissions / role
  const { permissions } = usuario;
  // Si no existe el objeto permissions o la clave permissionKey es false/undefined:
  if (!permissions || permissions[permissionKey] !== true) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3) Si todo OK, renderizo children o <Outlet />
  return children ? <>{children}</> : <Outlet />;
}
