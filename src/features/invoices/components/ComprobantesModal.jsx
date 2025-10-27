// src/features/invoices/components/ComprobantesModal.jsx
import React, { useEffect, useRef, useState } from "react";

export default function ComprobantesModal({ open, row, onClose, onView, onDelete, onAttach, resolvePreviewUrl }) {
  const [shown, setShown] = useState(false);
  const firstActionRef = useRef(null);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  useEffect(() => {
    // pequeña animación y bloqueo de scroll de fondo
    const t = setTimeout(() => setShown(true), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    firstActionRef.current?.focus?.();
  }, []);

  const list = Array.isArray(row?.comprobantes) ? row.comprobantes.slice() : [];
  const numericCount =
    (typeof row?.compCount !== 'undefined' && !isNaN(parseInt(row?.compCount, 10)) ? parseInt(row.compCount, 10) : 0) ||
    (typeof row?.comprobantes_count !== 'undefined' && !isNaN(parseInt(row.comprobantes_count, 10)) ? parseInt(row.comprobantes_count, 10) : 0);
  const count = Math.max(list.length, numericCount);
  while (list.length < count) list.push(null);

  // Selected comprobante and upload date for info header
  const selectedComp = list[selectedIdx] || null;
  const uploadedAt = selectedComp?.created_at ? new Date(selectedComp.created_at).toLocaleString('es-AR') : null;

  useEffect(() => {
    if (!open) return;
    // reset selection when row changes
    setSelectedIdx(0);
  }, [open, row?.id]);

  function labelOf(comp, idx) {
    if (comp?.created_at) {
      try { return new Date(comp.created_at).toLocaleString('es-AR'); } catch (e) {}
    }
    return `Comprobante ${idx + 1}`;
  }

  function onKey(e) {
    if (e.key === "Escape") onClose?.();
  }

  // Descargar comprobante helper
  async function handleDownload(e, idx) {
    e?.stopPropagation?.();
    try {
      const comp = list[idx] || null;
      let url = null;
      if (typeof resolvePreviewUrl === 'function') {
        url = await resolvePreviewUrl(row, idx, comp);
      }
      if (!url && comp?.file_path) url = comp.file_path;
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('download comprobante', err);
    }
  }

  async function loadPreview(idx) {
    try {
      setLoadingPreview(true);
      setPreviewError(null);
      const comp = list[idx] || null;
      let url = null;
      if (typeof resolvePreviewUrl === 'function') {
        url = await resolvePreviewUrl(row, idx, comp);
      }
      // fallback: try direct file_path if resolver not provided
      if (!url && comp?.file_path) url = comp.file_path;
      setPreviewUrl(url || null);
    } catch (err) {
      console.error('preview error', err);
      setPreviewError('No se pudo previsualizar el comprobante.');
      setPreviewUrl(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (count > 0) loadPreview(selectedIdx);
  }, [open, selectedIdx, row?.id]);

  return (!open || !row) ? null : (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-150 ${shown ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comp-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className={`relative w-[700px] max-w-[94vw] max-h-[75vh] overflow-hidden rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-150 ${shown ? 'opacity-100 scale-100' : 'opacity-95 scale-95'}`}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 id="comp-modal-title" className="text-base font-semibold text-gray-900">Comprobantes</h3>
            <p className="text-xs text-gray-500">Ver, eliminar o adjuntar nuevos archivos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              onClick={onAttach}
              title="Adjuntar comprobante"
              aria-label="Adjuntar comprobante"
              ref={firstActionRef}
            >
              Cargar
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300/60"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-3 max-h-[calc(75vh-64px)] overflow-hidden">
          {/* grid de dos columnas: lista (izq) + preview (der) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-[calc(75vh-88px)]">
            {/* Lista */}
            <div className="h-full overflow-auto rounded-lg border border-gray-100">
              {list.length === 0 && (
                <div className="px-3 py-8 text-center text-gray-500 rounded-lg bg-gray-50 border border-dashed border-gray-200 m-3">
                  No hay comprobantes cargados todavía.
                  <div className="mt-3">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      onClick={onAttach}
                    >
                      Cargar comprobante
                    </button>
                  </div>
                </div>
              )}
              {list.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {list.map((comp, idx) => (
                    <li key={`compm-${row.id}-${idx}`}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 ${selectedIdx === idx ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'}`}
                        onClick={() => setSelectedIdx(idx)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedIdx(idx); } }}
                        aria-selected={selectedIdx === idx}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                              <path d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                              <path d="M14 3v5h5" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{labelOf(comp, idx)}</div>
                            {comp?.created_at && (
                              <div className="text-xs text-gray-500 truncate">
                                {new Date(comp.created_at).toLocaleDateString('es-AR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDelete?.(idx, comp); }}
                            className="text-gray-400 hover:text-red-500 focus:outline-none"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Preview */}
            <div className="relative h-full overflow-hidden">
              {!list.length && (
                <div className="h-full min-h-[300px] flex items-center justify-center text-gray-400 text-sm">
                  Cargá un comprobante para previsualizar
                </div>
              )}
              {list.length > 0 && (
                <div className="h-full min-h-[300px] flex flex-col">
                  {/* Visor */}
                  <div className="relative grow">
                    {loadingPreview && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">Cargando previsualización…</div>
                    )}
                    {previewError && !loadingPreview && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm px-4 text-center">{previewError}</div>
                    )}
                    {!loadingPreview && !previewError && previewUrl && (
                      <iframe
                        title="preview"
                        src={previewUrl}
                        className="w-full h-full"
                      />
                    )}
                    {!loadingPreview && !previewError && !previewUrl && (
                      <div className="h-full min-h-[300px] flex items-center justify-center text-gray-400 text-sm">
                        No hay vista previa disponible
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}