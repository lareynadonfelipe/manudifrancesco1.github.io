// src/pages/CargarDatosPage.jsx
import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function CargarDatosPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener la sesión actual
    const currentSession = supabase.auth.session();
    setSession(currentSession);
    setLoading(false);

    // Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Redirigir al login si no hay sesión
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Permitir solo a manudifrancesco1@gmail.com
  const userEmail = session.user.email;
  if (userEmail !== 'manudifrancesco1@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-red-600">Acceso no autorizado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">Cargar datos</h1>
      <nav className="flex flex-col space-y-4">
        <Link
          to="/editor"
          className="block p-4 border border-gray-300 rounded hover:bg-gray-100"
        >
          EditorPage
        </Link>
        <Link
          to="/ingreso-acopios"
          className="block p-4 border border-gray-300 rounded hover:bg-gray-100"
        >
          IngresoAcopios
        </Link>
        <Link
          to="/planillas-cosechas"
          className="block p-4 border border-gray-300 rounded hover:bg-gray-100"
        >
          PlanillasCosechas
        </Link>
      </nav>
    </div>
  );
}
