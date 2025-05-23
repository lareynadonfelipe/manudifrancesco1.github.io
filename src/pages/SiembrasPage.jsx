import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Pencil, Save } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCampaniaStore } from "@/store/campaniaStore";

const defaultCultivos = ["Soja", "Maíz", "Trigo"];

const SiembrasPage = () => {
  const { mode } = useUIStore();
  const { campaniaSeleccionada } = useCampaniaStore();
  const [siembras, setSiembras] = useState([]);
  const [filaEditandoId, setFilaEditandoId] = useState(null);
  const [filaEditada, setFilaEditada] = useState({});
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState(defaultCultivos[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSiembras = async () => {
      if (!campaniaSeleccionada) {
        setSiembras([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("siembras")
        .select("*")
        .eq("campania", campaniaSeleccionada);
      if (!error) setSiembras(data || []);
      setLoading(false);
    };
    fetchSiembras();
  }, [campaniaSeleccionada]);

  // Filtrar por cultivo seleccionado
  const cultivoData = siembras.filter(si => si.cultivo === cultivoSeleccionado);
  // Agrupar por campo
  const groupedByCampo = cultivoData.reduce((acc, si) => {
    const campo = si.campo || "Sin campo";
    acc[campo] = acc[campo] || [];
    acc[campo].push(si);
    return acc;
  }, {});

  const handleStartEdit = item => {
    setFilaEditandoId(item.id);
    setFilaEditada(item);
  };
  const handleSave = async () => {
    const { id, ...updates } = filaEditada;
    await supabase.from("siembras").update(updates).eq("id", id);
    setFilaEditandoId(null);
    const { data } = await supabase
      .from("siembras")
      .select("*")
      .eq("campania", campaniaSeleccionada);
    setSiembras(data || []);
  };
  const handleKeyDown = e => {
    if (e.key === "Enter") handleSave();
  };

  const headers = ["Lote", "Ha", "Variedad", "Productor"];

  return (
    <div className="px-4 sm:px-6 py-2">
      {!campaniaSeleccionada ? (
        <div className="p-4 text-center text-gray-600">
          Por favor selecciona una campaña en el navbar.
        </div>
      ) : (
        <>
          {/* Tabs de cultivos */}
          <div className="flex justify-evenly sm:justify-start border-b mb-4 overflow-x-auto bg-gray-50">
            {defaultCultivos.map(cult => (
              <button
                key={cult}
                onClick={() => setCultivoSeleccionado(cult)}
                className={`flex-1 sm:flex-none text-center px-4 py-2 text-lg sm:text-base font-medium whitespace-nowrap ${
                  cultivoSeleccionado === cult
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {cult}
              </button>
            ))}
          </div>

          {/* Cards por campo */}
          {Object.entries(groupedByCampo).length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              No hay siembras para este cultivo.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {Object.entries(groupedByCampo).map(([campo, items]) => {
                const totalHa = items.reduce((sum, i) => sum + (parseFloat(i.ha) || 0), 0);
                return (
                  <div
                    key={campo}
                    className="rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-[#f1f4f3] border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#235633] uppercase">
                        {campo}
                      </h3>
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(totalHa).toLocaleString("es-AR")} ha
                      </span>
                    </div>

                    {loading ? (
                      <div className="text-center p-6 text-gray-500">
                        Cargando siembras...
                      </div>
                    ) : !items.length ? (
                      <div className="text-center p-6 text-gray-500">
                        No hay siembras para {campo}.
                      </div>
                    ) : (
                      <div className="overflow-auto relative">
                        <table className="min-w-full table-auto text-sm text-gray-700 divide-y divide-gray-200">
                          <thead className="sticky top-0 bg-gray-50 text-gray-600 uppercase text-xs font-medium z-10">
                            <tr>
                              {headers.map(h => (
                                <th
                                  key={h}
                                  className="sticky top-0 px-4 py-2 text-left whitespace-nowrap bg-gray-50"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {items.map(item => (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-100 cursor-pointer"
                                onClick={() => mode === "editor" && handleStartEdit(item)}
                              >
                                {['lote', 'ha', 'variedad', 'productor'].map(field => (
                                  <td key={field} className="px-4 py-2 whitespace-nowrap">
                                    {filaEditandoId === item.id ? (
                                      <input
                                        type={field === 'ha' ? 'number' : 'text'}
                                        value={filaEditada[field] || ''}
                                        onChange={e =>
                                          setFilaEditada(prev => ({ ...prev, [field]: e.target.value }))
                                        }
                                        onBlur={handleSave}
                                        onKeyDown={handleKeyDown}
                                        className="border rounded-md px-2 py-1 text-sm w-full"
                                      />
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SiembrasPage;
