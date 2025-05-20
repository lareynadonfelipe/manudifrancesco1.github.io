// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

/**
 * MainLayout ocupa toda la ventana eliminando márgenes y espacios extra
 * Requiere que en index.css/html/body/#root tengan height:100% y margin:0
 */
const MainLayout = () => {
  return (
    <div className="flex min-h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 w-full overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;