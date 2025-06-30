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
  const [usuarioEmail, setUsuarioEmail] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoCamion, setNuevoCamion] = useState({
    fecha: "",
    ctg: "",
    camion_para: "",
    chofer: "",
    chasis: "",
    kg_campo: "",
    kg_destino: "",
    destino: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuarioEmail(user?.email || "");
    };
    fetchUser();
  }, []);

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
      const cosechaIds = cosechasData.map((c) => c.id);
      if (!cosechaIds.length) {
        setCamionesPorDestino({});
        setLoading(false);
        return;
      }
      const { data: camionesData, error } = await supabase
        .from("camiones")
        .select("id, fecha, ctg, camion_para, chofer, chasis, kg_campo, kg_destino, destino, cosecha_id")
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
  }, [campaniaSeleccionada, mostrarFormulario]);

  if (!campaniaSeleccionada) {
    return <div className="p-4 text-center text-gray-600">Por favor selecciona una campaña.</div>;
  }

  const destinos = Object.keys(camionesPorDestino).sort();
  const headers = ["Fecha", "CTG", "Productor", "Chofer", "Chasis", "Kg Campo", "Kg Destino"];
  const listaAMostrar =
    destinoSeleccionado && camionesPorDestino[destinoSeleccionado]
      ? camionesPorDestino[destinoSeleccionado]
      : Object.values(camionesPorDestino).flat();

  return (
    <div className="px-4 sm:px-4 py-2 space-y-4">
      {/* 🔒 Botón Nuevo Camión visible solo para manudifrancesco1 */}
      {usuarioEmail === "manudifrancesco1@gmail.com" && (
        <div>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm"
          >
            {mostrarFormulario ? "Cancelar" : "Nuevo camión"}
          </button>
        </div>
      )}

      {/* 📝 Formulario para agregar camión */}
      {mostrarFormulario && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase.from("camiones").insert([{
              ...nuevoCamion,
              cosecha_id: null, // Podés agregar lógica para setear cosecha_id
            }]);
            if (!error) {
              setMostrarFormulario(false);
              setNuevoCamion({
                fecha: "",
                ctg: "",
                camion_para: "",
                chofer: "",
                chasis: "",
                kg_campo: "",
                kg_destino: "",
                destino: "",
              });
            } else {
              alert("Error al guardar camión");
            }
          }}
          className="bg-white p-4 border rounded-xl shadow-sm flex flex-col gap-2"
        >
          <div className="grid sm:grid-cols-2 gap-2">
            <input type="date" value={nuevoCamion.fecha} onChange={e => setNuevoCamion({ ...nuevoCamion, fecha: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="CTG" value={nuevoCamion.ctg} onChange={e => setNuevoCamion({ ...nuevoCamion, ctg: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="Camión para" value={nuevoCamion.camion_para} onChange={e => setNuevoCamion({ ...nuevoCamion, camion_para: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="Chofer" value={nuevoCamion.chofer} onChange={e => setNuevoCamion({ ...nuevoCamion, chofer: e.target.value })} className="border p-2 rounded" />
            <input type="text" placeholder="Chasis" value={nuevoCamion.chasis} onChange={e => setNuevoCamion({ ...nuevoCamion, chasis: e.target.value })} className="border p-2 rounded" />
            <input type="number" placeholder="Kg Campo" value={nuevoCamion.kg_campo} onChange={e => setNuevoCamion({ ...nuevoCamion, kg_campo: e.target.value })} className="border p-2 rounded" />
            <input type="number" placeholder="Kg Destino" value={nuevoCamion.kg_destino} onChange={e => setNuevoCamion({ ...nuevoCamion, kg_destino: e.target.value })} className="border p-2 rounded" />
            <input type="text" placeholder="Destino" value={nuevoCamion.destino} onChange={e => setNuevoCamion({ ...nuevoCamion, destino: e.target.value })} className="border p-2 rounded" />
          </div>
          <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm mt-2">
            Guardar camión
          </button>
        </form>
      )}

      {/* Tabs móviles */}
      <div className="sm:hidden">
        <select
          value={destinoSeleccionado || ""}
          onChange={(e) => setDestinoSeleccionado(e.target.value || null)}
          className="block w-full border-gray-300 rounded-md px-4 py-2 text-base"
        >
          <option value="">Todos los destinos</option>
          {destinos.map((dest) => (
            <option key={dest} value={dest} className="text-gray-700">
              {dest}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs escritorio */}
      <div className="hidden sm:flex justify-start border-b overflow-x-auto">
        {destinos.map((dest) => (
          <button
            key={dest}
            onClick={() => setDestinoSeleccionado(prev => (prev === dest ? null : dest))}
            className={`px-4 pb-2 text-sm sm:text-base font-medium whitespace-nowrap ${
              destinoSeleccionado === dest
                ? "text-green-800 border-b-2 border-green-800"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {dest}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-xl border bg-white shadow-sm w-full max-h-screen flex flex-col overflow-hidden">
        <div className="px-4 py-2 bg-[#f1f4f3] border-b">
          <h3 className="text-sm font-semibold text-[#235633] uppercase">Camiones ingresados</h3>
        </div>
        {loading ? (
          <div className="text-center flex-1 p-6 text-gray-500">Cargando camiones...</div>
        ) : !listaAMostrar.length ? (
          <div className="text-center flex-1 p-6 text-gray-500">No hay camiones.</div>
        ) : (
          <div className="flex-1 overflow-auto relative">
            <table className="min-w-full table-auto text-sm text-gray-700 divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50 text-gray-600 uppercase text-xs font-medium z-10">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-2 py-2 text-left bg-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listaAMostrar.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => mode === "editor" && (setEditandoFilaId(item.id), setFilaEditada(item))}
                  >
                    {["fecha", "ctg", "camion_para", "chofer", "chasis", "kg_campo", "kg_destino"].map((field) => (
                      <td key={field} className="px-2 py-2 whitespace-nowrap">
                        {editandoFilaId === item.id ? (
                          <input
                            value={field === "fecha"
                              ? new Date(filaEditada[field]).toISOString().split("T")[0]
                              : filaEditada[field] || ""}
                            onChange={(e) => setFilaEditada((prev) => ({ ...prev, [field]: e.target.value }))}
                            onBlur={async () => {
                              if (!filaEditada.id) return;
                              const { id, ...updates } = filaEditada;
                              await supabase.from("camiones").update(updates).eq("id", id);
                              setEditandoFilaId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const { id, ...updates } = filaEditada;
                                supabase.from("camiones").update(updates).eq("id", id);
                                setEditandoFilaId(null);
                              }
                            }}
                            className="border rounded-md px-2 py-1 text-sm w-full"
                          />
                        ) : field === "fecha" ? (
                          new Date(item[field]).toLocaleDateString("es-AR")
                        ) : (
                          item[field] || "-"
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
