// src/components/facturas/FacturasLocalCard.jsx
// Card que muestra la tabla de facturas guardadas (local)

import React from "react";
import InvoiceTable from "../invoices/InvoiceTable";

export default function FacturasLocalCard({
  title = "Facturas guardadas (local)",
  facturas,
  loading = false,
  onRowClick,            // (factura) => void
  onRowDoubleClick,      // (factura) => void
  footerNote = "Doble click en una fila para subir comprobante.",
  right = null,          // para inyectar botones/acciones a la derecha del header
  className = "",
  // nuevos opcionales
  currentCount,
  totalCount,
  loadedAll = false,
  onLoadMore,
  onLoadAll,
}) {
  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h3 className="text-gray-900 text-base font-semibold">{title}</h3>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="border-t border-gray-200" />

      {/* Toolbar de paginación opcional */}
      {(typeof totalCount === 'number') && (
        <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">
            Mostrando <strong>{currentCount ?? (facturas?.length || 0)}</strong> de <strong>{totalCount}</strong>
          </span>
          {!loadedAll && (
            <>
              {onLoadMore && (
                <button type="button" onClick={onLoadMore} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Cargar 10 más</button>
              )}
              {onLoadAll && (
                <button type="button" onClick={onLoadAll} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Cargar todas</button>
              )}
            </>
          )}
          {loadedAll && (
            <span className="text-xs text-emerald-700">Se están mostrando todas</span>
          )}
        </div>
      )}

      {/* Tabla */}
      <InvoiceTable
        facturas={facturas}
        loading={loading}
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
      />

      {/* Footer */}
      {footerNote ? (
        <div className="px-3 py-2 text-xs text-gray-500">
          {footerNote}
        </div>
      ) : null}
    </div>
  );
}