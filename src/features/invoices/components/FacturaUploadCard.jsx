// src/features/invoices/components/FacturaUploadCard.jsx
import React, { useRef, useState } from "react";

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const MAX = 10 * 1024 * 1024; // 10MB

export default function FacturaUploadCard({
  title = "Subir factura (OCR)",
  disabled = false,
  onFileSelected,
  onProcess,
  className = "",
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  function validate(f) {
    if (!f) return "Archivo requerido";
    if (!ACCEPT.includes(f.type)) return "Tipo no permitido (pdf/jpg/png)";
    if (f.size > MAX) return "Archivo supera 10 MB";
    return null;
  }

  function handlePick(e) {
    const f = e.target.files?.[0];
    const err = validate(f);
    if (err) {
      setError(err);
      setFile(null);
      onFileSelected?.(null);
      return;
    }
    setError("");
    setFile(f);
    onFileSelected?.(f);
  }

  return (
    <div className={`rounded-xl border border-gray-200/70 bg-white/80 backdrop-blur p-4 ${className}`}> 
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">PDF/JPG/PNG · máx. 10 MB</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handlePick}
          />
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Elegir archivo
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm disabled:opacity-60"
            onClick={() => onProcess?.(file)}
            disabled={disabled || !file}
          >
            Procesar
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {file ? <span>Seleccionado: <strong>{file.name}</strong> ({Math.round(file.size/1024)} KB)</span> : <span>Sin archivo seleccionado</span>}
        {error && <span className="ml-3 text-red-600">{error}</span>}
      </div>
    </div>
  );
}