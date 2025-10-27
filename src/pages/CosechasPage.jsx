// src/pages/CosechasPage.jsx
import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUIStore } from "@/store/uiStore"
import { useCampaniaStore } from "@/store/campaniaStore"

const formatNumber = (n) => n?.toLocaleString("es-AR")

const CosechasPage = () => {
  const { mode } = useUIStore()
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore()
  

  const [cosechas, setCosechas] = useState([])
  const [siembras, setSiembras] = useState([])
  const [camiones, setCamiones] = useState([])
  // Opciones de campaña (unión de siembras y cosechas)
  const campanias = useMemo(() => {
    const set = new Set();
    for (const s of siembras) set.add(s.campania);
    for (const c of cosechas) set.add(c.campania);
    return Array.from(set).filter(Boolean).sort((a,b)=> String(b).localeCompare(String(a)));
  }, [siembras, cosechas]);
  const cultivos = ["Soja", "Maíz", "Trigo"]
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState(cultivos[0])
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)

  // === Global search integration ===
  const [query, setQuery] = useState(typeof window !== "undefined" ? (window.__GLOBAL_SEARCH_QUERY__ || "") : "");
  useEffect(() => {
    const onGlobalSearch = (e) => setQuery(e?.detail?.q ?? "");
    window.addEventListener("global-search", onGlobalSearch);
    return () => window.removeEventListener("global-search", onGlobalSearch);
  }, []);
  const qNorm = (query || "").trim().toLowerCase();

  useEffect(() => {
    const fetchData = async () => {
      const [
        { data: cosechasData },
        { data: siembrasData },
        { data: camionesData },
      ] = await Promise.all([
        supabase.from("cosechas").select("*"),
        supabase.from("siembras").select("*"),
        supabase.from("camiones").select("*"),
      ])
      setCosechas(cosechasData || [])
      setSiembras(siembrasData || [])
      setCamiones(camionesData || [])
    }
    fetchData()
  }, [])

  // Agrupar por cultivo
  const cosechasAgrupadas = cosechas
    .filter((c) => c.campania === campaniaSeleccionada)
    .reduce((acc, item) => {
      acc[item.cultivo] = acc[item.cultivo] || []
      acc[item.cultivo].push(item)
      return acc
    }, {})

  // Camiones filtrados (por lote seleccionado) + búsqueda global
  const camionesFiltrados = useMemo(() => {
    const base = loteSeleccionado
      ? camiones.filter((c) => c.cosecha_id === loteSeleccionado.id)
      : [];
    if (!qNorm) return base;
    return base.filter((c) => {
      const destino = (c.destino || "").toLowerCase();
      const para = (c.camion_para || "").toLowerCase();
      const ctg = (c.ctg || "").toString().toLowerCase();
      return destino.includes(qNorm) || para.includes(qNorm) || ctg.includes(qNorm);
    });
  }, [camiones, loteSeleccionado, qNorm]);

  // Resumen por destino
  const resumenPorDestino = Object.values(
    camiones
      .filter((c) => {
        const cosecha = cosechas.find((cs) => cs.id === c.cosecha_id)
        return (
          cosecha?.campania === campaniaSeleccionada &&
          cosecha?.cultivo === cultivoSeleccionado
        )
      })
      .reduce((acc, c) => {
        const key = c.destino
        if (!acc[key]) acc[key] = { destino: c.destino, cecilia: 0, horacio: 0 }
        if (c.camion_para === "Cecilia") acc[key].cecilia += c.kg_destino || 0
        if (c.camion_para === "Horacio") acc[key].horacio += c.kg_destino || 0
        return acc
      }, {})
  )

