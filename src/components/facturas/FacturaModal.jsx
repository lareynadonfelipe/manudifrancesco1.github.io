// src/components/facturas/FacturaModal.jsx
// Modal para revisar/editar los datos extraídos por OCR

import React, { useEffect, useMemo, useState } from "react";
import {
  formatDateAR,
  toISODate,
  reconcileOcrDates,
  normalizeDigits,
} from "../../lib/ocr/dateUtils";

export default function FacturaModal({
  open = false,
  initialData = {
    razon_social: "",
    cuit: "",
    tipo_factura: "",
    fecha_emision: "",
    fecha_vencimiento: "",
    numero_factura: "",
    importe_total: "",
  },
  onSave,     // (data) => void
  onCancel,   // () => void
  title = "Revisá y confirmá los datos de la factura",
}) {
  const [data, setData] = useState(initialData);

  // Sincronizar al abrir/cambiar initialData
  useEffect(() => {
    setData(initialData || {});
  }, [initialData, open]);

  // Helpers de fechas (formar dd/mm/aaaa respetando heurísticas)
  const emisionISO = useMemo(() => toISODate(data.fecha_emision), [data.fecha_emision]);
  const vencISO = useMemo(() => toISODate(data.fecha_vencimiento), [data.fecha_vencimiento]);

  const reconciled = useMemo(() => {
    const { emision, venc } = reconcileOcrDates(data.fecha_emision, data.fecha_vencimiento);
    return {
      emision: emision ? formatDateAR(emision) : data.fecha_emision,
      venc: venc ? formatDateAR(venc) : data.fecha_vencimiento,
    };
  }, [data.fecha_emision, data.fecha_vencimiento]);

  const handleTipo = (t) => setData((d) => ({ ...d, tipo_factura: t }));

  const handleSave = () => {
    const payload = {
      ...data,
      // normalizar fechas a dd/mm/aaaa por consistencia UI
      fecha_emision: reconciled.emision || data.fecha_emision,
      fecha_vencimiento: reconciled.venc || data.fecha_vencimiento,
      // importe_total deja string normalizado (no tocamos aquí para no sorprender)
    };
    onSave && onSave(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl border"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 rounded hover:bg-gray-100"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Razón Social</span>
              <input
                value={data.razon_social || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, razon_social: e.target.value }))
                }
                className="w-full border rounded px-2 py-1"
              />
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">CUIT</span>
              <input
                value={data.cuit || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, cuit: normalizeDigits(e.target.value) }))
                }
                className="w-full border rounded px-2 py-1"
              />
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Tipo de factura</span>
              <div className="flex gap-2">
                {["A", "B", "C"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTipo(t)}
                    className={`px-3 py-1 rounded border text-sm ${
                      data.tipo_factura === t
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    aria-pressed={data.tipo_factura === t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Número de factura</span>
              <input
                value={data.numero_factura || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, numero_factura: e.target.value }))
                }
                className="w-full border rounded px-2 py-1"
              />
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Fecha de emisión</span>
              <input
                value={reconciled.emision || data.fecha_emision || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, fecha_emision: e.target.value }))
                }
                className="w-full border rounded px-2 py-1"
                placeholder="dd/mm/aaaa"
              />
              {emisionISO && (
                <div className="mt-1 text-[11px] text-gray-500">
                  ISO: {emisionISO}
                </div>
              )}
            </label>

            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Fecha de vencimiento</span>
              <input
                value={reconciled.venc || data.fecha_vencimiento || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, fecha_vencimiento: e.target.value }))
                }
                className="w-full border rounded px-2 py-1"
                placeholder="dd/mm/aaaa"
              />
              {vencISO && (
                <div className="mt-1 text-[11px] text-gray-500">
                  ISO: {vencISO}
                </div>
              )}
            </label>

            <label className="text-sm md:col-span-2">
              <span className="block text-gray-600 mb-1">Importe total</span>
              <input
                value={data.importe_total || ""}
                onChange={(e) =>
                  setData((d) => ({ ...d, importe_total: e.target.value }))
                }
                className="w-full border rounded px-2 py-1"
                placeholder="0,00"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}