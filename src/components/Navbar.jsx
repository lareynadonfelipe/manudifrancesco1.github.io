// src/components/Navbar.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCampaniaStore } from '@/store/campaniaStore';
import { useUIStore } from '@/store/uiStore';
import { Menu as MenuIcon } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore();
  const { mode, toggleMode } = useUIStore();
  const [campanias, setCampanias] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('campaniaSeleccionada');
    if (saved) setCampaniaSeleccionada(saved);
  }, [setCampaniaSeleccionada]);

  useEffect(() => {
    async function fetchCampanias() {
      const { data } = await supabase.from('siembras').select('campania');
      setCampanias([...new Set(data.map(c => c.campania))]);
    }
    fetchCampanias();
  }, []);

  const handleCampaniaChange = e => {
    const v = e.target.value;
    setCampaniaSeleccionada(v);
    localStorage.setItem('campaniaSeleccionada', v);
  };

  const getPageTitle = () => {
    if (location.pathname.includes('cosechas')) return 'Cosechas';
    if (location.pathname.includes('siembras')) return 'Siembras';
    if (location.pathname.includes('camiones')) return 'Camiones';
    if (location.pathname.includes('inicio')) return 'Inicio';
    return 'Gestión';
  };

  return (
    <>
      {/* MÓVIL */}
      <header className="bg-white/60 backdrop-blur-md border-b border-white/30 md:hidden">
        <div className="flex items-center justify-between h-16 px-4">
          <button
            onClick={() => document.dispatchEvent(new Event('openSidebar'))}
            aria-label="Abrir menú"
            className="p-2"
          >
            <MenuIcon size={24} />
          </button>
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
          <button
            onClick={toggleMode}
            aria-label="Cambiar modo"
            className="p-2 text-base font-medium"
          >
            {mode === 'editor' ? 'ED' : 'LE'}
          </button>
        </div>
        <div className="px-4 pb-4">
          <select
            value={campaniaSeleccionada}
            onChange={handleCampaniaChange}
            className="
              block w-full text-base
              border border-gray-300
              rounded-lg bg-white
              px-4 py-3 shadow-sm
              focus:outline-none focus:ring-2 focus:ring-green-500
              appearance-none
            "
            aria-label="Seleccionar campaña"
          >
            <option value="">Seleccionar campaña</option>
            {campanias.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ESCRITORIO */}
      <header className="hidden md:flex items-center justify-between h-16 bg-white/60 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="flex items-center gap-4 px-4">
          <button
            onClick={() => document.dispatchEvent(new Event('openSidebar'))}
            aria-label="Abrir menú"
            className="p-2"
          >
            <MenuIcon size={24} />
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
            {campanias.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="px-4">
          <button
            onClick={toggleMode}
            className={`text-sm px-3 py-1 rounded-md font-medium shadow-sm border transition ${
              mode === 'editor'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white text-green-700 border-green-600 hover:bg-green-50'
            }`}
          >
            Modo {mode === 'editor' ? 'Editor' : 'Lector'}
          </button>
        </div>
      </header>
    </>
  );
}
