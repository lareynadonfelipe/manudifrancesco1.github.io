// src/layouts/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function MainLayout() {
  // Estado para controlar apertura del sidebar en móvil
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar recibe prop 'open' para mostrar/ocultar en móviles */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar recibe callback para alternar sidebar */}
        <Navbar toggleSidebar={toggleSidebar} />

        <main className="flex-1 w-full overflow-y-auto bg-gray-50">
          {/* Contenedor con padding reducido */}
          <div className="w-full px-2 py-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
