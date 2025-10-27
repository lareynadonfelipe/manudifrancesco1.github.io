// src/lib/ocr/OcrConfirmModal.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import OcrPreviewPane from "@/lib/ocr/OcrPreviewPane";
import { toISODate, formatDateAR } from "@/lib/ocr/dateUtils";

function cleanAmount(v) {
  if (v == null) return "";
  return String(v).replace(/\s+/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
}
function formatAmountPretty(v) {
  const n = Number(cleanAmount(v));
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatCurrencyAR(n) {
  const v = Number(cleanAmount(n));
  if (Number.isNaN(v)) return "$ 0,00";
  return "$ " + v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OcrConfirmModal({
  isOpen,
  onClose,
  onSubmit,
  cargando = false,
  file,
  filePreviewUrl,
  facturaId,
  // controlled fields
  fechaEmision, setFechaEmision,
  razonSocial, setRazonSocial,
  cuit, setCuit,
  numeroFactura, setNumeroFactura,
  importeNetoGravado, setImporteNetoGravado,
  importeTotal, setImporteTotal,
  tipoFactura, setTipoFactura,
  formaPago, setFormaPago,
  categoria, setCategoria,
  categoriasAgro = [],
  fechaVencimiento, setFechaVencimiento,
  formErrors = {},
}) {
  const [comps, setComps] = useState([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compUploading, setCompUploading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isOpen || !facturaId) return;
      setCompLoading(true);
      try {
        const { data, error } = await supabase
          .from('comprobantes')
          .select('id, file_path, created_at')
          .eq('factura_id', facturaId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setComps(data || []);
      } catch (e) {
        console.error('fetch comprobantes', e);
        setComps([]);
      } finally {
        setCompLoading(false);
      }
    }
    load();
  }, [isOpen, facturaId]);

  function triggerAttachComprobante() {
    const inp = document.getElementById('modal-comprobante-file-input');
    if (inp) inp.click();
  }

  async function handlePickedComprobante(e) {
    const theFile = e.target.files?.[0];
    e.target.value = '';
    if (!theFile || !facturaId) return;
    try {
      setCompUploading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sin usuario');

      const path = `${user.id}/${facturaId}/${Date.now()}_${theFile.name}`;
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, theFile, { upsert: false });
      if (upErr) throw upErr;

      const file_path = `comprobantes/${path}`;
      const { error: insErr } = await supabase.from('comprobantes').insert({ factura_id: facturaId, file_path });
      if (insErr) throw insErr;

      const { data } = await supabase
        .from('comprobantes')
        .select('id, file_path, created_at')
        .eq('factura_id', facturaId)
        .order('created_at', { ascending: false });
      setComps(data || []);
    } catch (err) {
      console.error('Adjuntar comprobante (modal)', err);
      alert('No se pudo adjuntar el comprobante.');
    } finally {
      setCompUploading(false);
    }
  }

  async function handleDeleteComprobante(comp) {
    if (!comp?.id) return;
    const ok = window.confirm('¿Eliminar este comprobante?');
    if (!ok) return;
    try {
      let objectPath = String(comp.file_path || '')
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^comprobantes\//i, '');
      if (objectPath && !objectPath.startsWith('http')) {
        await supabase.storage.from('comprobantes').remove([objectPath]);
      }
      const { error: delErr } = await supabase.from('comprobantes').delete().eq('id', comp.id);
      if (delErr) throw delErr;
      setComps((prev) => prev.filter((c) => c.id !== comp.id));
    } catch (err) {
      console.error('Eliminar comprobante', err);
      alert('No se pudo eliminar.');
    }
  }

  async function handleViewComprobante(comp) {
    try {
      let objectPath = String(comp.file_path || '')
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^comprobantes\//i, '');
      const { data: s, error: sErr } = await supabase.storage.from('comprobantes').createSignedUrl(objectPath, 3600);
      if (sErr) throw sErr;
      if (s?.signedUrl) window.open(s.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Ver comprobante', e);
      alert('No se pudo abrir el comprobante.');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-modal-title"
    >
      <div className="w-full sm:max-w-4xl md:max-w-5xl xl:max-w-7xl max-h-[90vh] rounded-xl bg-white p-3 shadow-xl">
        <h2 id="ocr-modal-title" className="mb-3 text-xl font-semibold">Confirmar datos de la factura</h2>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-600">Archivo: <strong>{file?.name}</strong></p>
        </div>

        {/* Layout: 2 columnas principales */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Columna izquierda: preview */}
          <div className="flex flex-col max-h-[calc(90vh-120px)] min-h-[560px]">
            {(file || filePreviewUrl) && (
              <OcrPreviewPane file={file} filePreviewUrl={filePreviewUrl} />
            )}
          </div>

          {/* Columna derecha: formulario */}
          <form onSubmit={onSubmit} className="flex flex-col">
              <div className="grid gap-4 md:grid-cols-2">
                {/* IZQ: Datos leídos por OCR */}
                <div className="rounded border p-2">
                  <div className="mb-2 text-sm font-medium text-gray-700">Datos detectados por OCR</div>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Fecha de emisión</label>
                      <input
                        type="text"
                        value={fechaEmision}
                        onChange={(e) => { setFechaEmision?.(e.target.value); if (formErrors.fecha_emision) {/* noop - parent clears */} }}
                        className={`w-full rounded border p-2 ${formErrors.fecha_emision ? 'border-red-400' : ''}`}
                        placeholder="dd/mm/aaaa o yyyy-mm-dd"
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        onBlur={() => {
                          const iso = toISODate(fechaEmision);
                          if (iso) setFechaEmision?.(formatDateAR(iso));
                        }}
                      />
                      {formErrors.fecha_emision && <p className="mt-1 text-xs text-red-600">{formErrors.fecha_emision}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Razón social</label>
                      <input
                        type="text"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial?.(e.target.value)}
                        className={`w-full rounded border p-2 ${formErrors.razon_social ? 'border-red-400' : ''}`}
                        placeholder="Ej: LINZOAIN HORACIO ANTONIO"
                      />
                      {formErrors.razon_social && <p className="mt-1 text-xs text-red-600">{formErrors.razon_social}</p>}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">CUIT</label>
                      <input
                        type="text"
                        value={cuit}
                        onChange={(e) => setCuit?.(e.target.value.replace(/[^0-9\-]/g, ''))}
                        className="w-full rounded border p-2"
                        placeholder="Ej: 20-12345678-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Comprobante Nº</label>
                      <input
                        type="text"
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura?.(e.target.value)}
                        className="w-full rounded border p-2"
                        placeholder="Ej: A-0001-00001234"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Importe Neto Gravado</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={importeNetoGravado}
                        onChange={(e) => setImporteNetoGravado?.(e.target.value.replace(/[^0-9.,\s]/g, ''))}
                        onBlur={() => {
                          const pretty = formatAmountPretty(importeNetoGravado);
                          if (pretty) setImporteNetoGravado?.(pretty);
                        }}
                        className="w-full rounded border p-2 text-right"
                        placeholder="Ej: 60.000,00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Importe total</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={importeTotal}
                        onChange={(e) => setImporteTotal?.(e.target.value.replace(/[^0-9.,\s]/g, ''))}
                        onBlur={() => {
                          const pretty = formatAmountPretty(importeTotal);
                          if (pretty) setImporteTotal?.(pretty);
                        }}
                        className={`w-full rounded border p-2 text-right font-medium ${formErrors.importe_total ? 'border-red-400' : ''}`}
                        placeholder="Ej: 125.000,00"
                      />
                      {formErrors.importe_total && <p className="mt-1 text-xs text-red-600">{formErrors.importe_total}</p>}
                    </div>


                    {/* Fecha de vencimiento (movido aquí) */}
                    <div>
                      <label className="mb-1 block text-sm font-medium">Fecha de vencimiento</label>
                      <input
                        type="text"
                        value={fechaVencimiento}
                        onChange={(e) => setFechaVencimiento?.(e.target.value)}
                        className={`w-full rounded border p-2 ${formErrors.fecha_vencimiento ? 'border-red-400' : ''}`}
                        placeholder="dd/mm/aaaa o yyyy-mm-dd"
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        onBlur={() => {
                          const iso = toISODate(fechaVencimiento);
                          if (iso) setFechaVencimiento?.(formatDateAR(iso));
                        }}
                      />
                      {formErrors.fecha_vencimiento && <p className="mt-1 text-xs text-red-600">{formErrors.fecha_vencimiento}</p>}
                    </div>
                    {/* IVA estimado (movido al final del card) */}
                    <div>
                      {(() => {
                        const netoNum = Number(cleanAmount(importeNetoGravado));
                        const totalNum = Number(cleanAmount(importeTotal));
                        if (Number.isNaN(netoNum) || Number.isNaN(totalNum)) return null;
                        if (netoNum === 0 && totalNum === 0) return null;
                        const ivaVal = totalNum - netoNum;
                        const pct = netoNum > 0 ? (ivaVal / netoNum) * 100 : null;
                        if (ivaVal < 0) {
                          return <p className="mt-1 text-xs text-red-600 text-right">El neto supera al total. Revisá los montos.</p>;
                        }
                        return (
                          <p className="mt-1 text-xs text-gray-600 text-right">
                            IVA estimado: <strong>{formatCurrencyAR(ivaVal)}</strong>
                            {pct != null && !Number.isNaN(pct) && (
                              <span className="ml-1">({pct.toFixed(1)}%)</span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* DER: Decisiones del usuario + Comprobantes */}
                <div className="flex flex-col gap-3">
                  {/* DER: Decisiones del usuario */}
                  <div className="rounded border p-2">
                    <div className="mb-2 text-sm font-medium text-emerald-800">Decisiones</div>
                    <div className="grid gap-3">
                      {/* Tipo de factura */}
                      <div>
                        <label className="mb-1 block text-sm">
                          Tipo de factura <span className="text-red-500">*</span>
                          {tipoFactura ? (
                            <span className="ml-2 text-xs text-emerald-700 align-middle">Elegido: {tipoFactura}</span>
                          ) : null}
                        </label>
                        <div className={`inline-flex rounded-md overflow-hidden border ${formErrors.tipo_factura ? 'ring-1 ring-red-400' : ''}`}>
                          {["A","B","C"].map((t, idx) => (
                            <button
                              type="button"
                              key={t}
                              onClick={() => setTipoFactura?.(t)}
                              className={`px-3 py-1.5 text-sm transition-colors ${tipoFactura === t ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-gray-50'} ${idx !== 0 ? 'border-l' : ''}`}
                              aria-pressed={tipoFactura === t}
                              aria-label={`Elegir tipo ${t}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        {formErrors.tipo_factura && <p className="mt-1 text-xs text-red-600">Elegí A, B o C</p>}
                      </div>

                      {/* Forma de pago */}
                      <div>
                        <label className="mb-1 block text-sm">
                          Forma de pago <span className="text-red-500">*</span>
                          {formaPago ? (
                            <span className="ml-2 text-xs text-emerald-700 align-middle">Elegida: {formaPago}</span>
                          ) : null}
                        </label>
                        <div className={`flex flex-wrap gap-2 ${formErrors.forma_pago ? 'ring-1 ring-red-400 rounded-md p-1' : ''}`}>
                          {["Transferencia","Cheque"].map(fp => (
                            <button
                              type="button"
                              key={fp}
                              onClick={() => setFormaPago?.(fp)}
                              className={`px-3 py-1.5 rounded border text-sm transition-colors ${formaPago === fp ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-gray-50'}`}
                              aria-pressed={formaPago === fp}
                              aria-label={`Elegir ${fp}`}
                            >
                              {fp}
                            </button>
                          ))}
                        </div>
                        {formErrors.forma_pago && <p className="mt-1 text-xs text-red-600">Seleccioná una opción</p>}
                      </div>

                      {/* Categoría */}
                      <div>
                        <label className="mb-1 block text-sm">
                          Categoría <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                        </label>
                        <select
                          value={categoria}
                          onChange={(e)=>setCategoria?.(e.target.value)}
                          className="w-full rounded border p-2"
                        >
                          <option value="">Seleccionar…</option>
                          {categoriasAgro.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Comprobantes (debajo de Decisiones) */}
                  <div className="rounded border p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">Comprobantes</div>
                      <div className="flex items-center gap-2">
                        <input
                          id="modal-comprobante-file-input"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handlePickedComprobante}
                        />
                        <button
                          type="button"
                          onClick={triggerAttachComprobante}
                          className="inline-flex items-center gap-2 rounded border px-2.5 py-1 text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
                          disabled={!facturaId || compUploading}
                        >
                          {compUploading ? 'Subiendo…' : 'Adjuntar'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {compLoading ? (
                        <p className="text-sm text-gray-500">Cargando…</p>
                      ) : (comps && comps.length > 0) ? (
                        comps.map((c, idx) => {
                          const fecha = c.created_at ? new Date(c.created_at).toLocaleString('es-AR') : '';
                          const label = `Comprobante ${idx + 1}`;
                          return (
                            <div key={c.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                              <div className="flex flex-col leading-tight">
                                <span className="text-sm">{label}</span>
                                <span className="text-[11px] text-gray-500">{fecha}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" className="text-sm underline text-gray-700 hover:text-gray-900" onClick={() => handleViewComprobante(c)}>Ver</button>
                                <button type="button" className="text-sm text-red-600 hover:text-red-700" onClick={() => handleDeleteComprobante(c)}>Eliminar</button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No hay comprobantes adjuntos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            {/* Card independiente: Comprobantes (eliminado, ahora dentro del grid) */}
            <div className="mt-2 border-t pt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded border px-4 py-2">Cancelar</button>
              <button type="submit" disabled={cargando} className="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60">
                {cargando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}