// src/components/facturas/FacturaFiltersModal.jsx
import React, { useEffect, useState } from "react";

export default function FacturaFiltersModal({
  open = false,
  initial = {
    estado: "apagar",         // 'apagar' | 'pagada' | 'todas'
    proveedor: "",            // razón social
    cuit: "",
    vencDesde: "",
    vencHasta: "",
    minImporte: "",
    maxImporte: "",
  },
  onApply,   // (filters) => void
  onClose,   // () => void
  title = "Filtros de facturas",
}) {
  const [f, setF] = useState(initial);

  useEffect(() => {
    if (open) setF(initial || {});
  }, [open, initial]);

  if (!open) return null;

  const apply = () => {
    onApply && onApply(f);
    onClose && onClose();
  };

  const clear = () => {
    const cleared = {
      estado: "todas",
      proveedor: "",
      cuit: "",
      vencDesde: "",
      vencHasta: "",
      minImporte: "",
      maxImporte: "",
    };
    setF(cleared);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-gray-100"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-1 gap-4">
          {/* Estado tabs */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Estado</div>
            <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
              {[
                { k: "apagar", label: "A pagar" },
                { k: "pagada", label: "Pagadas" },
                { k: "todas",  label: "Todas" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setF((p) => ({ ...p, estado: opt.k }))}
                  className={
                    "px-3 py-1.5 text-sm border-r last:border-r-0 " +
                    (f.estado === opt.k
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white hover:bg-gray-50")
                  }
                  aria-pressed={f.estado === opt.k}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Texto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Razón social</span>
              <input
                value={f.proveedor || ""}
                onChange={(e) => setF((p) => ({ ...p, proveedor: e.target.value }))}
                className="w-full border rounded px-2 py-1"
                placeholder="Ej: ACME S.A."
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">CUIT</span>
              <input
                value={f.cuit || ""}
                onChange={(e) => setF((p) => ({ ...p, cuit: e.target.value }))}
                className="w-full border rounded px-2 py-1"
                placeholder="Sin guiones"
              />
            </label>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Vencimiento desde</span>
              <input
                type="date"
                value={f.vencDesde || ""}
                onChange={(e) => setF((p) => ({ ...p, vencDesde: e.target.value }))}
                className="w-full border rounded px-2 py-1"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Vencimiento hasta</span>
              <input
                type="date"
                value={f.vencHasta || ""}
                onChange={(e) => setF((p) => ({ ...p, vencHasta: e.target.value }))}
                className="w-full border rounded px-2 py-1"
              />
            </label>
          </div>

          {/* Importes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Importe mínimo</span>
              <input
                inputMode="decimal"
                value={f.minImporte || ""}
                onChange={(e) => setF((p) => ({ ...p, minImporte: e.target.value }))}
                className="w-full border rounded px-2 py-1"
                placeholder="0,00"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Importe máximo</span>
              <input
                inputMode="decimal"
                value={f.maxImporte || ""}
                onChange={(e) => setF((p) => ({ ...p, maxImporte: e.target.value }))}
                className="w-full border rounded px-2 py-1"
                placeholder="0,00"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={clear}
            className="px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 text-gray-700"
          >
            Limpiar filtros
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}