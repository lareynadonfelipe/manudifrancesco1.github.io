import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUIStore } from "@/store/uiStore";
import { Pencil, Save } from "lucide-react";
import { useCampaniaStore } from "@/store/campaniaStore";

export default function SiembrasPage() {
  const { mode } = useUIStore();
  const [siembras, setSiembras] = useState([]);
  const [campanias, setCampanias] = useState([]);
  const { campaniaSeleccionada, setCampaniaSeleccionada } = useCampaniaStore();
  const [filaEditando, setFilaEditando] = useState(null);

  useEffect(() => {
    const fetchCampanias = async () => {
      const { data, error } = await supabase
        .from("siembras")
        .select("campania");
      if (error) return console.error(error.message);
      setCampanias([...new Set(data.map((c) => c.campania))]);
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

  const siembrasAgrupadas = siembras.reduce((acc, s) => {
    const cultivo = s.cultivo || "Sin cultivo";
    (acc[cultivo] = acc[cultivo] || []).push(s);
    return acc;
  }, {});

  const handleEdit = (item) => setFilaEditando({ ...item });
  const handleChange = (field, val) =>
    setFilaEditando((prev) => ({ ...prev, [field]: val }));

  const guardarCambios = async () => {
    const { id, ...resto } = filaEditando;
    const { error } = await supabase
      .from("siembras")
      .update(resto)
      .eq("id", id);
    if (error) return alert("Error al guardar");
    const { data } = await supabase
      .from("siembras")
      .select("*")
      .eq("campania", campaniaSeleccionada);
    setSiembras(data || []);
    setFilaEditando(null);
  };

  const handleKeyDown = (e) => e.key === "Enter" && guardarCambios();

  return (
    <div className="w-full min-h-screen pb-12 px-4">
      <div className="flex items-end justify-between flex-wrap gap-4 pb-4">
        <select
          value={campaniaSeleccionada}
          onChange={(e) => setCampaniaSeleccionada(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">Seleccionar campaña</option>
          {campanias.map((camp) => (
            <option key={camp} value={camp}>
              {camp}
            </option>
          ))}
        </select>
      </div>

      {campaniaSeleccionada ? (
        <div className="flex flex-wrap gap-6 justify-start">
          {Object.entries(siembrasAgrupadas).map(([cultivo, items]) => {
            const totalHa = items.reduce(
              (sum, i) => sum + (parseFloat(i.ha) || 0),
              0
            );
            return (
              <div
                key={cultivo}
                className="bg-white border rounded-xl shadow inline-block min-w-[600px]"
              >
                <div className="bg-white px-4 pt-4 pb-2 flex items-baseline justify-between">
                  <h2 className="text-[15px] text-gray-800 font-bold uppercase">
                    {cultivo}
                  </h2>
                  <span className="text-sm text-primary font-bold">
                    {Math.round(totalHa).toLocaleString("es-AR")} ha
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f1f5f3] text-gray-700 text-[13px]">
                      <th className="px-4 py-2 text-left">Campo</th>
                      <th className="px-4 py-2 text-left">Lote</th>
                      <th className="px-4 py-2 text-left">Ha</th>
                      <th className="px-4 py-2 text-left">Variedad</th>
                      <th className="px-4 py-2 text-left">Productor</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const editando = filaEditando?.id === item.id;
                      return (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          {["campo","lote","ha","variedad","productor"].map((f) => (
                            <td key={f} className="px-4 py-2">
                              {editando ? (
                                <input
                                  type={f === "ha" ? "number" : "text"}
                                  value={filaEditando[f]}
                                  onChange={(e) =>
                                    handleChange(f, e.target.value)
                                  }
                                  onBlur={guardarCambios}
                                  onKeyDown={handleKeyDown}
                                  className="w-full border rounded px-1 py-0.5 text-sm"
                                />
                              ) : (
                                item[f]
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
                                <Pencil
                                  size={16}
                                  className="text-gray-600 hover:text-primary"
                                />
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
      ) : (
        <p className="text-gray-500">
          Por favor selecciona una campaña para ver las siembras.
        </p>
      )}
    </div>
  );
}
