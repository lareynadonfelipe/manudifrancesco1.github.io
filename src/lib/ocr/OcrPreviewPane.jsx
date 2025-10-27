// src/lib/ocr/OcrPreviewPane.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

export default function OcrPreviewPane({ file, filePreviewUrl }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1.0);
  const [accessibleViewer, setAccessibleViewer] = useState(false);
  const [magnifierOn, setMagnifierOn] = useState(false);
  const [magnifierScale, setMagnifierScale] = useState(2);
  const [magnifierSize, setMagnifierSize] = useState(160);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0, show: false });
  const [canvasDataUrl, setCanvasDataUrl] = useState('');

  // Resetear zoom cuando cambia el archivo o la URL de preview
  useEffect(() => {
    setZoom(1);
  }, [file, filePreviewUrl]);

  // Helper para detectar PDF por URL
  const isPdfUrl = (u) => typeof u === 'string' && /\.pdf(\?|#|$)/i.test(u);

  // Renderiza la primera página del PDF al canvas (archivo local)
  useEffect(() => {
    let cancelled = false;
    async function renderFirstPage() {
      try {
        if (!file || file.type !== 'application/pdf') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);

        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : 800;
        const baseViewport = page.getViewport({ scale: 1 });
        // Ajustar al ancho del visor; si la altura excede, se podrá hacer scroll
        const scaleToFit = (containerWidth / baseViewport.width) * zoom;
        const viewport = page.getViewport({ scale: scaleToFit });

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        if (!cancelled) setCanvasDataUrl(dataUrl);
      } catch (e) {
        console.warn('No se pudo previsualizar el PDF en canvas:', e);
      }
    }
    renderFirstPage();
    const onResize = () => renderFirstPage();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [file, zoom]);

  // Renderiza la primera página de un PDF desde filePreviewUrl (cuando no hay file y no está el visor accesible)
  useEffect(() => {
    let cancelled = false;
    async function renderFromUrl() {
      try {
        if (!filePreviewUrl || accessibleViewer || !isPdfUrl(filePreviewUrl)) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const res = await fetch(filePreviewUrl, { credentials: "omit" });
        const buf = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);

        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : 800;
        const baseViewport = page.getViewport({ scale: 1 });
        // Ajustar al ancho del visor; si la altura excede, se podrá hacer scroll
        const scaleToFit = (containerWidth / baseViewport.width) * zoom;
        const viewport = page.getViewport({ scale: scaleToFit });

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        if (!cancelled) setCanvasDataUrl(dataUrl);
      } catch (e) {
        console.warn('No se pudo renderizar la URL firmada en canvas:', e);
      }
    }
    renderFromUrl();
    const onResize = () => renderFromUrl();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [filePreviewUrl, zoom, accessibleViewer]);

  // Siempre renderizar el contenedor, incluso si no hay file pero sí filePreviewUrl
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full max-h-full">
      <div className="rounded border p-2 mb-1 flex-1 flex flex-col min-h-0">
        <div className="mb-2" />
        {accessibleViewer ? (
          // Visor accesible (iframe) para cualquier URL
          <div className="flex-1 bg-gray-50">
            <iframe
              src={filePreviewUrl || (file ? URL.createObjectURL(file) : '')}
              title="Visor PDF"
              className="h-full w-full"
            />
          </div>
        ) : ((file && file.type === 'application/pdf') || (filePreviewUrl && isPdfUrl(filePreviewUrl))) ? (
          // Canvas primera página (archivo local o URL firmada PDF)
          <div
            className="relative flex-1 overflow-auto bg-gray-50 flex items-start justify-center min-h-0"
            onMouseMove={(e) => {
              if (!magnifierOn) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
              const y = e.clientY - rect.top + e.currentTarget.scrollTop;
              setLensPos({ x, y, show: true });
            }}
            onMouseLeave={() => setLensPos((p) => ({ ...p, show: false }))}
          >
            <canvas ref={canvasRef} className="block w-full h-auto" />
            {magnifierOn && lensPos.show && canvasDataUrl && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute rounded-full ring-2 ring-black/20 shadow-lg"
                style={{
                  width: `${magnifierSize}px`,
                  height: `${magnifierSize}px`,
                  left: `${Math.max(0, lensPos.x - magnifierSize / 2)}px`,
                  top: `${Math.max(0, lensPos.y - magnifierSize / 2)}px`,
                  backgroundImage: `url(${canvasDataUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${(() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return 'auto';
                    const displayedWidth = canvas.getBoundingClientRect().width;
                    const displayedHeight = canvas.getBoundingClientRect().height;
                    return `${displayedWidth * magnifierScale}px ${displayedHeight * magnifierScale}px`;
                  })()}`,
                  backgroundPosition: `${(lensPos.x * magnifierScale - magnifierSize / 2) * -1}px ${(lensPos.y * magnifierScale - magnifierSize / 2) * -1}px`,
                  backdropFilter: 'none',
                }}
              />
            )}
          </div>
        ) : (
          // Imagen (URL firmada o blob)
          <div className="flex-1 overflow-auto bg-gray-50 flex items-start justify-center min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={filePreviewUrl} alt="preview" className="block w-full h-auto" />
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAccessibleViewer(v => !v)}
            className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
            title="Alternar visor accesible (zoom/selección nativos)"
          >
            {accessibleViewer ? 'Usar vista rápida' : 'Visor accesible'}
          </button>
          <button
            type="button"
            onClick={() => setMagnifierOn(v => !v)}
            className={`text-xs rounded border px-2 py-1 hover:bg-gray-50 ${magnifierOn ? 'bg-green-600 text-white border-green-600' : ''}`}
            title="Alternar lupa"
          >
            Lupa
          </button>
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            disabled={accessibleViewer}
            className={`rounded border px-2 py-1 text-xs ${accessibleViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Alejar"
            aria-label="Alejar"
          >
            −
          </button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}
            disabled={accessibleViewer}
            className={`rounded border px-2 py-1 text-xs ${accessibleViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Acercar"
            aria-label="Acercar"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}