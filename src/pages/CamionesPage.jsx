// src/pages/CamionesPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const CamionesPage = () => {
  const { mode } = useUIStore();
  const [campaniaSeleccionada, setCampaniaSeleccionada] = useState("");
  const [camionesPorDestino, setCamionesPorDestino] = useState({});
  const [destinoExpandido, setDestinoExpandido] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editandoFilaId, setEditandoFilaId] = useState(null);
  const [filaEditada, setFilaEditada] = useState({});

  useEffect(() => {
    // Lógica para cargar camionesPorDestino según campaniaSeleccionada
  }, [campaniaSeleccionada]);

  const toggleDestino = (destino) => {
    setDestinoExpandido(prev => (prev === destino ? null : destino));
  };

  const formatearNumero = (n) => n?.toLocaleString("es-AR");
  const formatearFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-AR");
  };

  const handleInputChange = (e, campo) => {
    setFilaEditada(prev => ({ ...prev, [campo]: e.target.value }));
  };

  const guardarFilaEditada = async () => {
    // Lógica para guardar los cambios en Supabase
    setEditandoFilaId(null);
  };

  const eliminarCamion = async (id) => {
    // Lógica para eliminar camión de Supabase y actualizar estado local
    setCamionesPorDestino(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([dest, lista]) => [
          dest,
          lista.filter(c => c.id !== id)
        ])
      )
    );
  };

  return (
    <div>
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
                    className="w-full flex justify-between items-start gap-4 px-4 py-3 text-left text-sm font-medium bg-[#f1f4f3] hover:bg-gray-100 text-gray-700"
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{destino}</span>
                      <span className="text-xs text-gray-600">
                        Cecilia: {formatearNumero(
                          lista
                            .filter(c => c.camion_para === "Cecilia")
                            .reduce((acc, c) => acc + (c.kg_campo || 0), 0)
                        )} / {formatearNumero(
                          lista
                            .filter(c => c.camion_para === "Cecilia")
                            .reduce((acc, c) => acc + (c.kg_destino || 0), 0)
                        )} kg — Horacio: {formatearNumero(
                          lista
                            .filter(c => c.camion_para === "Horacio")
                            .reduce((acc, c) => acc + (c.kg_campo || 0), 0)
                        )} / {formatearNumero(
                          lista
                            .filter(c => c.camion_para === "Horacio")
                            .reduce((acc, c) => acc + (c.kg_destino || 0), 0)
                        )} kg
                      </span>
                    </span>
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
                          {lista.map(camion => (
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
                              {[
                                "fecha",
                                "ctg",
                                "camion_para",
                                "chofer",
                                "chasis",
                                "kg_campo",
                                "kg_destino"
                              ].map(campo => (
                                <td key={campo} className="px-4 py-2 whitespace-nowrap">
                                  {editandoFilaId === camion.id ? (
                                    <input
                                      value={
                                        campo === "fecha"
                                          ? formatearFecha(filaEditada[campo])
                                          : filaEditada[campo] ?? ""
                                      }
                                      onChange={e => handleInputChange(e, campo)}
                                      onBlur={guardarFilaEditada}
                                      onKeyDown={e => {
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

                              <td className="px-2 py-2 text-center align-middle">
                                {editandoFilaId === camion.id && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (window.confirm("¿Estás seguro de eliminar?")) {
                                        eliminarCamion(camion.id);
                                      }
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

export default CamionesPage;
