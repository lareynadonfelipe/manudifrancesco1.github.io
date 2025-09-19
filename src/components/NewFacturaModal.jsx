// src/components/NewFacturaModal.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export default function NewFacturaModal({
  open,
  onClose,
  onCreated, // callback(invoiceRow)
}) {
  const [submitting, setSubmitting] = useState(false);

  const [facturaFile, setFacturaFile] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);

  // Campos editables que se confirman en el modal
  const [fechaEmision, setFechaEmision] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [comprobanteNro, setComprobanteNro] = useState("");
  const [importeTotal, setImporteTotal] = useState("");

  // Estado de pago (si suben comprobante lo marcamos como pagado, si no: pendiente)
  const estadoPago = comprobanteFile ? "pagado" : "pendiente";

  useEffect(() => {
    if (!open) {
      // reset al cerrar
      setSubmitting(false);
      setFacturaFile(null);
      setComprobanteFile(null);
      setFechaEmision("");
      setRazonSocial("");
      setCuit("");
      setComprobanteNro("");
      setImporteTotal("");
    }
  }, [open]);

  if (!open) return null;

  const uploadToBucket = async (bucket, path, file) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!facturaFile) {
        alert("Subí el archivo de la factura.");
        return;
      }
      setSubmitting(true);

      const uid = crypto.randomUUID();
      const facturaPath = `${uid}/${encodeURIComponent(facturaFile.name)}`;
      const facturaUrl = await uploadToBucket("facturas", facturaPath, facturaFile);

      let comprobanteUrl = null;
      if (comprobanteFile) {
        const compPath = `${uid}/${encodeURIComponent(comprobanteFile.name)}`;
        comprobanteUrl = await uploadToBucket("comprobantes", compPath, comprobanteFile);
      }

      // Lo que se guarda es exactamente lo que está en el modal:
      const payload = {
        fecha_emision: fechaEmision || null, // formato ISO "YYYY-MM-DD"
        razon_social: razonSocial || null,
        cuit: cuit || null,
        comprobante_nro: comprobanteNro || null,
        importe_total: importeTotal ? Number(importeTotal) : null,
        factura_url: facturaUrl,
        comprobante_url: comprobanteUrl,
        estado_pago: estadoPago, // "pendiente" | "pagado"
      };

      const { data, error } = await supabase.from("facturas").insert(payload).select().single();
      if (error) throw error;

      onCreated?.(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la factura. Revisá consola para más detalle.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <h2 className="mb-3 text-xl font-semibold">Nueva factura</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Archivos */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Archivo de factura (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)}
              required
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Comprobante de pago (opcional)
            </label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
              className="w-full rounded border p-2"
            />
          </div>
        </div>

        {/* Campos editables (lo que se confirma es lo que se guarda) */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha de emisión</label>
            <input
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Razón social</label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Ej: LINZOAIN HORACIO ANTONIO"
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">CUIT</label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="Ej: 20-12345678-3"
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Comprobante N°</label>
            <input
              type="text"
              value={comprobanteNro}
              onChange={(e) => setComprobanteNro(e.target.value)}
              placeholder="Ej: A-0001-00001234"
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Importe total</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={importeTotal}
              onChange={(e) => setImporteTotal(e.target.value)}
              placeholder="Ej: 125000.00"
              className="w-full rounded border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Estado (auto)</label>
            <input
              type="text"
              disabled
              value={estadoPago}
              className="w-full rounded border bg-gray-100 p-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se marca “pagado” si adjuntás comprobante; si no, queda “pendiente”.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Confirmar y guardar"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}