// Función para renderizar resultado lotes
const renderTablaCultivo = (cultivo) => {
  const items = cosechasAgrupadas[cultivo] || [];
  // Filtro por búsqueda global
  const itemsFiltrados = !qNorm
    ? items
    : items.filter((item) => {
        const s = siembras.find(
          (x) => x.campania === item.campania && x.lote === item.lote
        ) || {};
        const productor = (s.productor || "").toLowerCase();
        const lote = (item.lote || "").toLowerCase();
        return productor.includes(qNorm) || lote.includes(qNorm);
      });
  const totales = { ha: 0, kgCampo: 0, kgCecilia: 0, kgHoracio: 0 };

  const rows = itemsFiltrados.map((item) => {
    const s = siembras.find(
      (x) => x.campania === item.campania && x.lote === item.lote
    ) || {};
    const ha = s.ha || 0;
    const productor = s.productor || "-";
    const camDel = camiones.filter((c) => c.cosecha_id === item.id);
    const kgCampo = camDel.reduce((sum, c) => sum + (c.kg_campo || 0), 0);
    const kgCec = camDel
      .filter((c) => c.camion_para === "Cecilia")
      .reduce((sum, c) => sum + (c.kg_campo || 0), 0);
    const kgHor = camDel
      .filter((c) => c.camion_para === "Horacio")
      .reduce((sum, c) => sum + (c.kg_campo || 0), 0);
    const rto = ha ? (kgCampo / ha / 100).toFixed(2) : "-";

    totales.ha += ha;
    totales.kgCampo += kgCampo;
    totales.kgCecilia += kgCec;
    totales.kgHoracio += kgHor;

    return (
      <tr
        key={item.id}
        className="border-t hover:bg-gray-50 cursor-pointer"
        onClick={() => setLoteSeleccionado(item)}
      >
        <td className="px-4 py-2 whitespace-nowrap">{item.lote}</td>
        <td className="px-4 py-2">{productor}</td>
        <td className="px-4 py-2 text-right">{formatNumber(ha)}</td>
        <td className="px-4 py-2 text-right">{rto}</td>
        <td className="px-4 py-2 text-right">{formatNumber(kgCampo)}</td>
        <td className="px-4 py-2 text-right">{formatNumber(kgCec)}</td>
        <td className="px-4 py-2 text-right">{formatNumber(kgHor)}</td>
      </tr>
    );
  });

  const rendimientoProm = totales.ha
    ? (totales.kgCampo / totales.ha / 100).toFixed(2)
    : "-";

  return (
    <div className="self-start rounded-xl border bg-white shadow-sm overflow-hidden w-full">
      {/* Cabecera idéntica a Camiones */}
      <div className="px-4 py-2 bg-[#f1f4f3] border-b">
        <h3 className="text-sm font-semibold text-[#235633] uppercase">
          Resultado Lotes
        </h3>
      </div>
      {qNorm && itemsFiltrados.length === 0 && (
        <div className="px-4 py-6 text-sm text-gray-500">
          No hay lotes que coincidan con “{query}”.
        </div>
      )}
      {/* Scroll en móvil, visible completo en desktop */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Lote</th>
              <th className="px-4 py-2 text-left">Productor</th>
              <th className="px-4 py-2 text-right">Ha</th>
              <th className="px-4 py-2 text-right">Rto</th>
              <th className="px-4 py-2 text-right">Kg Campo</th>
              <th className="px-4 py-2 text-right">Kg Cecilia</th>
              <th className="px-4 py-2 text-right">Kg Horacio</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
          <tfoot className="bg-[#f1f4f3] font-semibold border-t">
            <tr>
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2"></td>
              <td className="px-4 py-2 text-right">{formatNumber(totales.ha)}</td>
              <td className="px-4 py-2 text-right">{rendimientoProm}</td>
              <td className="px-4 py-2 text-right">{formatNumber(totales.kgCampo)}</td>
              <td className="px-4 py-2 text-right">{formatNumber(totales.kgCecilia)}</td>
              <td className="px-4 py-2 text-right">{formatNumber(totales.kgHoracio)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


  return (
    <div className="w-full min-h-screen pb-12 px-2">
      {/* Encabezado de página */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-700">Cosechas</h1>
        <div className="flex items-center gap-2">
          <select
            id="campania-cosechas"
            aria-label="Seleccionar campaña"
            value={campaniaSeleccionada || ''}
            onChange={(e)=> setCampaniaSeleccionada(e.target.value || null)}
            className="border-gray-300 rounded-md px-3 py-2 text-sm h-9"
          >
            <option value="">Seleccioná campaña…</option>
            {campanias.map((c)=> (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {!campaniaSeleccionada && (
        <div className="mb-4 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          Seleccioná una campaña para ver resultados.
        </div>
      )}
      {campaniaSeleccionada && (
        <>
          {/* Pestañas de cultivo */}
          <div className="flex w-full justify-center md:justify-start border-b mb-4">
            {cultivos.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCultivoSeleccionado(c)
                  setLoteSeleccionado(null)
                }}
                className={`flex-1 text-center py-2 -mb-px font-medium md:flex-none md:px-4 ${
                  cultivoSeleccionado === c
                    ? "border-b-2 border-[#235633] text-[#235633]"
                    : "border-b-2 border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Sin datos */}
          {!(
            cosechasAgrupadas[cultivoSeleccionado]?.length > 0
          ) ? (
            <p className="text-center text-gray-500 py-6">
              No hay resultados para {cultivoSeleccionado}.
            </p>
          ) : (
            <>
              {/* ——— Grid con 4 cards (mobile 1 columna, desktop 2x2) ——— */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 1) Entregas por destino */}
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                    <h3 className="text-sm font-semibold text-[#235633] uppercase">
                      Entregas por destino
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed text-xs sm:text-sm">
                      <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                        <tr>
                          
                        <th className="px-1 py-1 sm:px-2 sm:py-2 text-left">Productor</th>                          {resumenPorDestino.map((r) => (
                            <th
                              key={r.destino}
                              className="px-1 py-1 sm:px-4 sm:py-2 text-center"
                            >
                              {r.destino}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-1 py-1 sm:px-4 sm:py-2 font-medium">
                            Cecilia
                          </td>
                          {resumenPorDestino.map((r) => (
                            <td
                              key={r.destino}
                              className="px-1 py-1 sm:px-4 sm:py-2 text-right"
                            >
                              {formatNumber(r.cecilia)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t">
                          <td className="px-1 py-1 sm:px-4 sm:py-2 font-medium">
                            Horacio
                          </td>
                          {resumenPorDestino.map((r) => (
                            <td
                              key={r.destino}
                              className="px-1 py-1 sm:px-4 sm:py-2 text-right"
                            >
                              {formatNumber(r.horacio)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-t bg-[#f1f4f3] font-semibold">
                          <td className="px-1 py-1 sm:px-4 sm:py-2">Total</td>
                          {resumenPorDestino.map((r) => (
                            <td
                              key={r.destino}
                              className="px-1 py-1 sm:px-4 sm:py-2 text-right"
                            >
                              {formatNumber(r.cecilia + r.horacio)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

   {/* 2) BALANCE LOTES HORACIO */}
<div className="rounded-xl border bg-white shadow-sm overflow-hidden">
  <div className="px-4 py-2 bg-[#f1f4f3] border-b">
    <h3 className="text-sm font-semibold text-[#235633] uppercase">
      Balance Lotes Horacio
    </h3>
  </div>
  <div className="overflow-x-auto">
                    {(() => {
                      const cosechasH = (cosechasAgrupadas[cultivoSeleccionado] ||
                        []).filter((c) =>
                        siembras.some(
                          (s) =>
                            s.campania === c.campania &&
                            s.lote === c.lote &&
                            s.productor === "Horacio"
                        )
                      )
                      const camH = camiones.filter((c) =>
                        cosechasH.some((cs) => cs.id === c.cosecha_id)
                      )
                      const kgCec = camH.reduce(
                        (s, c) =>
                          c.camion_para === "Cecilia"
                            ? s + (c.kg_campo || 0)
                            : s,
                        0
                      )
                      const kgHor = camH.reduce(
                        (s, c) =>
                          c.camion_para === "Horacio"
                            ? s + (c.kg_campo || 0)
                            : s,
                        0
                      )
                      const kgTot = kgCec + kgHor
                      const pctHor = kgTot
                        ? ((kgHor / kgTot) * 100).toFixed(1)
                        : "-"
                      const pctCec = kgTot
                        ? ((kgCec / kgTot) * 100).toFixed(1)
                        : "-"
                      const ideal = cultivoSeleccionado === "Soja" ? 33.5 : 27
                      const diff = kgTot
                        ? Math.round((ideal / 100) * kgTot - kgCec)
                        : 0
                      const diffCls =
                        diff > 0
                          ? "text-red-600 font-medium"
                          : diff < 0
                          ? "text-green-600 font-medium"
                          : "text-gray-600 font-medium"

                      return (
                        <div className="grid grid-cols-2 divide-x divide-gray-200">
                          {/* tabla Kg Campo */}
                          <table className="min-w-full table-fixed text-xs sm:text-sm">
                            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                              <tr>
                                <th className="px-1 py-1 sm:px-4 sm:py-2 text-left">
                                  Productor
                                </th>
                                <th className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  Kg Campo
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  Horacio
                                </td>
                                <td className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  {formatNumber(kgHor)}
                                </td>
                              </tr>
                              <tr className="border-t">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  Cecilia
                                </td>
                                <td className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  {formatNumber(kgCec)}
                                </td>
                              </tr>
                              <tr className="border-t bg-[#f1f4f3] font-semibold">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  Total
                                </td>
                                <td className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  {formatNumber(kgTot)}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* tabla Indicadores */}
                          <table className="min-w-full table-fixed text-xs sm:text-sm">
                            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                              <tr>
                                <th className="px-1 py-1 sm:px-4 sm:py-2 text-left">
                                  Porcentaje
                                </th>
                                <th className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  Valor
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  % Horacio
                                </td>
                                <td className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  {pctHor}%
                                </td>
                              </tr>
                              <tr className="border-t">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  % Cecilia
                                </td>
                                <td className="px-1 py-1 sm:px-4 sm:py-2 text-right">
                                  {pctCec}%
                                </td>
                              </tr>
                              <tr className="border-t bg-[#f1f4f3] font-semibold">
                                <td className="px-1 py-1 sm:px-4 sm:py-2">
                                  Dif. ideal
                                </td>
                                <td
                                  className={`px-1 py-1 sm:px-4 sm:py-2 text-right ${diffCls}`}
                                >
                                  {diff > 0 ? "+" : ""}
                                  {formatNumber(diff)} kg
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* 4) Resultado & Camiones */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resultado Lotes */}
                {renderTablaCultivo(cultivoSeleccionado)}

                 {/* Camiones del lote */}
                <div className="self-start rounded-xl border bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                    <h3 className="text-sm font-semibold text-[#235633] uppercase">
                      {loteSeleccionado
                        ? `Camiones ${loteSeleccionado.lote}`
                        : "Seleccioná un lote"}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    {loteSeleccionado && camionesFiltrados.length > 0 ? (
                      <table className="min-w-full table-fixed text-xs sm:text-sm">
                        <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-2 text-left">Fecha</th>
                            <th className="px-4 py-2 text-left">Destino</th>
                            <th className="px-4 py-2 text-left">Camión Para</th>
                            <th className="px-4 py-2 text-left">CTG</th>
                            <th className="px-4 py-2 text-right">Kg Campo</th>
                            <th className="px-4 py-2 text-right">Kg Destino</th>
                          </tr>
                        </thead>
                        <tbody>
                          {camionesFiltrados.map((c) => {
                            const f = new Date(c.fecha);
                            const fechaFmt = `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${String(f.getFullYear()).slice(-2)}`;
                            return (
                              <tr key={c.id} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-2">{fechaFmt}</td>
                                <td className="px-4 py-2">{c.destino}</td>
                                <td className="px-4 py-2">{c.camion_para}</td>
                                <td className="px-4 py-2">{c.ctg}</td>
                                <td className="px-4 py-2 text-right">{formatNumber(c.kg_campo)}</td>
                                <td className="px-4 py-2 text-right">{formatNumber(c.kg_destino)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-[#f1f4f3] font-semibold border-t">
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-left">Total</td>
                            <td className="px-4 py-2 text-right">
                              {formatNumber(camionesFiltrados.reduce((s, c) => s + (c.kg_campo || 0), 0))}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatNumber(camionesFiltrados.reduce((s, c) => s + (c.kg_destino || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="px-4 py-6 text-center text-gray-500">
                        {loteSeleccionado
                          ? (qNorm ? "No hay camiones que coincidan con la búsqueda." : "No hay camiones registrados.")
                          : "Seleccioná un lote."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default CosechasPage
