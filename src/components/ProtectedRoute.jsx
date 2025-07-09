// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";

/**
 * ProtectedRoute ahora recibe:
 *    - permissionKey: la clave dentro de `permissions` en sessionStorage 
 *      (ej. "cosechas", "siembras", "camiones", "ventas", "editor", etc.)
 *    - children (opcional; si no lo pasás, usará <Outlet />)
 *
 * - Si no hay sesión, redirige a /login.
 * - Si permissionKey === 'editor', permite sólo al email manudifrancesco1@gmail.com.
 * - Si hay sesión pero permissions[permissionKey] !== true, redirige a /unauthorized.
 * - Si todo OK, renderiza children ó <Outlet />.
 */
export default function ProtectedRoute({ permissionKey, children }) {
  const location = useLocation();

  // 1) Leer sesión de sessionStorage
  const raw = sessionStorage.getItem("usuario");
  if (!raw) {
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

  const { permissions, email } = usuario;

  // 2) Caso especial para "editor"
  if (permissionKey === "editor") {
    if (email === "manudifrancesco1@gmail.com") {
      return children ? <>{children}</> : <Outlet />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // 3) Chequear permisos normales
  if (!permissions || permissions[permissionKey] !== true) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4) Si todo OK, renderizamos la ruta protegida
  return children ? <>{children}</> : <Outlet />;
}
