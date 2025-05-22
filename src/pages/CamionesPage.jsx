import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";
import { ChevronDown, ChevronUp } from "lucide-react";

const CamionesPage = () => {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();
  const [camionesPorDestino, setCamionesPorDestino] = useState({});
  const [destinoExpandido, setDestinoExpandido] = useState(null);
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

  const toggleDestino = destino => {
    setDestinoExpandido(prev => (prev === destino ? null : destino));
  };

  const formatearFecha = fecha => new Date(fecha).toLocaleDateString("es-AR");

  const handleInputChange = (e, campo) => setFilaEditada(prev => ({...prev, [campo]: e.target.value}));

  const guardarFilaEditada = async () => {
    if (!filaEditada.id) return;
    const { id, ...updates } = filaEditada;
    const { error } = await supabase.from("camiones").update(updates).eq("id", id);
    if (error) console.error("Error al guardar:", error.message);
    setEditandoFilaId(null);
  };

  if (!campaniaSeleccionada) return <div className="p-4 text-center text-gray-600">Por favor selecciona una campaña.</div>;

  const destinos = Object.keys(camionesPorDestino);
  // Cambiada columna 'Camión Para' a 'Productor'
  const headers = ['Fecha','CTG','Productor','Chofer','Chasis','Kg Campo','Kg Destino'];

  return (
    <div className="px-2 sm:px-6 py-4">
      <h1 className="text-lg sm:text-xl font-bold mb-3 text-gray-600">Destinos</h1>
      <div className="bg-white border shadow rounded-lg w-full overflow-hidden">
        {loading ? (
          <div className="text-center p-6 text-gray-500">Cargando camiones...</div>
        ) : !destinos.length ? (
          <div className="text-center p-6 text-gray-500">No hay camiones.</div>
        ) : (
          destinos.sort().map(destino => {
            const lista = camionesPorDestino[destino];
            return (
              <div key={destino} className="border-b first:border-t">
                <button
                  onClick={() => toggleDestino(destino)}
                  className="w-full flex justify-between items-center px-3 py-2 sm:px-4 sm:py-3 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <span className="text-base sm:text-lg font-semibold text-gray-600">{destino}</span>
                  {destinoExpandido===destino?<ChevronUp/>:<ChevronDown/>}
                </button>
                {destinoExpandido===destino&&(
                  <div className="overflow-y-auto max-h-[60vh] w-full">
                    <table className="w-full table-auto text-xs sm:text-sm text-gray-700 border-separate border-spacing-0">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b sticky top-0 z-10">
                        <tr>
                          {headers.map(h => (
                            <th key={h} className="px-2 py-1 sm:px-4 sm:py-2 text-left whitespace-nowrap w-min">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            {['fecha','ctg','camion_para','chofer','chasis','kg_campo','kg_destino'].map(field => (
                              <td key={field} className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">
                                {editandoFilaId===c.id ? (
                                  <input
                                    value={
                                      field==='fecha'
                                        ? formatearFecha(filaEditada[field])
                                        : filaEditada[field]||''
                                    }
                                    onChange={e => handleInputChange(e, field)}
                                    onBlur={guardarFilaEditada}
                                    onKeyDown={e => e.key==='Enter'&&(e.preventDefault(),guardarFilaEditada())}
                                    className="border rounded px-1 py-1 text-xs sm:text-sm w-full"
                                  />
                                ) : field==='fecha' ? (
                                  formatearFecha(c[field])
                                ) : (
                                  c[field]||'-'
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
            );
          })
        )}
      </div>
    </div>
  );
};
export default CamionesPage;
