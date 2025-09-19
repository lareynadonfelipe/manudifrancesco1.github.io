import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useEffect, useMemo, useRef, useState } from "react";
// Ajustá estas rutas si en tu proyecto están en otra carpeta
import { supabase } from "@/lib/supabase";
import LiquidacionesReaderModal from "@/components/liquidaciones/LiquidacionesReaderModal";
import { Filter } from "lucide-react";

// Utilidades locales para evitar dependencias externas
const formatNumber = (n) => {
  const val = Number(n) || 0;
  return val.toLocaleString("es-AR");
};
const formatPrice = (n) => {
  const val = Number(n) || 0;
  return val.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  } catch {
    return iso;
  }
};

// Helper para resolver la URL del PDF desde distintos nombres de campo
const getPdfUrl = (row) => row?.archivo_url || row?.archivoUrl || row?.pdf_url || row?.pdfUrl || "";

function LiquidacionesAfipPage() {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [selectedLiq, setSelectedLiq] = useState(null);

  // Filtros
  const [filterSearch, setFilterSearch] = useState("");
  const [filterGrano, setFilterGrano] = useState("");
  const [filterCosecha, setFilterCosecha] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modal / lector
  const [liquidacionOpen, setLiquidacionOpen] = useState(false);
  const [liqInitialFile, setLiqInitialFile] = useState(null);
  const [editLiqData, setEditLiqData] = useState(null);

  // Picker de archivos
  const liqPickerRef = useRef(null);

  // Carga inicial: todas las liquidaciones
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("liquidaciones_arca")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!ignore) {
          const normalized = (data || []).map((r) => ({
            ...r,
            archivo_url: r.archivo_url ?? r.archivoUrl ?? r.pdf_url ?? r.pdfUrl ?? "",
            archivo_nombre: r.archivo_nombre ?? r.archivoNombre ?? "",
            // normalizar fecha si viene como string tipo '2025-06-04' o Date
            fecha: r.fecha ?? r.created_at ?? r.updated_at ?? null,
          }));
          // Ordenar por fecha descendente (más reciente primero)
          const sorted = [...normalized].sort((a, b) => {
            const da = new Date(a.fecha);
            const db = new Date(b.fecha);
            return db - da; // más reciente primero
          });
          setLiquidaciones(sorted);
        }
      } catch (err) {
        if (!ignore) setError(err.message || String(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Handlers
  const handleDelete = async (row) => {
    if (!row) return;
    if (!confirm("¿Eliminar esta liquidación?")) return;
    try {
      const { error } = await supabase.from("liquidaciones_arca").delete().eq("id", row.id);
      if (error) throw error;
      setLiquidaciones((prev) => prev.filter((x) => x.id !== row.id));
      if (selectedLiq?.id === row.id) setSelectedLiq(null);
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const handleViewPdf = async (row) => {
    if (!row) return;
    try {
      const raw = getPdfUrl(row);
      if (!raw) {
        alert("Esta liquidación no tiene PDF adjunto.");
        return;
      }

      // Resolver el path dentro del bucket 'liquidaciones'
      const resolvePath = (input) => {
        if (!input) return null;
        const s = String(input);
        if (/^https?:\/\//i.test(s)) {
          // Extraer la parte luego de .../object/(public/)?liquidaciones/
          const m = s.match(/\/storage\/v1\/object\/(?:public\/)?liquidaciones\/(.+)$/);
          if (m && m[1]) return m[1];
          // Si no matchea, no podemos firmar: abrimos tal cual
          return s;
        }
        let p = s.replace(/^\/+/, "");
        p = p.replace(/^public\//, "");
        p = p.replace(/^liquidaciones\//, "");
        return p;
      };

      const pathOrUrl = resolvePath(raw);
      if (!pathOrUrl) {
        alert("No pude resolver la ruta del PDF.");
        return;
      }

      if (/^https?:\/\//i.test(pathOrUrl)) {
        // Ya es URL completa pero no pudimos extraer path: abrimos como fallback
        window.open(pathOrUrl, "_blank", "noopener");
        return;
      }

      // Generar URL firmada (válida por 10 minutos)
      const { data, error } = await supabase.storage
        .from("liquidaciones")
        .createSignedUrl(pathOrUrl, 60 * 10);

      if (error) throw error;
      if (!data?.signedUrl) {
        alert("No se pudo generar el enlace firmado del PDF.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener");
    } catch (e) {
      console.error(e);
      alert(e?.message || String(e));
    }
  };

  const handleUploadClick = () => {
    setSelectedLiq(null);
    setEditLiqData(null);
    setLiqInitialFile(null);
    liqPickerRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLiqInitialFile(file);
    setEditLiqData(null);
    setLiquidacionOpen(true);
    // Limpiar el input para permitir volver a elegir el mismo archivo si hace falta
    e.target.value = "";
  };

  // Opciones para selects
  const granoOpts = useMemo(() => {
    const set = new Set((liquidaciones || []).map(r => r.grano).filter(Boolean));
    return Array.from(set);
  }, [liquidaciones]);
  const cosechaOpts = useMemo(() => {
    const set = new Set((liquidaciones || []).map(r => r.cosecha || r.campania).filter(Boolean));
    return Array.from(set);
  }, [liquidaciones]);

  // Filtrado
  const filteredRows = useMemo(() => {
    const q = (filterSearch || "").toLowerCase();
    const norm = (v) => (v == null ? "" : String(v)).toLowerCase();
    return (liquidaciones || []).filter((r) => {
      if (filterGrano && (r.grano || "") !== filterGrano) return false;
      if (filterCosecha && ((r.cosecha || r.campania || "")) !== filterCosecha) return false;
      if (!q) return true;
      return (
        norm(r.fecha).includes(q) ||
        norm(r.coe).includes(q) ||
        norm(r.nro_comprobante).includes(q) ||
        norm(r.grano).includes(q) ||
        norm(r.cosecha).includes(q) ||
        norm(r.campania).includes(q) ||
        norm(r.cantidad_kg).includes(q) ||
        norm(r.precio_kg).includes(q) ||
        norm(r.total_operacion).includes(q) ||
        norm(r.importe_neto_a_pagar).includes(q) ||
        norm(r.pago_segun_condiciones).includes(q) ||
        norm(r.archivo_nombre).includes(q)
      );
    });
  }, [liquidaciones, filterSearch, filterGrano, filterCosecha]);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header: botón Filtros + acciones */}
      <div className="mb-5 flex items-center justify-end gap-3 flex-wrap">
        <button
          className="px-4 py-2 rounded-md shadow-sm transition text-white bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
          onClick={handleUploadClick}
        >
          Cargar liquidación
        </button>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium inline-flex items-center gap-2"
          title="Mostrar/ocultar filtros"
        >
          <Filter size={18} />
          Filtros
          {(filterSearch || filterGrano || filterCosecha) && (
            <span className="ml-1 inline-flex items-center justify-center text-xs px-1.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">●</span>
          )}
        </button>

        {selectedLiq && (
          <>
            <button
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
              onClick={() => {
                setEditLiqData(selectedLiq);
                setLiqInitialFile(null);
                setLiquidacionOpen(true);
              }}
            >
              Editar
            </button>
            <button
              className="px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-base font-medium"
              onClick={() => handleDelete(selectedLiq)}
            >
              Eliminar
            </button>
          </>
        )}
      </div>

      {/* Panel de filtros (toggle) */}
      {filtersOpen && (
        <div className="mt-3 w-full">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Buscar</label>
              <input
                type="text"
                value={filterSearch}
                onChange={(e)=>setFilterSearch(e.target.value)}
                placeholder="grano, cosecha, COE, comprobante, KG, precio…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Grano</label>
              <select
                value={filterGrano}
                onChange={(e)=>setFilterGrano(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">(todos)</option>
                {granoOpts.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cosecha</label>
              <select
                value={filterCosecha}
                onChange={(e)=>setFilterCosecha(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">(todas)</option>
                {cosechaOpts.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                onClick={() => { setFilterSearch(''); setFilterGrano(''); setFilterCosecha(''); }}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                onClick={() => setFiltersOpen(false)}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-500">Cargando…</div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-red-600">Error: {error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-500">Sin liquidaciones cargadas.</div>
        ) : (
          <div className="overflow-x-auto max-h-[65vh] space-y-8">
            {/* TABLA: Todas las liquidaciones (unificada) */}
            <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-white/70 border-b border-gray-200/60 backdrop-blur flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Todas las liquidaciones</h2>
                <span className="text-sm text-gray-500">{filteredRows.length} registros</span>
              </div>
              <div className="overflow-x-auto overflow-y-auto relative" style={{ maxHeight: "65vh" }}>
                <table className="min-w-full table-fixed text-base">
                  <thead className="bg-white sticky top-0 z-10 border-b border-gray-200/60">
                    <tr>
                      {[
                        { key: "fecha", label: "Fecha" },
                        { key: "coe", label: "COE" },
                        { key: "nro_comprobante", label: "Comprobante" },
                        { key: "grano", label: "Grano" },
                        { key: "cosecha", label: "Cosecha" },
                        { key: "cantidad_kg", label: "Cantidad" },
                        { key: "precio_kg", label: "Precio/Kg" },
                        { key: "total_operacion", label: "Total Operación" },
                        { key: "importe_neto_a_pagar", label: "Importe Neto" },
                        { key: "pago_segun_condiciones", label: "Cobrado" },
                        { key: "archivo_nombre", label: "Archivo" },
                      ].map(({ key, label }) => (
                        <th
                          key={key}
                          className={`px-4 py-3 text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap ${
                            [
                              "cantidad_kg",
                              "precio_kg",
                              "total_operacion",
                              "importe_neto_a_pagar",
                              "pago_segun_condiciones",
                            ].includes(key)
                              ? "text-right"
                              : "text-left"
                          } ${
                            key === "fecha"
                              ? "w-28"
                              : key === "coe"
                              ? "w-40"
                              : key === "nro_comprobante"
                              ? "w-44"
                              : key === "grano"
                              ? "w-28"
                              : key === "cosecha"
                              ? "w-20"
                              : key === "cantidad_kg"
                              ? "w-28"
                              : key === "precio_kg"
                              ? "w-28"
                              : key === "total_operacion"
                              ? "w-36"
                              : key === "importe_neto_a_pagar"
                              ? "w-36"
                              : key === "pago_segun_condiciones"
                              ? "w-36"
                              : key === "archivo_nombre"
                              ? "w-48"
                              : ""
                          }`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedLiq?.id === r.id ? "bg-green-50" : ""}`}
                        onClick={() => {
                          setSelectedLiq(r);
                        }}
                        title={"Seleccionar liquidación"}
                      >
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">{formatDate(r.fecha)}</td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">{r.coe || "—"}</td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">{r.nro_comprobante || "—"}</td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">{r.grano || "—"}</td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">{r.cosecha || r.campania || "—"}</td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap text-right">
                          {formatNumber(Number(r.cantidad_kg) || 0)}&nbsp;KG
                        </td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap text-right">
                          {formatPrice(Number(r.precio_kg))}
                        </td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap text-right">
                          {formatPrice(Number(r.total_operacion))}
                        </td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap text-right">
                          {formatPrice(Number(r.importe_neto_a_pagar))}
                        </td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap text-right">
                          {formatPrice(Number(r.pago_segun_condiciones))}
                        </td>
                        <td className="px-4 py-3 h-12 align-middle whitespace-nowrap">
                          {r.archivo_nombre ? (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); handleViewPdf(r); }}
                              className="text-emerald-700 hover:text-emerald-800 underline"
                              title="Ver liquidación"
                            >
                              {r.archivo_nombre}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* input oculto que dispara el file picker y abre el modal al elegir */}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={liqPickerRef}
        onChange={handleFileChange}
      />

      {/* Modal lector / editor (solo si hay archivo inicial o estamos editando) */}
      {(liquidacionOpen && (liqInitialFile || editLiqData)) && (
        <LiquidacionesReaderModal
          open={liquidacionOpen}
          onClose={() => {
            setLiquidacionOpen(false);
            setEditLiqData(null);
            setLiqInitialFile(null);
          }}
          initialFile={liqInitialFile}
          data={editLiqData}
          onSaved={(savedRow) => {
            // refrescamos lista localmente
            setLiquidaciones((prev) => {
              const idx = prev.findIndex((x) => x.id === savedRow.id);
              if (idx === -1) return [savedRow, ...prev];
              const copy = [...prev];
              copy[idx] = savedRow;
              return copy;
            });
            setSelectedLiq(savedRow);
          }}
        />
      )}
    </div>
  );
}

export default function LiquidacionesAfipPageProtected() {
  return (
    <ProtectedRoute>
      <LiquidacionesAfipPage />
    </ProtectedRoute>
  );
}