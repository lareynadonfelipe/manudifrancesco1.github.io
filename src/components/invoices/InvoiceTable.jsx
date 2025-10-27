// src/components/invoices/InvoiceTable.jsx
import React, { useRef, useState } from "react";
import { formatDateAR, isOverdueISO, toISODate } from "../../lib/ocr/dateUtils";
import { CheckCircle, Clock, XCircle, FileText, Paperclip } from 'lucide-react';

export default function InvoiceTable({ facturas, onRowClick, onRowDoubleClick, loading, showEstado = true, onMarkPaid }) {
  const headerScrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const parseISOUnsafe = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0,10) : toISODate(v);
  const getDateISO = (f) =>
    parseISOUnsafe(f.fecha_emision) ||
    parseISOUnsafe(f.fecha_vencimiento) ||
    (f.created_at ? String(f.created_at).slice(0,10) : null);

  const isLoading = Boolean(loading) || facturas == null; // si no hay datos aún, consideramos carga
  const sortedFacturas = [...(facturas || [])].sort((a, b) => {
    const ai = getDateISO(a); const bi = getDateISO(b);
    const ad = ai ? new Date(`${ai}T00:00:00`).getTime() : -Infinity;
    const bd = bi ? new Date(`${bi}T00:00:00`).getTime() : -Infinity;
    return bd - ad; // descendente (más nuevas primero)
  });
  const showEmpty = isLoading || !sortedFacturas || sortedFacturas.length === 0;
  const emptyText = isLoading ? 'Cargando facturas…' : 'No hay facturas que coincidan con los filtros.';
  const getEstado = (f) => {
    if (f?.estado) return f.estado;
    if (isOverdueISO(f?.fecha_vencimiento)) return 'vencida';
    return 'pendiente';
  };
  const estadoClass = (e) => (
    e === 'pagada'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      : e === 'vencida'
      ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  );
  return (
    <div
      className="overflow-x-auto max-h-[60vh]"
      ref={headerScrollRef}
      onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
    >
      <table className="min-w-full text-base table-auto border-collapse">
        <thead
          className={`bg-white sticky top-0 z-10 border-b border-gray-200/60 ${scrolled ? 'shadow-sm' : ''}`}
        >
          <tr className="h-12">
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left w-28">Emisión</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left w-28">Vencimiento</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left w-36">Comprobante</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left w-[420px]">Razón Social</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left w-32">Forma de pago</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-right w-40">Total</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-center w-12">Factura</th>
            <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-center w-12">Comprobante</th>
            {showEstado && <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-center w-28">Estado</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-sm">
          {showEmpty ? (
            <tr>
              <td colSpan={showEstado ? 9 : 8} className="px-3 py-10 text-center text-sm text-gray-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            sortedFacturas.map((f, idx) => (
              <tr
                key={f.id || `${f.numero_factura}-${idx}`}
                className={`h-[52px] cursor-pointer even:bg-gray-50 hover:bg-gray-100 transition-colors`}
                onClick={() => onRowClick && onRowClick(f)}
                onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(f)}
              >
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm">
                  {formatDateAR(f.fecha_emision)}
                </td>
                <td
                  className={`px-4 py-2.5 h-[52px] align-middle text-sm ${
                    isOverdueISO(f.fecha_vencimiento) ? "text-red-600 font-semibold" : ""
                  }`}
                >
                  {formatDateAR(f.fecha_vencimiento)}
                </td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm">{f.tipo_comprobante || "—"}</td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm">{f.razon_social}</td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm">{f.forma_pago || "—"}</td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm text-right">
                  {f.total ? `$ ${Number(f.total).toLocaleString("es-AR")}` : "—"}
                </td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm text-center">
                  {(() => {
                    const hasFactura = Boolean(f.hasFile || f.file_path);
                    return (
                      <FileText
                        size={16}
                        className={`inline-block ${hasFactura ? 'text-emerald-600' : 'text-gray-400'}`}
                        title={hasFactura ? 'Ver factura' : 'Adjuntar factura'}
                        aria-label={hasFactura ? 'Ver factura' : 'Adjuntar factura'}
                      />
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5 h-[52px] align-middle text-sm text-center">
                  {(() => {
                    const hasComp = Boolean(f.hasComprobante || f.comprobante_path);
                    return (
                      <Paperclip
                        size={16}
                        className={`inline-block ${hasComp ? 'text-emerald-600' : 'text-gray-400'}`}
                        title={hasComp ? 'Ver comprobante' : 'Adjuntar comprobante'}
                        aria-label={hasComp ? 'Ver comprobante' : 'Adjuntar comprobante'}
                      />
                    );
                  })()}
                </td>
                {showEstado && (
                  <td className="px-4 py-2.5 h-[52px] align-middle text-sm text-center">
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); onMarkPaid && onMarkPaid(f); }}
                      className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 text-gray-700"
                      title="Marcar como pagada"
                      aria-label="Marcar como pagada"
                    >
                      Pagar
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}