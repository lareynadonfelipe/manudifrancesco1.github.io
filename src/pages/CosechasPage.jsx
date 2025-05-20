import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";

const formatNumber = (n) => n?.toLocaleString("es-AR");

const CosechasPage = () => {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();

  const [cosechas, setCosechas] = useState([]);
  const [siembras, setSiembras] = useState([]);
  const [camiones, setCamiones] = useState([]);
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState("");
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cosechasData }, { data: siembrasData }, { data: camionesData }] =
        await Promise.all([
          supabase.from("cosechas").select("*"),
          supabase.from("siembras").select("*"),
          supabase.from("camiones").select("*"),
        ]);
      setCosechas(cosechasData || []);
      setSiembras(siembrasData || []);
      setCamiones(camionesData || []);
    };
    fetchData();
  }, []);

  // Agrupar cosechas por cultivo
  const cosechasAgrupadas = cosechas
    .filter((c) => c.campania === campaniaSeleccionada)
    .reduce((acc, item) => {
      acc[item.cultivo] = acc[item.cultivo] || [];
      acc[item.cultivo].push(item);
      return acc;
    }, {});

  // Camiones filtrados por lote seleccionado
  const camionesFiltrados = loteSeleccionado
    ? camiones.filter((c) => c.cosecha_id === loteSeleccionado.id)
    : [];

  // Resumen entregas por destino
  const resumenPorDestino = Object.values(
    camiones
      .filter((c) => {
        const cosecha = cosechas.find((cs) => cs.id === c.cosecha_id);
        return (
          cosecha?.campania === campaniaSeleccionada &&
          cosecha?.cultivo === cultivoSeleccionado
        );
      })
      .reduce((acc, c) => {
        const key = c.destino;
        if (!acc[key]) acc[key] = { destino: c.destino, cecilia: 0, horacio: 0 };
        if (c.camion_para === "Cecilia") acc[key].cecilia += c.kg_destino || 0;
        if (c.camion_para === "Horacio") acc[key].horacio += c.kg_destino || 0;
        return acc;
      }, {})
  );

  // Totales resumen destino
  const totalCeciliaResumen = resumenPorDestino.reduce((acc, r) => acc + r.cecilia, 0);
  const totalHoracioResumen = resumenPorDestino.reduce((acc, r) => acc + r.horacio, 0);
  const totalGeneralResumen = totalCeciliaResumen + totalHoracioResumen;

  // Render de tabla por cultivo
  const renderTablaCultivo = (cultivo) => {
    const items = cosechasAgrupadas[cultivo] || [];
    const totales = { ha: 0, kgCampo: 0, kgCecilia: 0, kgHoracio: 0 };

    const rows = items.map((item) => {
      const siembra = siembras.find(
        (s) => s.campania === item.campania && s.lote === item.lote
      );
      const ha = siembra?.ha || 0;
      const productor = siembra?.productor || "-";

      const camionesDelLote = camiones.filter((c) => c.cosecha_id === item.id);
      const kgCampo = camionesDelLote.reduce((acc, c) => acc + (c.kg_campo || 0), 0);
      const kgCecilia = camionesDelLote
        .filter((c) => c.camion_para === "Cecilia")
        .reduce((acc, c) => acc + (c.kg_campo || 0), 0);
      const kgHoracio = camionesDelLote
        .filter((c) => c.camion_para === "Horacio")
        .reduce((acc, c) => acc + (c.kg_campo || 0), 0);
      const rendimiento = ha ? (kgCampo / ha / 100).toFixed(2) : "-";

      totales.ha += ha;
      totales.kgCampo += kgCampo;
      totales.kgCecilia += kgCecilia;
      totales.kgHoracio += kgHoracio;

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
      );
    });

    const rendimientoProm = totales.ha
      ? (totales.kgCampo / totales.ha / 100).toFixed(2)
      : "-";

    return (
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-[#f1f4f3] border-b">
          <h3 className="text-sm font-semibold text-[#235633] uppercase">
            Resultado Lotes
          </h3>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
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
  };

  return (
    <div className="w-full min-h-screen pb-12 px-2">
      {/* Selector de cultivo */}
      <div className="flex gap-4 pb-4">
        {campaniaSeleccionada && (
          <select
            value={cultivoSeleccionado}
            onChange={(e) => {
              setCultivoSeleccionado(e.target.value);
              setLoteSeleccionado(null);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Seleccionar cultivo</option>
            {Object.keys(cosechasAgrupadas).map((cultivo) => (
              <option key={cultivo} value={cultivo}>
                {cultivo}
              </option>
            ))}
          </select>
        )}
      </div>

      {campaniaSeleccionada && cultivoSeleccionado && (
        <>
          {/* Primera fila: Entregas y Balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Entregas por destino */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                <h3 className="text-sm font-semibold text-[#235633] uppercase">
                  Entregas por destino
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="w-full text-sm">
                  <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Destino</th>
                      <th className="text-right px-4 py-2">Kg Cecilia</th>
                      <th className="text-right px-4 py-2">Kg Horacio</th>
                      <th className="text-right px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenPorDestino.map((r) => (
                      <tr key={r.destino} className="border-t">
                        <td className="px-4 py-2">{r.destino}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(r.cecilia)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(r.horacio)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(r.cecilia + r.horacio)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#f1f4f3] font-semibold">
                    <tr>
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right">{formatNumber(totalCeciliaResumen)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(totalHoracioResumen)}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(totalGeneralResumen)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Balance Lotes Horacio */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                <h3 className="text-sm font-semibold text-[#235633] uppercase">
                  Balance Lotes Horacio
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-4">
                {(() => {
                  const cosechasHoracio =
                    (cosechasAgrupadas[cultivoSeleccionado] || []).filter((c) =>
                      siembras.find(
                        (s) =>
                          s.campania === c.campania &&
                          s.lote === c.lote &&
                          s.productor === "Horacio"
                      )
                    );
                  const camionesHoracio = camiones.filter((c) =>
                    cosechasHoracio.some((cs) => cs.id === c.cosecha_id)
                  );

                  const kgCecilia = camionesHoracio.reduce(
                    (acc, c) => (c.camion_para === "Cecilia" ? acc + (c.kg_campo || 0) : acc),
                    0
                  );
                  const kgHoracio = camionesHoracio.reduce(
                    (acc, c) => (c.camion_para === "Horacio" ? acc + (c.kg_campo || 0) : acc),
                    0
                  );
                  const total = kgCecilia + kgHoracio;
                  const porcentajeCecilia = total
                    ? ((kgCecilia / total) * 100).toFixed(1)
                    : "-";
                  const idealPct = cultivoSeleccionado === "Soja" ? 33.5 : 27;
                  const diffKg = total
                    ? Math.round((idealPct / 100) * total - kgCecilia)
                    : 0;
                  const diffClass =
                    diffKg > 0
                      ? "text-red-600 font-medium"
                      : diffKg < 0
                      ? "text-green-600 font-medium"
                      : "text-gray-600";

                  return (
                    <table className="w-full text-sm">
                      <thead className="bg-[#f9faf9] text-gray-700 text-xs uppercase">
                        <tr>
                          <th className="text-leftpx-4 py-2">Kg Cecilia</th>
                          <th className="text-left px-4 py-2">Kg Horacio</th>
                          <th className="text-right px-4 py-2">% Cecilia</th>
                          <th className="text-right px-4 py-2">Dif. ideal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2">{formatNumber(kgCecilia)}</td>
                          <td className="px-4 py-2">{formatNumber(kgHoracio)}</td>
                          <td className="px-4 py-2 text-right">{porcentajeCecilia}%</td>
                          <td className={`px-4 py-2 text-right ${diffClass}`}>
                            {diffKg > 0 ? "+" : ""}
                            {formatNumber(diffKg)} kg
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Segunda fila: Resultado y Camiones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTablaCultivo(cultivoSeleccionado)}

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-[#f1f4f3] border-b">
                <h3 className="text-sm font-semibold text-[#235633] uppercase">
                  {loteSeleccionado ? `Camiones ${loteSeleccionado.lote}` : "Seleccioná un lote"}
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-4">
                {loteSeleccionado ? (
                  camionesFiltrados.length ? (
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
                          const f = new Date(c.fecha);
                          const fechaFormateada = `${f
                            .getDate()
                            .toString()
                            .padStart(2, "0")}/${(f.getMonth() + 1)
                            .toString()
                            .padStart(2, "0")}/${f.getFullYear().toString().slice(2)}`;
                          return (
                            <tr key={c.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">{fechaFormateada}</td>
                              <td className="px-4 py-2">{c.destino}</td>
                              <td className="px-4 py-2">{c.camion_para}</td>
                              <td className="px-4 py-2">{c.ctg}</td>
                              <td className="px-4 py-2 text-right">{formatNumber(c.kg_campo)}</td>
                              <td className="px-4 py-2 text-right">{formatNumber(c.kg_destino)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-500">No hay camiones registrados.</p>
                  )
                ) : (
                  <p className="text-sm text-gray-500">Ningún lote seleccionado.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CosechasPage;
