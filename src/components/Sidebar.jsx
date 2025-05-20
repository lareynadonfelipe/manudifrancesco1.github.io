import {
  Leaf,
  Truck,
  Sprout,
  Menu,
  Home,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Inicio", icon: <Home size={22} />, path: "/inicio" },
    { label: "Cosechas", icon: <Leaf size={22} />, path: "/cosechas" },
    { label: "Camiones", icon: <Truck size={22} />, path: "/camiones" },
    { label: "Siembras", icon: <Sprout size={22} />, path: "/siembras" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setCollapsed(true);
  };

  return (
    <aside
      className={`bg-[#235633] text-white h-full flex flex-col transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-64"
      }`}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {!collapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <Sprout size={28} className="text-white" />
            <div className="leading-tight">
              <div className="text-xl font-bold tracking-tight">La Reina</div>
              <div className="text-sm text-white/80 -mt-1">Don Felipe</div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="text-white/80 hover:text-white ml-1 mt-1"
          >
            <Menu size={20} />
          </button>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-white/80 hover:text-white"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav
        className={`flex flex-col gap-1 px-2 pt-2 pb-4 ${
          collapsed ? "items-center" : ""
        }`}
      >
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNavigation(item.path)}
            className={`group relative flex items-center gap-3 py-2 px-3 w-full rounded-md hover:bg-white/10 text-sm font-medium transition ${
              collapsed ? "justify-center" : "justify-start"
            } ${location.pathname === item.path ? "bg-white/10" : ""}`}
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
  );
};

export default Sidebar;
