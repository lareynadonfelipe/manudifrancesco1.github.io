import React, { useState } from 'react';
import { Truck, Sprout, Home, Menu, Leaf } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ open, setOpen }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Inicio', icon: <Home size={22} />, path: '/inicio' },
    { label: 'Cosechas', icon: <Leaf size={22} />, path: '/cosechas' },
    { label: 'Camiones', icon: <Truck size={22} />, path: '/camiones' },
    { label: 'Siembras', icon: <Sprout size={22} />, path: '/siembras' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setCollapsed(true);
    if (window.innerWidth < 768) setOpen(false);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 bg-[#235633] text-white flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Header with logo and toggle */}
      <div className={`flex items-center justify-${collapsed ? 'center' : 'between'} p-4`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Leaf size={24} />
            <span className="text-lg font-bold">La Reina<br />Don Felipe</span>
          </div>
        )}
        <button
          className="p-2 rounded hover:bg-[#1f4f33] md:flex hidden"
          onClick={() => setCollapsed(prev => !prev)}
        >
          <Menu size={24} className={`${collapsed ? 'rotate-180' : ''}`} />
        </button>
        <button
          className="p-2 rounded hover:bg-[#1f4f33] md:hidden"
          onClick={() => setOpen(false)}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto">
        {navItems.map(({ label, icon, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={label}
              onClick={() => handleNavigation(path)}
              className={`flex items-center w-full gap-3 px-4 py-3 text-left hover:bg-[#1f4f33] transition-colors
                ${active ? 'bg-[#1f4f33]' : ''}`}
            >
              {icon}
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
