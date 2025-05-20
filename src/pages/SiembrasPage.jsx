import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { Pencil, Save } from "lucide-react";
import { useCampaniaStore } from "@/store/campaniaStore";


const SiembrasPage = () => {
  const { mode } = useUIStore();
  const [siembras, setSiembras] = useState([]);
  const [campanias, setCampanias] = useState([]);
const { campaniaSeleccionada } = useCampaniaStore();  const [filaEditando, setFilaEditando] = useState(null);

  useEffect(() => {
    const fetchCampanias = async () => {
      const { data, error } = await supabase.from("siembras").select("campania");
      if (error) return console.error(error.message);
      const únicas = [...new Set(data.map((c) => c.campania))];
      setCampanias(únicas);
    };
    fetchCampanias();
  }, []);

  useEffect(() => {
    const fetchSiembras = async () => {
      const { data } = await supabase
        .from("siembras")
        .select("*")
        .eq("campania", campaniaSeleccionada);
      setSiembras(data || []);
    };
    if (campaniaSeleccionada) fetchSiembras();
  }, [campaniaSeleccionada]);

  const siembrasAgrupadas = siembras.reduce((acc, siembra) => {
    const cultivo = siembra.cultivo || "Sin cultivo";
    acc[cultivo] = acc[cultivo] || [];
    acc[cultivo].push(siembra);
    return acc;
  }, {});

  const handleEdit = (item) => {
    setFilaEditando({ ...item });
  };

  const handleChange = (campo, valor) => {
    setFilaEditando((prev) => ({ ...prev, [campo]: valor }));
  };

  const guardarCambios = async () => {
    const { id, ...resto } = filaEditando;
    const { error } = await supabase.from("siembras").update(resto).eq("id", id);
    if (error) {
      alert("Error al guardar");
    } else {
      const { data } = await supabase
        .from("siembras")
        .select("*")
        .eq("campania", campaniaSeleccionada);
      setSiembras(data || []);
      setFilaEditando(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      guardarCambios();
    }
  };

  
  return (
    <div className="w-full min-h-screen pb-12 px-4">
      <div className="flex items-end justify-between flex-wrap gap-4 pb-4">
        
      </div>

      {campaniaSeleccionada && (
        <div className="flex flex-wrap gap-6 justify-start">
          {Object.keys(siembrasAgrupadas).map((cultivo) => {
            const itemsOrdenados = [...siembrasAgrupadas[cultivo]].sort((a, b) => {
              const campoA = a.campo?.toLowerCase() || "";
              const campoB = b.campo?.toLowerCase() || "";
              if (campoA !== campoB)
                return campoA.localeCompare(campoB, "es", { sensitivity: "base" });
              return a.lote?.toLowerCase().localeCompare(b.lote?.toLowerCase() || "", "es", {
                sensitivity: "base",
              });
            });

            const totalHa = itemsOrdenados.reduce(
              (sum, item) => sum + (parseFloat(item.ha) || 0),
              0
            );

            return (
              <div
                key={cultivo}
                className="bg-white border rounded-xl overflow-hidden shadow inline-block min-w-[600px]"
              >
                <div className="bg-white px-4 pt-4 pb-2 flex items-baseline justify-between">
                  <h2 className="text-[15px] text-gray-800 font-bold uppercase">{cultivo}</h2>
                  <span className="text-sm text-primary font-bold">
                    {Math.round(totalHa).toLocaleString("es-AR")} ha
                  </span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f1f5f3] text-gray-700 text-[13px]">
                      <th className="text-left px-4 py-2">Campo</th>
                      <th className="text-left px-4 py-2">Lote</th>
                      <th className="text-left px-4 py-2">Ha</th>
                      <th className="text-left px-4 py-2">Variedad</th>
                      <th className="text-left px-4 py-2">Productor</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsOrdenados.map((item) => {
                      const editando = filaEditando?.id === item.id;
                      return (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          {["campo", "lote", "ha", "variedad", "productor"].map((campo) => (
                            <td key={campo} className="px-4 py-2">
                              {editando ? (
                                <input
                                  type={campo === "ha" ? "number" : "text"}
                                  value={filaEditando[campo]}
                                  onChange={(e) => handleChange(campo, e.target.value)}
                                  onBlur={guardarCambios}
                                  onKeyDown={handleKeyDown}
                                  className="w-full border rounded px-1 py-0.5 text-sm"
                                />
                              ) : (
                                item[campo]
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center">
                            {editando ? (
                              <button onClick={guardarCambios}>
                                <Save size={16} className="text-primary" />
                              </button>
                            ) : (
                              <button onClick={() => handleEdit(item)}>
                                <Pencil size={16} className="text-gray-600 hover:text-primary" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SiembrasPage;
