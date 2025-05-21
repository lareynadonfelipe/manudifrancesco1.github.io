import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar siempre colapsable */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header móvil y escritorio */}
        <Navbar />

        {/* Main sin padding lateral en desktop */}
        <main className="flex-1 w-full overflow-y-auto bg-gray-50">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
