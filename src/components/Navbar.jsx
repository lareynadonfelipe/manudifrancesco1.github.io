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

  useEffect(() => {
    const saved = localStorage.getItem("campaniaSeleccionada");
    if (saved) setCampaniaSeleccionada(saved);
  }, [setCampaniaSeleccionada]);

  useEffect(() => {
    const fetchCampanias = async () => {
      const { data } = await supabase.from("siembras").select("campania");
      setCampanias([...new Set(data.map(d => d.campania))]);
    };
    fetchCampanias();
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}rem`;
  }, [fontScale]);

  const handleCampaniaChange = e => {
    const value = e.target.value;
    setCampaniaSeleccionada(value);
    localStorage.setItem("campaniaSeleccionada", value);
  };

  const handleSliderChange = e => setFontScale(parseFloat(e.target.value));
  const toggleSlider = () => setShowSlider(prev => !prev);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("cosechas")) return "Cosechas";
    if (path.includes("siembras")) return "Siembras";
    if (path.includes("camiones")) return "Camiones";
    if (path.includes("inicio")) return "Inicio";
    return "Gestión";
  };

  return (
    <header className="bg-white/60 backdrop-blur-md border-b border-white/30 px-6 py-2 flex flex-col shadow-sm">
      {/* First row: title and controls */}
      <div className="flex items-center justify-between">
        {/* Left: hamburger, title, desktop selector */}
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-gray-100">
            <Menu size={24} className="text-gray-800" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
          <select
            value={campaniaSeleccionada}
            onChange={handleCampaniaChange}
            className="hidden md:block text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm"
          >
            <option value="">Seleccionar campaña</option>
            {campanias.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {/* Right: Aa button */}
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
      </div>
      {/* Second row: mobile selector under title */}
      <div className="mt-2 md:hidden flex ml-[72px]">
        <select
          value={campaniaSeleccionada}
          onChange={handleCampaniaChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm w-auto"
        >
          <option value="">Seleccionar campaña</option>
          {campanias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Navbar;
