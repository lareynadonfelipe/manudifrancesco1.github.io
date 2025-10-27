// src/features/invoices/components/InvoiceDetailDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fmtMoney } from "../utiles/dateMoney";
import * as pdfjsLib from "pdfjs-dist";

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    // use the bundled worker if available
    // eslint-disable-next-line import/no-webpack-loader-syntax
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.min.js", import.meta.url).toString();
  } catch {
    // fallback to cdn
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
}

export default function InvoiceDetailDrawer({ open, invoice, onClose, onOpenPay }) {
  if (!open || !invoice) return null;

  const isPdf = useMemo(() => {
    const u = String(invoice.facturaUrl || "").toLowerCase();
    return u.includes(".pdf") || u.includes("application/pdf");
  }, [invoice?.facturaUrl]);

  const canOpen = !!invoice.facturaUrl;

  // canvas/pdf/image state and dynamic sizing
  const canvasRef = useRef(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [fitMode, setFitMode] = useState("page"); // "page" | "width"
  const headerH = 48; // px
  const footerH = invoice?.estado !== "PAGADA" ? 0 : 0;

  // compute max available modal size
  const maxW = Math.min(window.innerWidth * 0.95, 1300);
  const maxH = Math.min(window.innerHeight * 0.9, 920);
  // fixed modal size for consistent viewer
  const modalW = Math.min(window.innerWidth * 0.95, 1300);
  const modalH = Math.min(window.innerHeight * 0.9, 920);

  useEffect(() => {
    let task;
    let cancelled = false;

    async function render() {
      if (!open || !invoice?.facturaUrl) return;
      if (!isPdf) {
        // for images, we will update dims via onLoad
        return;
      }
      try {
        task = pdfjsLib.getDocument({ url: invoice.facturaUrl, withCredentials: false });
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1 });

        // scale according to fit mode
        const scale = fitMode === "width"
          ? (modalW - 24) / vp.width
          : Math.min((modalW - 24) / vp.width, (modalH - headerH - 16) / vp.height);
        const viewport = page.getViewport({ scale: scale > 0 ? scale : 1 });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setDims({ w: viewport.width, h: viewport.height + headerH + footerH });

        const renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (e) {
        // silent fail; UI will show link to open in pestaña
        // console.warn("PDF render error", e);
      }
    }

    render();
    return () => {
      cancelled = true;
      if (task && task.destroy) try { task.destroy(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.facturaUrl, fitMode]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* modal */}
      <div
        className="relative z-10 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: modalW, height: modalH }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Factura</h2>
            <span className="text-sm text-slate-600">
              Nº {invoice.numero} — {invoice.proveedor}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isPdf && (
              <div className="flex items-center gap-1 mr-1">
                <label className="text-xs text-slate-600">Ajuste:</label>
                <select
                  value={fitMode}
                  onChange={(e) => setFitMode(e.target.value)}
                  className="px-2 py-1 text-xs border rounded"
                >
                  <option value="page">Página</option>
                  <option value="width">Ancho</option>
                </select>
              </div>
            )}
            {invoice.total != null && (
              <span className="text-sm text-slate-700">Total: {fmtMoney(invoice.total)}</span>
            )}
            {invoice.estado !== "PAGADA" && (
              <button
                className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                onClick={() => onOpenPay?.(invoice)}
              >
                Registrar pago
              </button>
            )}
            {canOpen && (
              <a
                href={invoice.facturaUrl}
                download
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Descargar
              </a>
            )}
            {canOpen && (
              <a
                href={invoice.facturaUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Abrir en pestaña
              </a>
            )}
            <button className="px-3 py-1.5 text-sm border rounded" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        {/* viewer */}
        <div
          className="bg-slate-100 overflow-auto"
          style={{ width: modalW, height: modalH - headerH - 4 }}
        >
          {canOpen ? (
            isPdf ? (
              <div className="w-full h-full flex items-center justify-center">
                <canvas ref={canvasRef} className="bg-white shadow" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-auto">
                <img
                  src={invoice.facturaUrl}
                  alt="Factura"
                  className="object-contain"
                  style={{
                    maxWidth: fitMode === "width" ? modalW - 24 : modalW - 24,
                    maxHeight: fitMode === "page" ? modalH - headerH - 16 : "none",
                  }}
                />
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              No se adjuntó archivo para esta factura.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}