// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";

/**
 * ProtectedRoute:
 * - Si no hay sesión → /login
 * - Si permissionKey no está definido → solo checa sesión
 * - Si permissionKey === 'editor' → email == manu...
 * - Si permissionKey definido → checa permissions[permissionKey] === true
 */
export default function ProtectedRoute({ permissionKey, children }) {
  const location = useLocation();

  // 1) Leer usuario de sessionStorage
  const raw = sessionStorage.getItem("usuario");
  if (!raw) {
    // sin sesión → login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  let usuario;
  try {
    usuario = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem("usuario");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { permissions, email } = usuario;

  // 2) Si no pasaron permissionKey, solo checamos que esté logueado
  if (!permissionKey) {
    return children ? <>{children}</> : <Outlet />;
  }

  // 3) Caso especial "editor" (solo Manu)
  if (permissionKey === "editor") {
    if (email === "manudifrancesco1@gmail.com") {
      return children ? <>{children}</> : <Outlet />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // 4) Chequeo de permiso normal
  if (!permissions || permissions[permissionKey] !== true) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 5) Todo OK → renderizado
  return children ? <>{children}</> : <Outlet />;
}
