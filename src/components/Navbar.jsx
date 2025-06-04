import React, { useEffect, useState } from 'react';
import { Menu, LogIn, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useCampaniaStore } from "@/store/campaniaStore";

export default function Navbar({ toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore();
  const [campanias, setCampanias] = useState([]);
  const [fontScale, setFontScale] = useState(1);
  const [showSlider, setShowSlider] = useState(false);
  const [user, setUser] = useState(null);

  // Load saved campaign
  useEffect(() => {
    const saved = localStorage.getItem("campaniaSeleccionada");
    if (saved) setCampaniaSeleccionada(saved);
  }, [setCampaniaSeleccionada]);

  // Fetch campaigns
  useEffect(() => {
    const fetchCampanias = async () => {
      const { data } = await supabase.from("siembras").select("campania");
      setCampanias([...new Set(data.map(d => d.campania))]);
    };
    fetchCampanias();
  }, []);

  // Auth state listener (Supabase v2)
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Apply font scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}rem`;
  }, [fontScale]);

  const handleCampaniaChange = e => {
    setCampaniaSeleccionada(e.target.value);
    localStorage.setItem("campaniaSeleccionada", e.target.value);
  };

  // Handle Aa click: presets on mobile, slider on desktop
  const handleAaClick = () => {
    if (window.innerWidth < 768) {
      const presets = [0.9, 1, 1.3];
      const idx = presets.indexOf(fontScale);
      const next = presets[(idx + 1) % presets.length];
      setFontScale(next);
    } else {
      setShowSlider(prev => !prev);
    }
  };

  const handleLogin = () => navigate('/login');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("cosechas")) return "Cosechas";
    if (path.includes("siembras")) return "Siembras";
    if (path.includes("camiones")) return "Camiones";
    if (path.includes("inicio")) return "Inicio";
    if (path.includes("ventas")) return "Stock/Ventas";
    return "Stock/Ventas";
  };

  // Hide selector on ventas page
  const showSelector = !location.pathname.includes("ventas");

  return (
    <header className="relative z-20 md:z-50 bg-white/60 backdrop-blur-md border-b border-white/30 px-6 py-2 flex flex-col shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-gray-100">
            <Menu size={24} className="text-gray-800" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
            {showSelector && (
              <select
                className="mt-1 md:hidden text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm w-auto"
                value={campaniaSeleccionada}
                onChange={handleCampaniaChange}
              >
                <option value="">Seleccionar campaña</option>
                {campanias.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            )}
          </div>
          {showSelector && (
            <select
              className="hidden md:block text-sm border border-gray-300 rounded-md px-2 py-1 bg-white shadow-sm"
              value={campaniaSeleccionada}
              onChange={handleCampaniaChange}
            >
              <option value="">Seleccionar campaña</option>
              {campanias.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAaClick} className="p-2 rounded-md hover:bg-gray-100">
            <span className="text-gray-800 text-lg">Aa</span>
          </button>
          {user ? (
            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-gray-100">
              <LogOut size={20} className="text-gray-800" />
            </button>
          ) : (
            <button onClick={handleLogin} className="p-2 rounded-md hover:bg-gray-100">
              <LogIn size={20} className="text-gray-800" />
            </button>
          )}
        </div>
      </div>
      {showSlider && (
        <div className="absolute right-6 top-full mt-2 w-40 bg-white border border-gray-200 rounded-md p-3 shadow-lg hidden md:block">
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={fontScale}
            onChange={e => setFontScale(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between items-center w-full text-gray-600 text-xs mt-1">
            <span style={{ fontSize: '0.8rem' }}>A</span>
            <span style={{ fontSize: `${fontScale}rem` }}>A</span>
            <span style={{ fontSize: '1.5rem' }}>A</span>
          </div>
        </div>
      )}
    </header>
  );
}
