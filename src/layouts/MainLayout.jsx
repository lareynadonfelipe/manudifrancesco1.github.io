// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const MainLayout = () => {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 w-full overflow-y-auto bg-gray-50 p-6">
          <Outlet /> {/* Aquí se renderiza la página correspondiente */}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
