import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";

/**
 * ProtectedRoute:
 * - Si no hay sesión → /login
 * - Si permissionKey no está definido → solo checa sesión
 * - Si permissionKey === 'editor' → solo email manu...
 * - Si permissionKey definido → checa permissions[permissionKey] === true
 * - Caso especial: bloquea acceso a cualquier ruta si email es "horaciolinzoain@hotmail.com", excepto /login y /unauthorized
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

  // 2) Caso especial: denegar acceso SOLO a páginas de gestión comercial y contactos para horaciolinzoain@hotmail.com
  const blockedUser = "horaciolinzoain@hotmail.com";
  const blockedPrefixes = [
    "/ventas",
    "/liquidaciones",
    "/facturas",
    "/stock",
    "/stock-ventas",
    "/contactos",
  ];

  const shouldBlock =
    email === blockedUser && blockedPrefixes.some((p) => location.pathname.startsWith(p));

  if (shouldBlock) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3) Si no pasaron permissionKey, solo checamos que esté logueado
  if (!permissionKey) {
    return children ? <>{children}</> : <Outlet />;
  }

  // 4) Caso especial "editor" (solo Manu)
  if (permissionKey === "editor") {
    if (email === "manudifrancesco1@gmail.com") {
      return children ? <>{children}</> : <Outlet />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // 5) Chequeo de permiso normal
  if (!permissions || permissions[permissionKey] !== true) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 6) Todo OK → renderizado
  return children ? <>{children}</> : <Outlet />;
}
