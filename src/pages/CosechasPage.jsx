// src/pages/CosechasPage.jsx
import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUIStore } from "@/store/uiStore"
import { useCampaniaStore } from "@/store/campaniaStore"

const formatNumber = (n) => n?.toLocaleString("es-AR")

const CosechasPage = () => {
  const { mode } = useUIStore()
  const { campaniaSeleccionada } = useCampaniaStore()

  const [cosechas, setCosechas] = useState([])
  const [siembras, setSiembras] = useState([])
  const [camiones, setCamiones] = useState([])
  const cultivos = ["Soja", "Maíz", "Trigo"]
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState(cultivos[0])
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)

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

  // Camiones filtrados
  const camionesFiltrados = loteSeleccionado
    ? camiones.filter((c) => c.cosecha_id === loteSeleccionado.id)
    : []

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

  const totalCeciliaResumen = resumenPorDestino.reduce((s, r) => s + r.cecilia, 0)
  const totalHoracioResumen = resumenPorDestino.reduce((s, r) => s + r.horacio, 0)
  const totalGeneralResumen = totalCeciliaResumen + totalHoracioResumen

  // Tabla de resultados por cultivo
  const renderTablaCultivo = (cultivo) => {
    const items = cosechasAgrupadas[cultivo] || []
    const totales = { ha: 0, kgCampo: 0, kgCecilia: 0, kgHoracio: 0 }

    const rows = items.map((item) => {
      const siembra = siembras.find(
        (s) => s.campania === item.campania && s.lote === item.lote
      )
      const ha = siembra?.ha || 0
      const productor = siembra?.productor || "-"
      const camionesDelLote = camiones.filter((c) => c.cosecha_id === item.id)
      const kgCampo = camionesDelLote.reduce((sum, c) => sum + (c.kg_campo || 0), 0)
      const kgCecilia = camionesDelLote
        .filter((c) => c.camion_para === "Cecilia")
        .reduce((sum, c) => sum + (c.kg_campo || 0), 0)
      const kgHoracio = camionesDelLote
        .filter((c) => c.camion_para === "Horacio")
        .reduce((sum, c) => sum + (c.kg_campo || 0), 0)
      const rendimiento = ha ? (kgCampo / ha / 100).toFixed(2) : "-"

      totales.ha += ha
      totales.kgCampo += kgCampo
      totales.kgCecilia += kgCecilia
      totales.kgHoracio += kgHoracio

      return (
        <tr
          key={item.id}
          className="border-t text-sm hover:bg-gray-50 cursor-pointer"
          onClick={() => setLoteSeleccionado(item)}
        >
          <td className="px-4 py-2">{item.lote}</td>
          <td className="px-4 py-2">{productor}</td>
          <td className="px-4 py-2 text-right">{formatNumber(ha)}</td>
          <td className="px-4 py-2 text-right">{rendimiento}</td>
          <td className="px-4 py-2 text-right">{formatNumber(kgCampo)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(kgCecilia)}</td>
          <td className="px-4 py-2 text-right">{formatNumber(kgHoracio)}</td>
        </tr>
      )
    })

    const rendimientoProm = totales.ha
      ? (totales.kgCampo / totales.ha / 100).toFixed(2)
      : "-"

    return (
<div className="flex flex-col min-h-full rounded-xl border bg-white shadow-sm overflow-hidden w-full">        <div className="px-4 py-2 bg-[#f1f4f3] border-b">
          <h3 className="text-sm font-semibold text-[#235633] uppercase">
            Resultado Lotes
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Lote</th>
                <th className="text-left px-4 py-2">Productor</th>
                <th className="text-right px-4 py-2">Ha</th>
                <th className="text-right px-4 py-2">Rto</th>
                <th className="text-right px-4 py-2">Kg Campo</th>
                <th className="text-right px-4 py-2">Kg Cecilia</th>
                <th className="text-right px-4 py-2">Kg Horacio</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
            <tfoot className="font-semibold border-t bg-[#f1f4f3]">
              <tr>
                <td className="px-4 py-2 text-left">Total</td>
                <td className="px-2 py-1"></td>
                <td className="px-2 py-1 text-right">{formatNumber(totales.ha)}</td>
                <td className="px-2 py-1 text-right">{rendimientoProm}</td>
                <td className="px-2 py-1 text-right">{formatNumber(totales.kgCampo)}</td>
                <td className="px-2 py-1 text-right">{formatNumber(totales.kgCecilia)}</td>
                <td className="px-2 py-1 text-right">{formatNumber(totales.kgHoracio)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen pb-12 px-2">
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


          {/* Mensaje si no hay datos */}
          {!(
            cosechasAgrupadas[cultivoSeleccionado] &&
            cosechasAgrupadas[cultivoSeleccionado].length
          ) ? (
            <p className="text-center text-gray-500 py-6">
              No hay resultados para {cultivoSeleccionado}.
            </p>
          ) : (
            <>
{/* Entregas y Balance */}
<div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6 mb-6">

  {/* 1) ENTREGAS: tabla pivot */}
  <div className="self-start rounded-xl border bg-white shadow-sm overflow-hidden w-full">
    <div className="px-4 py-2 bg-[#f1f4f3] border-b">
      <h3 className="text-sm font-semibold text-[#235633] uppercase">
        Entregas por destino
      </h3>
    </div>
    <div className="w-full overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-left"></th>
            {resumenPorDestino.map((r) => (
              <th key={r.destino} className="px-4 py-2 text-center">
                {r.destino}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="px-4 py-2 font-medium">Cecilia</td>
            {resumenPorDestino.map((r) => (
              <td key={r.destino} className="px-4 py-2 text-right">
                {formatNumber(r.cecilia)}
              </td>
            ))}
          </tr>
          <tr className="border-t">
            <td className="px-4 py-2 font-medium">Horacio</td>
            {resumenPorDestino.map((r) => (
              <td key={r.destino} className="px-4 py-2 text-right">
                {formatNumber(r.horacio)}
              </td>
            ))}
          </tr>
          <tr className="border-t bg-[#f1f4f3] font-semibold">
            <td className="px-4 py-2">Total</td>
            {resumenPorDestino.map((r) => (
              <td key={r.destino} className="px-4 py-2 text-right">
                {formatNumber(r.cecilia + r.horacio)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </div>

{/* Balance Lotes Horacio (sin padding en la card) */}
<div className="self-start rounded-xl border bg-white shadow-sm overflow-hidden w-full">
  {/* Header */}
  <div className="bg-[#f1f4f3] border-b">
    <h3 className="px-4 py-2 text-sm font-semibold text-[#235633] uppercase">
      Balance Lotes Horacio
    </h3>
  </div>

  {/* Cuerpo: sin padding — la tabla toca los bordes */}
  <div className="overflow-x-auto">
    {(() => {
      // Cálculos…
      const cosechas = (cosechasAgrupadas[cultivoSeleccionado] || []).filter(
        (c) =>
          siembras.some(
            (s) =>
              s.campania === c.campania &&
              s.lote === c.lote &&
              s.productor === "Horacio"
          )
      )
      const camHor = camiones.filter((c) =>
        cosechas.some((cs) => cs.id === c.cosecha_id)
      )
      const kgCec  = camHor.reduce((sum, c) => c.camion_para === "Cecilia" ? sum + (c.kg_campo||0) : sum, 0)
      const kgHor  = camHor.reduce((sum, c) => c.camion_para === "Horacio"  ? sum + (c.kg_campo||0) : sum, 0)
      const kgTot  = kgCec + kgHor
      const pctCec = kgTot ? ((kgCec/kgTot)*100).toFixed(1) : "-"
      const pctHor = kgTot ? ((kgHor/kgTot)*100).toFixed(1) : "-"
      const ideal  = cultivoSeleccionado === "Soja" ? 33.5 : 27
      const diff   = kgTot ? Math.round((ideal/100)*kgTot - kgCec) : 0
      const diffCls =
        diff >  0 ? "text-red-600 font-medium" :
        diff <  0 ? "text-green-600 font-medium" :
                     "text-gray-600 font-medium"

      return (
        <div className="grid grid-cols-2 divide-x divide-gray-200">
          {/* Tabla 1 */}
          <table className="min-w-full text-sm">
            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Productor</th>
                <th className="px-4 py-2 text-right">Kg Campo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Horacio</td>
                <td className="px-4 py-2 text-right">{formatNumber(kgHor)}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Cecilia</td>
                <td className="px-4 py-2 text-right">{formatNumber(kgCec)}</td>
              </tr>
              <tr className="border-t bg-[#f1f4f3] font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{formatNumber(kgTot)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tabla 2 */}
          <table className="min-w-full text-sm">
            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Porcentaje</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">% Horacio</td>
                <td className="px-4 py-2 text-right">{pctHor}%</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">% Cecilia</td>
                <td className="px-4 py-2 text-right">{pctCec}%</td>
              </tr>
              <tr className="border-t bg-[#f1f4f3] font-semibold">
                <td className="px-4 py-2">Dif. ideal</td>
                <td className={`px-4 py-2 text-right ${diffCls}`}>
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


              {/* Resultado & Camiones */}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:space-x-0">              {renderTablaCultivo(cultivoSeleccionado)}
                {/* Camiones del lote */}
                <div className="self-start rounded-xl border bg-white shadow-sm overflow-hidden w-full">
                  <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                    <h3 className="text-sm font-semibold text-[#235633] uppercase">
                      {loteSeleccionado
                        ? `Camiones ${loteSeleccionado.lote}`
                        : "Seleccioná un lote"}
                    </h3>
                  </div>
                  <div className="w-full overflow-x-auto">
                    {loteSeleccionado && camionesFiltrados.length ? (
                      (() => {
                        const totCampo = camionesFiltrados.reduce(
                          (s, c) => s + (c.kg_campo || 0),
                          0
                        )
                        const totDestino = camionesFiltrados.reduce(
                          (s, c) => s + (c.kg_destino || 0),
                          0
                        )
                        return (
                          <table className="w-full text-sm">
                            <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                              <tr>
                                <th className="text-left px-4 py-2">Fecha</th>
                                <th className="text-left px-4 py-2">Destino</th>
                                <th className="text-left px-4 py-2">Camión Para</th>
                                <th className="text-left px-4 py-2">CTG</th>
                                <th className="text-right px-4 py-2">Kg Campo</th>
                                <th className="text-right px-4 py-2">Kg Destino</th>
                              </tr>
                            </thead>
                            <tbody>
                              {camionesFiltrados.map((c) => {
                                const f = new Date(c.fecha)
                                const fechaFmt = `${String(f.getDate()).padStart(
                                  2,
                                  "0"
                                )}/${String(f.getMonth() + 1).padStart(2, "0")}/${String(
                                  f.getFullYear()
                                ).slice(-2)}`
                                return (
                                  <tr
                                    key={c.id}
                                    className="border-t hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-2">{fechaFmt}</td>
                                    <td className="px-4 py-2">{c.destino}</td>
                                    <td className="px-4 py-2">{c.camion_para}</td>
                                    <td className="px-4 py-2">{c.ctg}</td>
                                    <td className="px-4 py-2 text-right">
                                      {formatNumber(c.kg_campo)}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {formatNumber(c.kg_destino)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="font-semibold border-t bg-[#f1f4f3]">
                              <tr>
                                <td className="px-4 py-2 text-left">Total</td>
                                <td className="px-4 py-2"></td>
                                <td className="px-4 py-2"></td>
                                <td className="px-4 py-2"></td>
                                <td className="px-4 py-2 text-right">
                                  {formatNumber(totCampo)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {formatNumber(totDestino)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        )
                      })()
                    ) : (
                      <p className="text-center text-gray-500 py-6">
                        {loteSeleccionado
                          ? "No hay camiones registrados."
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
