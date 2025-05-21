import React, { useState, useEffect } from 'react';
import {
  Menu as MenuIcon,
  X as CloseIcon,
  Leaf,
  Truck,
  Sprout,
  Home
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const openHandler = () => setCollapsed(false);
    document.addEventListener('openSidebar', openHandler);
    return () => document.removeEventListener('openSidebar', openHandler);
  }, []);

  const navItems = [
    { label: 'Inicio', icon: <Home size={22} />, path: '/inicio' },
    { label: 'Cosechas', icon: <Leaf size={22} />, path: '/cosechas' },
    { label: 'Camiones', icon: <Truck size={22} />, path: '/camiones' },
    { label: 'Siembras', icon: <Sprout size={22} />, path: '/siembras' },
  ];

  return (
    <>
      {/* Overlay en móvil */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#235633] text-white flex flex-col transition-transform duration-300
          ${collapsed ? '-translate-x-full' : 'translate-x-0'} w-64
          md:static md:translate-x-0
          ${collapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Móvil: header */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <span className="text-lg font-bold">La Reina Don Felipe</span>
          <button onClick={() => setCollapsed(true)} aria-label="Cerrar menú">
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Desktop: logo + toggle */}
        <div className="hidden md:flex items-center justify-between px-4 pt-4 pb-2">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="text-white/80 hover:text-white"
            >
              <MenuIcon size={20} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Sprout size={28} />
              <div>
                <div className="text-xl font-bold">La Reina</div>
                <div className="text-sm text-white/80 -mt-1">Don Felipe</div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className={`flex flex-col gap-1 px-2 pt-2 pb-4 ${collapsed ? 'items-center' : ''}`}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setCollapsed(true);
              }}
              className={`
                group relative flex items-center gap-3 py-2 px-3 w-full rounded-md hover:bg-white/10 text-sm font-medium transition
                ${collapsed ? 'justify-center' : 'justify-start'}
                ${location.pathname === item.path ? 'bg-white/10' : ''}
              `}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
