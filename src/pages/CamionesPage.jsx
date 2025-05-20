import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const formatearNumero = (n) => n?.toLocaleString("es-AR");
const formatearFecha = (fecha) => {
  const f = new Date(fecha);
  return `${f.getDate().toString().padStart(2, "0")}/${(f.getMonth()+1)
    .toString()
    .padStart(2,"0")}/${f.getFullYear().toString().slice(2)}`;
};

export default function CamionesPage() {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();
  const [camiones, setCamiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [destinoExpandido, setDestinoExpandido] = useState(null);

  useEffect(() => {
    const fetchCamiones = async () => {
      setLoading(true);
      const { data } = await supabase.from("camiones").select("*");
      setCamiones(data || []);
      setLoading(false);
    };
    if (campaniaSeleccionada) fetchCamiones();
  }, [campaniaSeleccionada]);

  const camionesPorDestino = camiones
    .filter((c) => c.campania === campaniaSeleccionada)
    .reduce((acc, c) => {
      (acc[c.destino] = acc[c.destino] || []).push(c);
      return acc;
    }, {});

  const toggleDestino = (destino) =>
    setDestinoExpandido((prev) => (prev === destino ? null : destino));

  return (
    <div className="w-full min-h-screen pb-12 px-2">
      {campaniaSeleccionada && (
        <div className="bg-white border shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              Cargando camiones...
            </div>
          ) : (
            Object.entries(camionesPorDestino)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([destino, lista]) => (
                <div key={destino} className="border-b">
                  <button
                    onClick={() => toggleDestino(destino)}
                    className="w-full flex justify-between items-start gap-4 px-4 py-3 bg-[#f1f4f3] hover:bg-gray-100"
                  >
                    <div>
                      <div className="font-semibold">{destino}</div>
                      <div className="text-xs text-gray-600">
                        Cecilia:{" "}
                        {formatearNumero(
                          lista
                            .filter((c) => c.camion_para === "Cecilia")
                            .reduce((s, c) => s + (c.kg_campo || 0), 0)
                        )}{" "}
                        / {formatearNumero(
                          lista
                            .filter((c) => c.camion_para === "Cecilia")
                            .reduce((s, c) => s + (c.kg_destino || 0), 0)
                        )}{" "}
                        kg — Horacio:{" "}
                        {formatearNumero(
                          lista
                            .filter((c) => c.camion_para === "Horacio")
                            .reduce((s, c) => s + (c.kg_campo || 0), 0)
                        )}{" "}
                        / {formatearNumero(
                          lista
                            .filter((c) => c.camion_para === "Horacio")
                            .reduce((s, c) => s + (c.kg_destino || 0), 0)
                        )}{" "}
                        kg
                      </div>
                    </div>
                    {destinoExpandido === destino ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {destinoExpandido === destino && (
                    <div className="max-h-[600px] overflow-y-auto">
                      <table className="w-full text-sm text-gray-700 border-collapse">
                        <thead className="sticky top-0 bg-white border-b">
                          <tr>
                            {[
                              "Fecha",
                              "CTG",
                              "Camión Para",
                              "Chofer",
                              "Chasis",
                              "Kg Campo",
                              "Kg Destino",
                              "Acciones",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2 text-left text-xs uppercase"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lista.map((c) => (
                            <tr
                              key={c.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="px-4 py-2">
                                {formatearFecha(c.fecha)}
                              </td>
                              <td className="px-4 py-2">{c.ctg || "-"}</td>
                              <td className="px-4 py-2">{c.camion_para}</td>
                              <td className="px-4 py-2">{c.chofer}</td>
                              <td className="px-4 py-2">{c.chasis}</td>
                              <td className="px-4 py-2 text-right">
                                {formatearNumero(c.kg_campo)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                {formatearNumero(c.kg_destino)}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {mode === "editor" && (
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "¿Estás seguro de eliminar?"
                                        )
                                      ) {
                                        supabase
                                          .from("camiones")
                                          .delete()
                                          .eq("id", c.id)
                                          .then(() => {
                                            setCamiones((prev) =>
                                              prev.filter((x) => x.id !== c.id)
                                            );
                                          });
                                      }
                                    }}
                                  >
                                    <Trash2 size={16} className="text-red-500" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
