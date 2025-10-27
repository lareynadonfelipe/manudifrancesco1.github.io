// src/components/facturas/FacturaActionsBar.jsx
import React from "react";
import { Filter } from "lucide-react";

export default function FacturaActionsBar({
  title = "Facturas",
  onClickLeerMails,
  onClickCargarFactura,
  onClickFiltrar,
  loading = false,
  right = null, // por si querés inyectar algo a la derecha
  className = "",
}) {
  return (
    <div className={`px-4 py-3 bg-white/70 border-b border-gray-200/60 backdrop-blur flex items-center justify-between ${className}`}>
      <h3 className="text-gray-900 text-lg font-semibold">{title}</h3>
      <div className="flex items-center gap-2">
        {onClickLeerMails && (
          <button
            type="button"
            onClick={onClickLeerMails}
            className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
          >
            Leer mails
          </button>
        )}
        {onClickCargarFactura && (
          <button
            type="button"
            onClick={onClickCargarFactura}
            disabled={loading}
            className={`px-4 py-2 rounded-md shadow-sm transition text-white text-base font-semibold ${
              loading ? "bg-emerald-600 opacity-60 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Leyendo…
              </span>
            ) : (
              "Cargar factura"
            )}
          </button>
        )}
        {onClickFiltrar && (
          <button
            type="button"
            onClick={onClickFiltrar}
            className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
            title="Filtrar"
          >
            <Filter className="w-5 h-5" />
          </button>
        )}
        {right}
      </div>
    </div>
  );
}