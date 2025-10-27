// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from '@/components/TopNavbar';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <main className="flex-1 w-full overflow-y-auto bg-gray-50">
          <div className="w-full px-2 md:px-4 py-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}