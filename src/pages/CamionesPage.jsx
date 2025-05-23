import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";

const CamionesPage = () => {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();
  const [camionesPorDestino, setCamionesPorDestino] = useState({});
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editandoFilaId, setEditandoFilaId] = useState(null);
  const [filaEditada, setFilaEditada] = useState({});

  useEffect(() => {
    const fetchCamiones = async () => {
      if (!campaniaSeleccionada) {
        setCamionesPorDestino({});
        return;
      }
      setLoading(true);
      const { data: cosechasData, error: errorC } = await supabase
        .from("cosechas")
        .select("id")
        .eq("campania", campaniaSeleccionada);
      if (errorC) {
        console.error("Error fetching cosechas:", errorC.message);
        setLoading(false);
        return;
      }
      const cosechaIds = cosechasData.map(c => c.id);
      if (!cosechaIds.length) {
        setCamionesPorDestino({});
        setLoading(false);
        return;
      }
      const { data: camionesData, error } = await supabase
        .from("camiones")
        .select(
          "id, fecha, ctg, camion_para, chofer, chasis, kg_campo, kg_destino, destino, cosecha_id"
        )
        .in("cosecha_id", cosechaIds);
      if (error) {
        console.error("Error fetching camiones:", error.message);
        setLoading(false);
        return;
      }
      // Agrupar camiones por destino
      const agrupado = camionesData.reduce((acc, camion) => {
        const dest = camion.destino || "Sin destino";
        (acc[dest] = acc[dest] || []).push(camion);
        return acc;
      }, {});
      setCamionesPorDestino(agrupado);
      setLoading(false);
    };
    fetchCamiones();
  }, [campaniaSeleccionada]);

  if (!campaniaSeleccionada) {
    return <div className="p-4 text-center text-gray-600">Por favor selecciona una campaña.</div>;
  }

  const destinos = Object.keys(camionesPorDestino).sort();
  const headers = ['Fecha', 'CTG', 'Productor', 'Chofer', 'Chasis', 'Kg Campo', 'Kg Destino'];
  const listaAMostrar =
    destinoSeleccionado && camionesPorDestino[destinoSeleccionado]
      ? camionesPorDestino[destinoSeleccionado]
      : Object.values(camionesPorDestino).flat();

  return (
    <div className="px-2 sm:px-6 py-4">
      {/* Tabs fuera de la card */}
      <div className="flex justify-evenly sm:justify-start border-b mb-4 overflow-x-auto">
        {destinos.map(dest => (
          <button
            key={dest}
            onClick={() => setDestinoSeleccionado(prev => (prev === dest ? null : dest))}
            className={`flex-1 sm:flex-none text-center px-4 py-2 text-lg sm:text-base font-medium whitespace-normal sm:whitespace-nowrap ${
              destinoSeleccionado === dest
                ? 'text-green-800 border-b-2 border-green-800'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {dest}
          </button>
        ))}
      </div>

      {/* Card principal */}
      <div className="rounded-xl border bg-white shadow-sm w-full max-h-screen flex flex-col overflow-hidden">
        {/* Encabezado como en CosechasPage */}
        <div className="px-4 py-4 sm:px-4 sm:py-4 bg-[#f1f4f3] border-b">
          <h3 className="text-sm font-semibold text-[#235633] uppercase">Camiones ingresados</h3>
        </div>

        {/* Contenido de la tabla */}
        {loading ? (
          <div className="text-center flex-1 p-6 text-gray-500">Cargando camiones...</div>
        ) : !listaAMostrar.length ? (
          <div className="text-center flex-1 p-6 text-gray-500">No hay camiones.</div>
        ) : (
          <div className="flex-1 overflow-auto relative">
            <table className="min-w-full table-auto text-sm text-gray-700 divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50 text-gray-600 uppercase text-xs font-medium z-10">
                <tr>
                  {headers.map(h => (
                    <th
                      key={h} className="sticky top-0 px-1 py-1 sm:px-4 sm:py-2 text-left whitespace-nowrap bg-gray-50 w-min"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listaAMostrar.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => mode === 'editor' && (setEditandoFilaId(item.id), setFilaEditada(item))}
                  >
                    {['fecha','ctg','camion_para','chofer','chasis','kg_campo','kg_destino'].map(field => (
                      <td key={field} className="px-1 py-3 sm:px-4 sm:py-2 whitespace-nowrap w-min">
                        {editandoFilaId === item.id ? (
                          <input
                            value={field === 'fecha' ? new Date(filaEditada[field]).toLocaleDateString('es-AR') : filaEditada[field] || ''}
                            onChange={e => setFilaEditada(prev => ({ ...prev, [field]: e.target.value }))}
                            onBlur={async () => {
                              if (!filaEditada.id) return;
                              const { id, ...updates } = filaEditada;
                              await supabase.from('camiones').update(updates).eq('id', id);
                              setEditandoFilaId(null);
                            }}
                            onKeyDown={e =>
                              e.key === 'Enter' &&
                              (e.preventDefault(),
                              (async () => {
                                if (!filaEditada.id) return;
                                const { id, ...updates } = filaEditada;
                                await supabase.from('camiones').update(updates).eq('id', id);
                                setEditandoFilaId(null);
                              })())
                            }
                            className="border rounded-md px-2 py-1 text-sm w-full"
                          />
                        ) : field === 'fecha' ? (
                          new Date(item[field]).toLocaleDateString('es-AR')
                        ) : (
                          item[field] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CamionesPage;
