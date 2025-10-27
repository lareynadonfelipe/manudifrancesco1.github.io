// src/pages/Inicio.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Leaf, Truck, Sprout, ShoppingCart, FileText, Calculator, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Inicio() {
  const navigate = useNavigate();
  // === Global search integration ===
  const [query, setQuery] = useState(typeof window !== "undefined" ? (window.__GLOBAL_SEARCH_QUERY__ || "") : "");

  useEffect(() => {
    const onGlobalSearch = (e) => {
      setQuery(e?.detail?.q ?? "");
    };
    window.addEventListener("global-search", onGlobalSearch);
    return () => window.removeEventListener("global-search", onGlobalSearch);
  }, []);
  const pages = [
    // Gestión agropecuaria
    { label: 'Cosechas', icon: Leaf, path: '/cosechas', description: 'Gestión de lotes cosechados y rendimiento.', group: 'Producción' },
    { label: 'Camiones', icon: Truck, path: '/camiones', description: 'Registro de transporte por lote y destino.', group: 'Producción' },
    { label: 'Siembras', icon: Sprout, path: '/siembras', description: 'Registro de siembras por campaña y lote.', group: 'Producción' },

    // Gestión comercial
    { label: 'Stock/Ventas', icon: ShoppingCart, path: '/ventas2', description: 'Gestión de stock, ventas y clientes.', group: 'Gestión Comercial' },
    { label: 'Liquidaciones AFIP', icon: FileText, path: '/liquidaciones-afip', description: 'Gestión y registro de liquidaciones AFIP.', group: 'Gestión Comercial' },
    { label: 'Facturas', icon: FileText, path: '/facturas', description: 'Administrador de facturas con OCR y comprobantes.', group: 'Gestión Comercial' },
    { label: 'Calculadora', icon: Calculator, path: '/calculadora', description: 'Herramientas de cálculo agrícola.', group: 'Gestión Comercial' },

    // Otros
    { label: 'Contactos', icon: Sprout, path: '/contactos', description: 'Gestión de contactos y clientes.', group: 'Más' },
  ];

  const visiblePages = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return pages;
    return pages.filter((p) => {
      const label = (p.label || "").toLowerCase();
      const desc  = (p.description || "").toLowerCase();
      return label.includes(q) || desc.includes(q);
    });
  }, [pages, query]);

  const allGroups = ['Producción', 'Gestión Comercial', 'Más'];
  const [openGroups, setOpenGroups] = useState(() => {
    return Object.fromEntries(allGroups.map(g => [g, true]));
  });
  const toggleGroup = (g) => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
    if (!isMobile) return; // keep open on desktop
    setOpenGroups((s) => ({ ...s, [g]: !s[g] }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => {
      setOpenGroups(Object.fromEntries(allGroups.map(g => [g, true])));
    };
    // Listen to changes between mobile and desktop
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="w-full min-h-screen pb-12 px-2">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-700">Inicio</h1>
      </div>
      <div className="space-y-8">
        {allGroups.map((group) => {
          const groupPages = visiblePages.filter((p) => p.group === group);
          if (groupPages.length === 0) return null;
          const isOpen = openGroups[group];
          return (
            <div key={group} className="space-y-3">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => toggleGroup(group)}
                aria-expanded={isOpen}
                aria-controls={`section-${group.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <h2 className="text-xl font-semibold text-gray-700 border-b border-gray-200 pb-1 flex-1">
                  {group}
                </h2>
                <ChevronRight
                  className={`ml-3 transition-transform ${isOpen ? 'rotate-90' : 'rotate-0'} text-gray-500`}
                  size={18}
                />
              </button>
              {isOpen && (
                <div id={`section-${group.replace(/\s+/g, '-').toLowerCase()}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {groupPages.map((page) => {
                    const Icon = page.icon;
                    return (
                      <div
                        key={page.label}
                        onClick={() => navigate(page.path)}
                        className="group cursor-pointer rounded-lg border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black hover:bg-gray-50 hover:shadow-md active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-black/10 flex flex-col gap-3"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(page.path); } }}
                        aria-label={page.label}
                      >
                        <div className="flex items-center gap-3 text-black">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                            <Icon size={20} />
                          </div>
                          <h3 className="text-base font-medium text-gray-700">{page.label}</h3>
                          <ChevronRight size={18} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-gray-600 text-sm leading-6">{page.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {visiblePages.length === 0 && (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-6">
            No hay resultados para “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/TopNavbar.jsx
// (only the brand label part is shown with changes applied)
<span className="font-semibold tracking-wide truncate max-w-[150px] sm:max-w-none text-xs sm:text-sm md:text-base">
  La Reina – Don Felipe
</span>
