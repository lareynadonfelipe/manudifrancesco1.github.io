// src/pages/UnauthorizedPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div
        className="w-full max-w-md bg-white/75 backdrop-blur-sm border border-gray-200 
                   rounded-3xl shadow-xl overflow-hidden"
      >
        {/* Header con degradado y logo */}
        <div className="flex flex-col items-center p-8 bg-gradient-to-r from-[#2E8B57] to-[#238249]">
          <Leaf size={40} className="text-white mb-2" />
          <h1 className="text-white text-3xl font-light tracking-wide">
            La Reina – Don Felipe
          </h1>
        </div>

        {/* Contenido */}
        <div className="p-8 space-y-6">
          {/* Aviso de error */}
          <div
            className="flex items-center gap-2 bg-red-50 border border-red-200 
                       text-red-700 px-4 py-2 rounded-lg"
          >
            <AlertTriangle size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">Acceso denegado</span>
          </div>

          <p className="text-center text-gray-700">
            No tienes permiso para ver esta página.
          </p>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-[#2E8B57] text-white text-base font-medium rounded-lg
                       shadow-md hover:bg-green-700 hover:shadow-lg transition duration-150"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
