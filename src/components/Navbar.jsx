import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useCampaniaStore } from "@/store/campaniaStore";

const Navbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore();
  const [campanias, setCampanias] = useState([]);
  const [fontScale, setFontScale] = useState(1);
  const [showSlider, setShowSlider] = useState(false);

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

  // Aplicar escala de fuente
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}rem`;
  }, [fontScale]);

  const handleCampaniaChange = (e) => {
    const value = e.target.value;
    setCampaniaSeleccionada(value);
    localStorage.setItem("campaniaSeleccionada", value);
  };

  const handleSliderChange = (e) => {
    setFontScale(parseFloat(e.target.value));
  };

  const toggleSlider = () => setShowSlider(prev => !prev);

  const getPageTitle = () => {
    if (location.pathname.includes("cosechas")) return "Cosechas";
    if (location.pathname.includes("siembras")) return "Siembras";
    if (location.pathname.includes("camiones")) return "Camiones";
    if (location.pathname.includes("inicio")) return "Inicio";
    return "Gestión";
  };

  return (
    <header className="h-16 bg-white/60 backdrop-blur-md border-b border-white/30 px-6 flex items-center justify-between shadow-sm">
      {/* Wrapper izquierdo con hamburguesa, título y selector */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-gray-100">
          <Menu size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
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

      {/* Botón de slider para tamaño de fuente en todas las versiones */}
      <div className="relative">
        <button onClick={toggleSlider} className="p-2 rounded-md hover:bg-gray-100">
          <span className="text-gray-800 text-lg">Aa</span>
        </button>
        {showSlider && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md p-3 shadow-lg">
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={fontScale}
              onChange={handleSliderChange}
              className="w-full"
            />
            <div className="flex justify-between items-center w-full text-gray-600 text-xs mt-1">
              <span style={{ fontSize: '0.8rem' }}>A</span>
              <span style={{ fontSize: `${fontScale}rem` }}>A</span>
              <span style={{ fontSize: '1.5rem' }}>A</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
