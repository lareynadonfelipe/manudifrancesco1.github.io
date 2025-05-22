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
      if (cosechaIds.length === 0) {
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
        if (!acc[dest]) acc[dest] = [];
        acc[dest].push(camion);
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

  const handleInputChange = (e, campo) => {
    setFilaEditada(prev => ({ ...prev, [campo]: e.target.value }));
  };

  const guardarFilaEditada = async () => {
    if (!filaEditada.id) return;
    const { id, ...updates } = filaEditada;
    const { error } = await supabase
      .from("camiones")
      .update(updates)
      .eq("id", id);
    if (error) console.error("Error al guardar:", error.message);
    else {
      setCamionesPorDestino(prev => {
        const nuevo = {};
        Object.entries(prev).forEach(([dest, lista]) => {
          nuevo[dest] = lista.map(c => (c.id === id ? filaEditada : c));
        });
        return nuevo;
      });
    }
    setEditandoFilaId(null);
  };

  if (!campaniaSeleccionada) {
    return (
      <div className="p-6 text-center text-gray-600">
        Por favor selecciona una campaña para ver los camiones.
      </div>
    );
  }

  const destinos = Object.keys(camionesPorDestino);
  const headers = ['Fecha', 'CTG', 'Camión Para', 'Chofer', 'Chasis', 'Kg Campo', 'Kg Destino'];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4 text-gray-600">Destinos</h1>
      <div className="bg-white border shadow-sm rounded-lg w-full overflow-hidden">
        {loading ? (
          <div className="text-center py-6 text-gray-500 text-sm">Cargando camiones...</div>
        ) : destinos.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay camiones para esta campaña.</div>
        ) : (
          destinos.sort().map(destino => {
            const lista = camionesPorDestino[destino];
            return (
              <div key={destino} className="border-b first:border-t">
                <button
                  onClick={() => toggleDestino(destino)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <span className="text-lg font-semibold text-gray-600">{destino}</span>
                  {destinoExpandido === destino ? <ChevronUp /> : <ChevronDown />}
                </button>
                {destinoExpandido === destino && (
                  <div className="overflow-y-auto max-h-[60vh] w-full">
                    <table className="w-full table-auto text-sm text-gray-700 border-separate border-spacing-0">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b sticky top-0 z-10">
                        <tr>
                          {headers.map(header => (
                            <th key={header} className="px-4 py-2 text-left whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map(camion => (
                          <tr
                            key={camion.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => mode === 'editor' && (setEditandoFilaId(camion.id), setFilaEditada(camion))}
                          >
                            {['fecha', 'ctg', 'camion_para', 'chofer', 'chasis', 'kg_campo', 'kg_destino'].map(campo => (
                              <td key={campo} className="px-4 py-2 whitespace-nowrap">
                                {editandoFilaId === camion.id ? (
                                  <input
                                    value={campo === 'fecha' ? formatearFecha(filaEditada[campo]) : filaEditada[campo] ?? ''}
                                    onChange={e => handleInputChange(e, campo)}
                                    onBlur={guardarFilaEditada}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), guardarFilaEditada())}
                                    className="border rounded-md px-2 py-1 text-sm w-full"
                                  />
                                ) : campo === 'fecha' ? (
                                  formatearFecha(camion[campo])
                                ) : (
                                  camion[campo] ?? '-'
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
