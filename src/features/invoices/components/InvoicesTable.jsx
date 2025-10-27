// src/features/invoices/components/InvoicesTable.jsx
import React, { useRef, useState } from "react";
import ComprobantesModal from "./ComprobantesModal";
import { daysUntil, fmtMoney } from "../utiles/dateMoney";

const fmtDateAR = (s) => {
  if (!s) return "-";
  const str = String(s);
  // yyyy-mm-dd -> dd/mm/yyyy
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // ya viene en dd/mm/aaaa u otro formato: devolver tal cual
  return str;
};

function StateBadge({ state }) {
  const map = {
    POR_PAGAR: "bg-blue-100 text-blue-800 border-blue-200",
    VENCIDA: "bg-red-100 text-red-800 border-red-200",
    PAGADA: "bg-green-100 text-green-800 border-green-200",
    PARCIAL: "bg-amber-100 text-amber-800 border-amber-200",
  };
  const key = (state || "").toString().toUpperCase();
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${map[key] || "bg-slate-100"}`}>
      {key || "-"}
    </span>
  );
}

function SortHeader({ label, col, activeCol, dir = "asc", onChange }) {
  const isActive = activeCol === col;
  const nextDir = isActive && dir === "asc" ? "desc" : "asc";
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 select-none text-xs"
      onClick={() => onChange?.(col, nextDir)}
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
      title={`Ordenar por ${label} (${isActive ? (dir === "asc" ? "↓" : "↑") : "↓"})`}
    >
      <span className="uppercase tracking-wide">{label}</span>
      <span className="inline-flex h-3.5 w-3.5">
        {isActive ? (
          dir === "asc" ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 14l-5-6h10l-5 6z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6l5 6H5l5-6z"/></svg>
          )
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="opacity-40"><path d="M10 14l-5-6h10l-5 6z"/></svg>
        )}
      </span>
    </button>
  );
}

export default function InvoicesTable({
  rows,
  loading,
  onView,
  page,
  pageSize,
  total,
  onPageChange,
  headerLeft,
  headerRight,
  footerLeft,
  onFooterNext,
  onFooterPrev,
  selectedId,
  onSelect,
  onAttachFactura,
  onAttachComprobante,
  onViewComprobante,
  onDeleteComprobante,
  onOpenComprobantes,
  sort,
  onSortChange,
}) {
  const canPrev = page > 1;
  const canNext = page * pageSize < (total || 0);
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [openCompMenuId, setOpenCompMenuId] = useState(null);
  const [openCompMenuPos, setOpenCompMenuPos] = useState({ x: 0, y: 0, anchorRight: false });
  const [compChooser, setCompChooser] = useState({ open: false, row: null });
  const DEBUG = true; // logs de diagnóstico

  return (
    <div className="inline-block max-w-full rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
      {/* Header adosado al card */}
      {(headerLeft || headerRight) && (
        <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200/60 bg-white/70 backdrop-blur">
          <div className="flex items-center gap-3">{headerLeft}</div>
          <div className="flex items-center gap-2">{headerRight}</div>
        </div>
      )}
      <div
        className="overflow-auto max-h-[60vh]"
        ref={scrollRef}
        onScroll={(e) => { setScrolled(e.currentTarget.scrollTop > 0); setOpenCompMenuId(null); }}
      >
        <table className="table-auto text-[14px]">
          <thead className={`bg-white sticky top-0 z-10 border-b border-gray-200/60 ${scrolled ? "shadow-sm" : ""}`}>
            <tr className="h-12">
              <Th className="text-center">Comprobante</Th>
              <Th>
                <SortHeader
                  label="Proveedor"
                  col="proveedor"
                  activeCol={sort?.column}
                  dir={sort?.direction || "asc"}
                  onChange={onSortChange}
                />
              </Th>
              <Th>
                <SortHeader
                  label="Emisión"
                  col="emision"
                  activeCol={sort?.column}
                  dir={sort?.direction || "asc"}
                  onChange={onSortChange}
                />
              </Th>
              <Th>
                <SortHeader
                  label="Vencimiento"
                  col="vencimiento"
                  activeCol={sort?.column}
                  dir={sort?.direction || "asc"}
                  onChange={onSortChange}
                />
              </Th>
              <Th>Moneda</Th>
              <Th className="text-right">IVA</Th>
              <Th className="text-right">
                <SortHeader
                  label="Total"
                  col="total"
                  activeCol={sort?.column}
                  dir={sort?.direction || "asc"}
                  onChange={onSortChange}
                />
              </Th>
              <Th>Estado</Th>
              <Th className="text-center text-[11px] leading-tight">Factura</Th>
              <Th className="text-center text-[11px] leading-tight">Comprobante</Th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && (!rows || rows.length === 0) && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  Sin resultados
                </td>
              </tr>
            )}
            {!loading &&
              rows?.map((r) => {
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect?.(r)}
                    onDoubleClick={() => onView?.(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onView?.(r);
                      if (e.key === ' ') { e.preventDefault(); onSelect?.(r); }
                      if (e.key === 'Escape') setOpenCompMenuId(null);
                    }}
                    tabIndex={0}
                    role="button"
                    className={`h-[44px] border-b border-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      selectedId === r.id ? 'bg-emerald-50' : 'even:bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Td>
                      {(() => {
                        const tipo = (r.tipoFactura || r.tipo_factura || "").toString().toUpperCase();
                        const num = (r.numero || r.numeroFactura || r.numero_factura || "").toString();
                        if (!tipo && !num) return "-";
                        return (
                          <div className="flex items-center gap-2">
                            {tipo && (
                              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded border border-gray-300 bg-gray-50">
                                {tipo}
                              </span>
                            )}
                            <span className="font-medium tabular-nums">{num || "-"}</span>
                          </div>
                        );
                      })()}
                    </Td>
                    <Td>
                      <div className="flex flex-col leading-tight">
                        <span>{r.proveedor || r.razonSocial || r.razon_social || "-"}</span>
                        {(r.cuit || r.categoria) && (
                          <span className="text-xs text-gray-500">
                            {r.cuit ? `CUIT ${r.cuit}` : ""}{r.cuit && r.categoria ? " · " : ""}{r.categoria || ""}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>{fmtDateAR(r.emisionFecha || r.fecha_emision || r.fechaEmision)}</Td>
                    <Td>
                      {(() => {
                        const vto = r.vencimientoFecha || r.fecha_vencimiento || r.fechaVencimiento || null;
                        const d = vto ? daysUntil(vto) : null;
                        const semaforo =
                          r.estado === "VENCIDA" || (d != null && d < 0)
                            ? "text-red-600"
                            : d != null && d <= 7
                            ? "text-amber-600"
                            : "text-gray-700";
                        return <span className={semaforo}>{fmtDateAR(vto)}</span>;
                      })()}
                    </Td>
                    <Td>{r.moneda || r.currency || "ARS"}</Td>
                    <Td className="text-right">
                      <span className="tabular-nums">{fmtMoney(r.iva ?? 0)}</span>
                    </Td>
                    <Td className="text-right">
                      <span className="tabular-nums font-medium">
                        {fmtMoney(r.total ?? r.importe_total ?? r.montoTotal ?? 0)}
                      </span>
                    </Td>
                    <Td>
                      <StateBadge state={r.estado} />
                    </Td>
                    <Td className="text-center py-0.5">
                      <div className="flex justify-center gap-1.5">
                        <div className="relative inline-block group">
                          {(() => {
                            const hasFactura = r?.hasFactura === true;
                            return hasFactura ? (
                              <button
                                className="relative inline-flex items-center justify-center h-8 w-8 rounded text-emerald-600 hover:text-emerald-700 focus:outline-none"
                                onClick={(e) => { e.stopPropagation(); onView?.(r); }}
                                onDoubleClick={(e) => e.stopPropagation()}
                                aria-label="Ver factura"
                                title="Ver factura"
                              >
                                <DocIcon className="h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                className="relative inline-flex items-center justify-center h-8 w-8 rounded text-gray-400 hover:text-gray-500 focus:outline-none"
                                onClick={(e) => { e.stopPropagation(); onAttachFactura?.(r); }}
                                onDoubleClick={(e) => e.stopPropagation()}
                                aria-label="Adjuntar factura"
                                title="Adjuntar factura"
                              >
                                <DocIcon className="h-5 w-5" />
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-center py-0.5">
                      <div className="relative inline-block group">
                        {r.hasComprobante ? (
                          <>
                            <button
                              className="relative inline-flex items-center justify-center h-8 w-8 rounded text-emerald-600 hover:text-emerald-700 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenComprobantes) onOpenComprobantes(r); else setCompChooser({ open: true, row: r });
                              }}
                              onDoubleClick={(e) => e.stopPropagation()}
                              aria-label={`Ver comprobantes (${r.compCount || 1})`}
                              title={`Ver comprobantes (${r.compCount || 1})`}
                            >
                              <DocIcon className="h-5 w-5" />
                              {(r.compCount || 1) > 1 && (
                                <span className="absolute -top-1 -right-1 min-w-[14px] px-1 rounded-full bg-gray-200 text-gray-700 text-[10px] leading-4 text-center">
                                  {r.compCount}
                                </span>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            className="relative inline-flex items-center justify-center h-8 w-8 rounded text-gray-400 hover:text-gray-500 focus:outline-none"
                            onClick={(e) => { e.stopPropagation(); onAttachComprobante?.(r); }}
                            onDoubleClick={(e) => e.stopPropagation()}
                            aria-label="Cargar comprobante"
                            title="Cargar comprobante"
                          >
                            <DocIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <ComprobantesModal
        open={compChooser.open}
        row={compChooser.row}
        onClose={() => setCompChooser({ open: false, row: null })}
        onView={(idx, comp) => {
          onViewComprobante?.(compChooser.row, idx, comp);
          setCompChooser({ open: false, row: null });
        }}
        onDelete={(idx, comp) => onDeleteComprobante?.(compChooser.row, idx, comp)}
        onAttach={() => onAttachComprobante?.(compChooser.row)}
      />
      {/* Footer adosado al card (estilo igual al card) */}
      {footerLeft && (
        <div className="px-3 py-2 flex items-center justify-between text-sm border-t border-gray-200/60 bg-white/70 backdrop-blur">
          <div className="flex items-center gap-2">
            {footerLeft}
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            {(() => {
              if (loading) return <span>Cargando…</span>;
              const start = total ? Math.min((page - 1) * pageSize + 1, total) : 0;
              const end = total ? Math.min(page * pageSize, total) : 0;
              return <span>{total ? `${start} - ${end} de ${total}` : `0 de 0`}</span>;
            })()}
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onFooterPrev?.()}
              disabled={loading || page <= 1}
              aria-label="Anterior"
              title="Anterior"
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => onFooterNext?.()}
              disabled={loading || (page * pageSize >= (total || 0))}
              aria-label="Siguiente página"
              title="Siguiente página"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className }) {
  return (
    <th
      className={`px-3 py-2 text-xs uppercase tracking-wide text-gray-600 text-left select-none ${
        className || ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }) {
  return <td className={`px-3 py-1.5 align-middle whitespace-nowrap ${className || ""}`}>{children}</td>;
}

// --- Minimal file icons and badge for action cells ---
function DocIcon({ className = "h-5 w-5" }) {
  // Minimal outline document with folded corner (not a folder)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function ClipIcon({ className = "h-5 w-5" }) {
  // Simple outline paperclip icon
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
    </svg>
  );
}


function PlusBadge() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M10 4.5a.75.75 0 01.75.75v4h4a.75.75 0 010 1.5h-4v4a.75.75 0 01-1.5 0v-4h-4a.75.75 0 010-1.5h4v-4A.75.75 0 0110 4.5z" />
      </svg>
    </span>
  );
}
