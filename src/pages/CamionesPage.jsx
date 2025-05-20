// 📦 Importaciones y estado
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useCampaniaStore } from "@/store/campaniaStore";

// 🌾 Página principal de Camiones
const CamionesPage = () => {
  const { mode } = useUIStore();
  const [cosechas, setCosechas] = useState([]);
  const { campaniaSeleccionada } = useCampaniaStore();
  const [camionParaSeleccionado, setCamionParaSeleccionado] = useState("");
  const [camiones, setCamiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [destinoExpandido, setDestinoExpandido] = useState(null);

  const [ctgBusqueda, setCtgBusqueda] = useState("");
  const [coincidenciasBusqueda, setCoincidenciasBusqueda] = useState([]);
  const [editandoKgDestinoId, setEditandoKgDestinoId] = useState(null);
  const [kgDestinoInput, setKgDestinoInput] = useState("");
  const [editandoFilaId, setEditandoFilaId] = useState(null);
  const [filaEditada, setFilaEditada] = useState({});
  // 🔁 Obtener campañas y camiones
  const fetchCosechas = async () => {
    const { data } = await supabase.from("cosechas").select("id, campania");
    const unicas = [...new Set(data.map((c) => c.campania))].sort();
    setCosechas(unicas);
  };

  const fetchCamiones = async () => {
    if (!campaniaSeleccionada) return;
    setLoading(true);

    const { data: cosechasCampania } = await supabase
      .from("cosechas")
      .select("id")
      .eq("campania", campaniaSeleccionada);

    const cosechaIds = cosechasCampania.map((c) => c.id);

    const { data: camionesData } = await supabase
      .from("camiones")
      .select("*")
      .in("cosecha_id", cosechaIds);

    const ordenados = camionesData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    setCamiones(ordenados);
    setLoading(false);
  };

  // 🧮 Efectos
  useEffect(() => {
    fetchCosechas();
  }, []);

  useEffect(() => {
    fetchCamiones();
    setCoincidenciasBusqueda([]);
    setCtgBusqueda("");
    setCamionParaSeleccionado("");
  }, [campaniaSeleccionada]);

  useEffect(() => {
    if (ctgBusqueda.trim() === "") {
      setCoincidenciasBusqueda([]);
      return;
    }
    const resultados = camiones.filter((c) =>
      c.ctg?.toString().includes(ctgBusqueda.trim())
    );
    setCoincidenciasBusqueda(resultados);
  }, [ctgBusqueda, camiones]);

  // 🧮 Filtrado por camión_para y agrupación por destino
  const camionesFiltrados = camionParaSeleccionado
    ? camiones.filter((c) => c.camion_para === camionParaSeleccionado)
    : camiones;

  const camionesPorDestino = camionesFiltrados.reduce((acc, camion) => {
    const destino = camion.destino || "Sin destino";
    if (!acc[destino]) acc[destino] = [];
    acc[destino].push(camion);
    return acc;
  }, {});
  // 🛠️ Funciones de edición y eliminación
  const toggleDestino = (destino) => {
    setDestinoExpandido((prev) => (prev === destino ? null : destino));
  };

  const handleInputChange = (e, field) => {
    setFilaEditada((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const guardarFilaEditada = async () => {
    if (!editandoFilaId) return;
    await supabase.from("camiones").update(filaEditada).eq("id", editandoFilaId);
    setEditandoFilaId(null);
    setFilaEditada({});
    fetchCamiones();
  };

  const guardarBusquedaKgDestino = async (id) => {
    const camion = coincidenciasBusqueda.find((c) => c.id === id);
    if (!camion) return;

    const updates = {
      destino: camion.destino ?? "",
      kg_destino: Number(kgDestinoInput || camion.kg_destino || 0),
    };

    const { error } = await supabase.from("camiones").update(updates).eq("id", id);

    if (!error) {
      setEditandoKgDestinoId(null);
      setKgDestinoInput("");
      fetchCamiones();
    } else {
      console.error("Error al guardar:", error.message);
    }
  };

  const eliminarCamion = async (id) => {
    const confirmar = window.confirm("¿Estás seguro de eliminar?");
    if (!confirmar) return;
    await supabase.from("camiones").delete().eq("id", id);
    fetchCamiones();
  };

  const formatearFecha = (fecha) => {
    const f = new Date(fecha);
    return `${f.getDate().toString().padStart(2, "0")}/${(f.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${f.getFullYear().toString().slice(2)}`;
  };

  return (
    <div className="flex flex-col min-h-screen gap-4">
      {/* 🎛️ Filtros de campaña y camión_para + Búsqueda de CTG */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4">
      

          {campaniaSeleccionada && (
            <select
              value={camionParaSeleccionado}
              onChange={(e) => setCamionParaSeleccionado(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Filtrar por productor</option>
              <option value="Cecilia">Cecilia</option>
              <option value="Horacio">Horacio</option>
            </select>
          )}
        </div>

        {campaniaSeleccionada && (
          <input
            type="text"
            placeholder="Buscar CTG"
            value={ctgBusqueda}
            onChange={(e) => setCtgBusqueda(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-40"
          />
        )}
      </div>
      {/* 🔎 Resultados de búsqueda por CTG */}
      {coincidenciasBusqueda.length > 0 && (
        <div className="border rounded-xl bg-white shadow-sm overflow-x-auto w-full max-w-full">
          <table className="text-sm text-gray-700 w-full">
            <thead className="bg-[#f1f4f3] text-gray-600 uppercase text-xs border-b">
              <tr>
                <th className="px-4 py-2 text-left">Destino</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">CTG</th>
                <th className="px-4 py-2 text-left">Camión Para</th>
                <th className="px-4 py-2 text-left">Chofer</th>
                <th className="px-4 py-2 text-left">Chasis</th>
                <th className="px-4 py-2 text-left">Kg Campo</th>
                <th className="px-4 py-2 text-left">Kg Destino</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coincidenciasBusqueda.map((camion) => (
                <tr
                  key={camion.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (mode === "editor") {
                      setEditandoKgDestinoId(camion.id);
                      setKgDestinoInput(camion.kg_destino ?? "");
                    }
                  }}
                >
                  <td className="px-4 py-2">
                    {editandoKgDestinoId === camion.id ? (
                      <input
                        value={camion.destino || ""}
                        onChange={(e) =>
                          setCoincidenciasBusqueda((prev) =>
                            prev.map((item) =>
                              item.id === camion.id
                                ? { ...item, destino: e.target.value }
                                : item
                            )
                          )
                        }
                        onBlur={() => guardarBusquedaKgDestino(camion.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarBusquedaKgDestino(camion.id);
                        }}
                        className="border rounded-md px-2 py-1 text-sm w-32"
                      />
                    ) : (
                      camion.destino ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-2">{formatearFecha(camion.fecha)}</td>
                  <td className="px-4 py-2">{camion.ctg}</td>
                  <td className="px-4 py-2">{camion.camion_para}</td>
                  <td className="px-4 py-2">{camion.chofer}</td>
                  <td className="px-4 py-2">{camion.chasis}</td>
                  <td className="px-4 py-2">{camion.kg_campo}</td>
                  <td className="px-4 py-2">
                    {editandoKgDestinoId === camion.id ? (
                      <input
                        type="number"
                        value={kgDestinoInput}
                        onChange={(e) => setKgDestinoInput(e.target.value)}
                        onBlur={() => guardarBusquedaKgDestino(camion.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarBusquedaKgDestino(camion.id);
                        }}
                        className="border rounded-md px-2 py-1 text-sm w-24"
                      />
                    ) : (
                      camion.kg_destino ?? "-"
                    )}
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    {editandoKgDestinoId === camion.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmar = window.confirm("¿Estás seguro de eliminar?");
                          if (confirmar) eliminarCamion(camion.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 📊 Tabla general agrupada por destino */}
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
                    className="w-full flex justify-between items-center px-4 py-3 text-left text-sm font-medium bg-[#f1f4f3] hover:bg-gray-100 text-gray-700"
                  >
                    <span>{destino}</span>
                    {destinoExpandido === destino ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {destinoExpandido === destino && (
                    <div className="max-h-[600px] overflow-y-auto">
                      <table className="text-sm text-gray-700 border-collapse w-full">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2 text-left bg-white">Fecha</th>
                            <th className="px-4 py-2 text-left bg-white">CTG</th>
                            <th className="px-4 py-2 text-left bg-white">Camión Para</th>
                            <th className="px-4 py-2 text-left bg-white">Chofer</th>
                            <th className="px-4 py-2 text-left bg-white">Chasis</th>
                            <th className="px-4 py-2 text-left bg-white">Kg Campo</th>
                            <th className="px-4 py-2 text-left bg-white">Kg Destino</th>
                            <th className="px-4 py-2 text-center bg-white">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lista.map((camion) => (
                            <tr
                              key={camion.id}
                              className="border-b hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                if (mode === "editor") {
                                  setEditandoFilaId(camion.id);
                                  setFilaEditada(camion);
                                }
                              }}
                            >
                              {["fecha", "ctg", "camion_para", "chofer", "chasis", "kg_campo", "kg_destino"].map((campo) => (
                                <td key={campo} className="px-4 py-2 whitespace-nowrap">
                                  {editandoFilaId === camion.id ? (
                                    <input
                                      value={
                                        campo === "fecha"
                                          ? formatearFecha(filaEditada[campo])
                                          : filaEditada[campo] ?? ""
                                      }
                                      onChange={(e) => handleInputChange(e, campo)}
                                      onBlur={guardarFilaEditada}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          guardarFilaEditada();
                                        }
                                      }}
                                      className="border rounded-md px-2 py-1 text-sm w-full"
                                    />
                                  ) : campo === "fecha" ? (
                                    formatearFecha(camion[campo])
                                  ) : (
                                    camion[campo] ?? "-"
                                  )}
                                </td>
                              ))}

                              {/* 🗑️ Botón eliminar en columna de acciones */}
                              <td className="px-2 py-2 text-center align-middle">
                                {editandoFilaId === camion.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const confirmar = window.confirm("¿Estás seguro de eliminar?");
                                      if (confirmar) eliminarCamion(camion.id);
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={16} />
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
};

// ✅ Exportar componente principal
export default CamionesPage;
