import React from 'react';
import { Home, Leaf, Truck, Sprout } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MobileNav() {
  const navigate = useNavigate();
  const loc = useLocation().pathname;
  const items = [
    { icon: <Home size={24} />,   path: '/inicio' },
    { icon: <Leaf size={24} />,   path: '/cosechas' },
    { icon: <Truck size={24} />,  path: '/camiones' },
    { icon: <Sprout size={24} />, path: '/siembras' },
  ];

  return (
    <nav
      className="
        fixed bottom-4 left-1/2 transform -translate-x-1/2
        w-[90%] bg-white/80 backdrop-blur-md
        rounded-full shadow-lg z-10
        flex justify-around items-center py-1
        pointer-events-auto md:hidden
      "
    >
      {items.map(item => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={`
            flex items-center justify-center
            focus:outline-none
            ${loc === item.path
              ? 'text-green-600'
              : 'text-gray-500 hover:text-green-500'}
          `}
          style={{ minWidth: 56, minHeight: 56 }}
          aria-label={item.path.replace('/', '')}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}
