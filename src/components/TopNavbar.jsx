// src/components/TopNavbar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Truck,
  Sprout,
  Home,
  ShoppingCart,
  Calculator,
  FileText,
  Archive,
  Users,
  ChevronDown,
  Menu as MenuIcon,
  X,
  Search,
} from 'lucide-react';

export default function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Responsive nav: track viewport width and visible nav count
  const [viewportW, setViewportW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [visibleCount, setVisibleCount] = useState(8);

  const calcVisible = (w) => {
    if (w >= 1600) return 9;   // 2xl
    if (w >= 1440) return 8;   // xl
    if (w >= 1280) return 7;   // lg
    if (w >= 1024) return 6;   // md
    return 0; // en <md usamos drawer móvil
  };

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setViewportW(w);
      setVisibleCount(calcVisible(w));
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // --- Global search (inline, navbar input)
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // User menu state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  // Overflow "Más" menu state (for touch/click usability)
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  // Dropdowns de grupos (agro/comercial)
  const [openGroup, setOpenGroup] = useState(null); // 'agro' | 'com' | null
  const navGroupsRef = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  useEffect(() => {
    const onClickOutsideGroups = (e) => {
      if (navGroupsRef.current && !navGroupsRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', onClickOutsideGroups);
    return () => document.removeEventListener('mousedown', onClickOutsideGroups);
  }, []);

  // Sub-bar (breadcrumbs + chips + actions) configurable desde las páginas
  const [subBar, setSubBar] = useState({
    visible: false,
    title: '', // opcional
    breadcrumbs: [], // [{ label, path }]
    chips: [], // [{ id, label, active }]
    actions: [], // [{ id, label, intent: 'primary'|'ghost' }]
  });

  useEffect(() => {
    const onUpdate = (e) => {
      const payload = e.detail || {};
      setSubBar((prev) => ({
        ...prev,
        ...payload,
        visible: payload.visible ?? true,
      }));
    };
    const onClear = () => setSubBar({ visible: false, title: '', breadcrumbs: [], chips: [], actions: [] });
    window.addEventListener('subbar:update', onUpdate);
    window.addEventListener('subbar:clear', onClear);
    return () => {
      window.removeEventListener('subbar:update', onUpdate);
      window.removeEventListener('subbar:clear', onClear);
    };
  }, []);

  const emitChipClick = (chip) => {
    window.dispatchEvent(new CustomEvent('subbar:chipClick', { detail: chip }));
  };

  const emitActionClick = (action) => {
    window.dispatchEvent(new CustomEvent('subbar:actionClick', { detail: action }));
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);


  // --- Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const user = JSON.parse(sessionStorage.getItem('usuario'));

  // --- Nav items
  const baseItems = [
    { label: 'Inicio', icon: Home, path: '/inicio', group: 'Navegación' },
    { label: 'Cosechas', icon: Leaf, path: '/cosechas', group: 'Navegación' },
    { label: 'Camiones', icon: Truck, path: '/camiones', group: 'Navegación' },
    { label: 'Siembras', icon: Sprout, path: '/siembras', group: 'Navegación' },
    { label: 'Contactos', icon: Users, path: '/contactos', group: 'Navegación' },
    { label: 'Stock/Ventas', icon: ShoppingCart, path: '/ventas2', group: 'Navegación' },
    { label: 'Liquidaciones AFIP', icon: FileText, path: '/liquidaciones-afip', group: 'Navegación' },
    { label: 'Facturas', icon: FileText, path: '/facturas', group: 'Navegación' },
    { label: 'Calculadora', icon: Calculator, path: '/calculadora', group: 'Navegación' },
  ];

  const adminItems = [
    { label: 'Planillas Cosechas', icon: FileText, path: '/planillas-cosechas', group: 'Administrador' },
    { label: 'Ingreso Acopios', icon: Archive, path: '/ingreso-acopios', group: 'Administrador' },
  ];

  const fullItems = useMemo(() => {
    const list = [...baseItems];
    if (user?.email === 'manudifrancesco1@gmail.com') list.push(...adminItems);
    return list;
  }, [user]);

  const isActive = (path) => location.pathname === path;
  // Grupos de navegación (desktop)
  const startItem = fullItems.find((i) => i.label === 'Inicio');
  const agroItems = fullItems.filter((i) =>
    ['Cosechas', 'Camiones', 'Siembras', 'Planillas Cosechas', 'Ingreso Acopios'].includes(i.label)
  );
  agroItems.sort((a, b) => {
    const order = ['Cosechas', 'Camiones', 'Siembras', 'Planillas Cosechas', 'Ingreso Acopios'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });
  const commercialItems = fullItems.filter((i) => ['Stock/Ventas', 'Liquidaciones AFIP', 'Facturas', 'Calculadora'].includes(i.label));
  const extraItems = fullItems.filter((i) =>
    !['Inicio', 'Cosechas', 'Camiones', 'Siembras', 'Planillas Cosechas', 'Ingreso Acopios', 'Stock/Ventas', 'Liquidaciones AFIP', 'Facturas', 'Calculadora'].includes(i.label)
  );
  // Active state for "Más" (open or a child route is active)
  const isMoreActive = moreOpen || extraItems.some((i) => isActive(i.path));
  // Active states for grouped triggers and desktop flag
  const isAgroActive = openGroup === 'agro' || agroItems.some((i) => isActive(i.path));
  const isComActive = openGroup === 'com' || commercialItems.some((i) => isActive(i.path));
  const isDesktop = viewportW >= 1024;

  const getInitials = () => {
    if (user?.nombre && typeof user.nombre === 'string') {
      const parts = user.nombre.trim().split(/\s+/);
      return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    }
    if (user?.email && typeof user.email === 'string') {
      const base = user.email.split('@')[0];
      return base.slice(0, 2).toUpperCase();
    }
    return 'IN'; // Invitado
  };

  const handleClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };



  // Global Escape closes dropdowns
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const clearSearch = () => {
    setQuery('');
    window.__GLOBAL_SEARCH_QUERY__ = '';
    window.dispatchEvent(new CustomEvent('global-search', { detail: { query: '', q: '' } }));
  };

  // --- Desktop visible vs overflow (responsive)
  const desktopPrimary = fullItems.slice(0, visibleCount);
  const desktopOverflow = fullItems.slice(visibleCount);


  return (
    <header
      className={`w-full sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-white/90 bg-white ${
        scrolled ? 'shadow-[0_4px_16px_rgba(0,0,0,0.04)] border-white/60' : 'border-transparent'
      }`}
    >
      {/* Top bar */}
      <div className="h-16 px-3 md:px-4 flex items-center gap-4 w-full">
        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <MenuIcon size={22} />
        </button>

        {/* Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none h-full px-3 md:px-4 bg-[#2E8B57] text-white hover:opacity-95 border-r border-emerald-900/15"
          onClick={() => handleClick('/inicio')}
        >
          <Leaf size={26} className="text-white" />
          <span className="text-lg md:text-xl font-semibold leading-tight whitespace-nowrap text-white">
            <span className="sm:hidden">LR·DF</span>
            <span className="hidden sm:inline">La Reina <span className="hidden md:inline">· Don Felipe</span></span>
          </span>
        </div>

        {/* Desktop nav (agrupado) */}
        <nav className="hidden md:flex items-center gap-1 ml-4" ref={navGroupsRef}>
          {/* Inicio (link directo) */}
          {startItem && (
            <button
              onClick={() => handleClick(startItem.path)}
              className={`group flex items-center gap-2 px-3 py-3 text-[15px] md:text-base font-medium transition-all border-b-[3px] ${
                isActive(startItem.path)
                  ? 'text-gray-900 border-[#2E8B57]'
                  : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={startItem.label}
            >
              <startItem.icon size={18} className="transition-transform group-hover:scale-105" />
              <span className="hidden lg:inline whitespace-nowrap">{startItem.label}</span>
            </button>
          )}

          {/* Gestión agropecuaria (dropdown) */}
          {agroItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setOpenGroup((g) => (g === 'agro' ? null : 'agro')); setMoreOpen(false); }}
                className={`group flex items-center gap-2 px-3 py-3 text-[15px] md:text-base font-medium transition-all border-b-[3px] ${
                  isAgroActive ? 'text-gray-900 border-[#2E8B57]' : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-haspopup="menu"
                aria-expanded={openGroup === 'agro'}
              >
                <span className="hidden lg:inline whitespace-nowrap">Gestión agropecuaria</span>
                <ChevronDown size={16} className={`${openGroup === 'agro' ? 'rotate-180 text-gray-900' : 'text-gray-500'} transition-transform`} />
              </button>
              <div className={`absolute top-full left-0 mt-1 min-w-[260px] bg-white border border-gray-200 rounded-md shadow-lg p-1 z-30 ${openGroup === 'agro' ? 'block' : 'hidden'}`}>
                {agroItems.map(({ label, icon: Icon, path }) => (
                  <button
                    key={label}
                    onClick={() => { handleClick(path); setOpenGroup(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b-2 ${
                      isActive(path)
                        ? 'text-gray-900 border-[#2E8B57]'
                        : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gestión comercial (dropdown) */}
          {commercialItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setOpenGroup((g) => (g === 'com' ? null : 'com')); setMoreOpen(false); }}
                className={`group flex items-center gap-2 px-3 py-3 text-[15px] md:text-base font-medium transition-all border-b-[3px] ${
                  isComActive ? 'text-gray-900 border-[#2E8B57]' : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-haspopup="menu"
                aria-expanded={openGroup === 'com'}
              >
                <span className="hidden lg:inline whitespace-nowrap">Gestión comercial</span>
                <ChevronDown size={16} className={`${openGroup === 'com' ? 'rotate-180 text-gray-900' : 'text-gray-500'} transition-transform`} />
              </button>
              <div className={`absolute top-full left-0 mt-1 min-w-[260px] bg-white border border-gray-200 rounded-md shadow-lg p-1 z-30 ${openGroup === 'com' ? 'block' : 'hidden'}`}>
                {commercialItems.map(({ label, icon: Icon, path }) => (
                  <button
                    key={label}
                    onClick={() => { handleClick(path); setOpenGroup(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b-2 ${
                      isActive(path)
                        ? 'text-gray-900 border-[#2E8B57]'
                        : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Más (admin/extra) */}
          {extraItems.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`group flex items-center gap-2 px-3 py-2 text-[15px] md:text-base font-medium transition-all border-b-[3px] ${
                  isMoreActive ? 'text-gray-900 border-[#2E8B57]' : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                }`}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                Más <ChevronDown size={16} className={`${moreOpen ? 'rotate-180 text-gray-900' : 'text-gray-500'} transition-transform`} />
              </button>
              <div className={`absolute top-full left-0 mt-1 min-w-[260px] bg-white border border-gray-200 rounded-md shadow-lg p-1 z-30 ${moreOpen ? 'block' : 'hidden'}`}>
                {extraItems.map(({ label, icon: Icon, path }) => (
                  <button
                    key={label}
                    onClick={() => { handleClick(path); setMoreOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b-2 ${
                      isActive(path)
                        ? 'text-gray-900 border-[#2E8B57]'
                        : 'text-gray-700 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Global Search input */}
          <div className="hidden md:flex items-center gap-2">
            <div className="relative">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  window.__GLOBAL_SEARCH_QUERY__ = val;
                  window.dispatchEvent(new CustomEvent('global-search', { detail: { query: val, q: val } }));
                }}
                placeholder="Buscar…"
                aria-label="Búsqueda global"
                className="w-[180px] md:w-[220px] lg:w-[280px] xl:w-[340px] h-11 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-16 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#235633]/30 focus:bg-white"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={16} />
              {query && (
                <button
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Usuario/Invitado */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="h-9 w-9 rounded-full flex items-center justify-center bg-[#2E8B57] text-white text-sm font-semibold shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title={user?.email || 'Invitado'}
            >
              {getInitials()}
            </button>
            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-50">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {user?.email || 'Invitado'}
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/perfil'); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Perfil
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/configuracion'); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Configuración
                  </button>
                  {user ? (
                    <button
                      onClick={() => {
                        sessionStorage.removeItem('usuario');
                        setUserMenuOpen(false);
                        navigate('/login');
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cerrar sesión
                    </button>
                  ) : (
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/login'); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Ingresar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Sub-bar contextual (breadcrumbs + chips + actions) */}
      {subBar.visible && (
        <div className="w-full border-t border-gray-200/80 bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur">
          <div className="px-3 md:px-4 py-2 flex flex-col md:flex-row md:items-center gap-2 w-full">
            {/* Breadcrumbs + Title */}
            <div className="flex items-center gap-2 text-[13px] text-gray-600">
              {subBar.breadcrumbs && subBar.breadcrumbs.length > 0 ? (
                <nav className="flex items-center flex-wrap gap-1">
                  {subBar.breadcrumbs.map((bc, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-gray-300">/</span>}
                      {bc.path ? (
                        <button onClick={() => navigate(bc.path)} className="hover:text-gray-900">{bc.label}</button>
                      ) : (
                        <span className="text-gray-700">{bc.label}</span>
                      )}
                    </span>
                  ))}
                </nav>
              ) : (
                subBar.title && <div className="font-medium text-gray-800">{subBar.title}</div>
              )}
            </div>

            {/* Chips */}
            {subBar.chips && subBar.chips.length > 0 && (
              <div className="md:ml-4 flex items-center flex-wrap gap-1.5">
                {subBar.chips.map((chip) => (
                  <button
                    key={chip.id ?? chip.label}
                    onClick={() => emitChipClick(chip)}
                    className={`h-7 px-2.5 rounded-full border text-xs transition-colors ${
                      chip.active
                        ? 'bg-emerald-50 text-[#2E8B57] border-emerald-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            {subBar.actions && subBar.actions.length > 0 && (
              <div className="md:ml-auto flex items-center gap-2">
                {subBar.actions.map((action) => (
                  <button
                    key={action.id ?? action.label}
                    onClick={() => emitActionClick(action)}
                    className={`h-8 px-3 rounded-md text-sm transition-colors ${
                      action.intent === 'primary'
                        ? 'bg-[#2E8B57] text-white hover:opacity-95'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur shadow-lg rounded-b-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Leaf size={22} className="text-[#235633]" />
                <span className="text-base font-semibold">La Reina · Don Felipe</span>
              </div>
              <button className="p-2 rounded hover:bg-gray-100" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>
            {/* Mobile search */}
            <div className="mb-2">
              <input
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  window.__GLOBAL_SEARCH_QUERY__ = val;
                  window.dispatchEvent(new CustomEvent('global-search', { detail: { query: val, q: val } }));
                }}
                placeholder="Buscar en toda la app…"
                aria-label="Búsqueda global"
                className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#235633]/30 focus:bg-white"
              />
            </div>
            <nav className="max-h-[70vh] overflow-y-auto">
              {fullItems.map(({ label, icon: Icon, path }) => (
                <button
                  key={label}
                  onClick={() => handleClick(path)}
                  className={`w-full flex items-center gap-3 px-2 py-3 rounded-md text-left ${
                    isActive(path) ? 'bg-green-50 text-[#235633]' : 'hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

    </header>
  );
}