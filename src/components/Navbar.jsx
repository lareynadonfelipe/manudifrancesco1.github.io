import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaniaStore } from "@/store/campaniaStore";
import { useUIStore } from "@/store/uiStore";

const Navbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore();
  const { mode, toggleMode } = useUIStore();
  const [campanias, setCampanias] = useState([]);

  // Recuperar campaña guardada al montar
  useEffect(() => {
    const saved = localStorage.getItem("campaniaSeleccionada");
    if (saved) setCampaniaSeleccionada(saved);
  }, [setCampaniaSeleccionada]);

  // Cargar campañas únicas desde Supabase
  useEffect(() => {
    const fetchCampanias = async () => {
      const { data } = await supabase.from("siembras").select("campania");
      const unicas = [...new Set(data.map((d) => d.campania))];
      setCampanias(unicas);
    };
    fetchCampanias();
  }, []);

  // Guardar campaña seleccionada
  const handleCampaniaChange = (e) => {
    const value = e.target.value;
    setCampaniaSeleccionada(value);
    localStorage.setItem("campaniaSeleccionada", value);
  };

  const getPageTitle = () => {
    if (location.pathname.includes("cosechas")) return "Cosechas";
    if (location.pathname.includes("siembras")) return "Siembras";
    if (location.pathname.includes("camiones")) return "Camiones";
    if (location.pathname.includes("inicio")) return "Inicio";
    return "Gestión";
  };

  return (
    <header className="h-16 bg-white/60 backdrop-blur-md border-b border-white/30 px-6 flex items-center justify-between shadow-sm">
      {/* Agrupa hamburguesa, título y selector al inicio */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-gray-100">
          <Menu size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {getPageTitle()}
        </h1>
        <select
          value={campaniaSeleccionada}
          onChange={handleCampaniaChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm"
        >
          <option value="">Seleccionar campaña</option>
          {campanias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Botón modo editor/lector */}
      <button
        onClick={toggleMode}
        className={`text-sm px-3 py-1 rounded-md font-medium shadow-sm border transition ${
          mode === "editor"
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-white text-green-700 border-green-600 hover:bg-green-50"
        }`}
      >
        Modo {mode === "editor" ? "Editor" : "Lector"}
      </button>
    </header>
  );
};

export default Navbar;
