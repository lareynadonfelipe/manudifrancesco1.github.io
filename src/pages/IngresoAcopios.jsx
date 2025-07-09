// src/pages/IngresoAcopios.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function IngresoAcopios() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // lista completa de camiones
  const [camiones, setCamiones] = useState([]);
  const [loadingCamiones, setLoadingCamiones] = useState(true);

  // filtrado y selección
  const [searchCtg, setSearchCtg] = useState("");
  const [selectedCamion, setSelectedCamion] = useState(null);

  // kg destino en el formulario
  const [kgDestino, setKgDestino] = useState("");

  // cargar usuario actual
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setUser(user))
      .catch(console.error)
      .finally(() => setLoadingUser(false));
  }, []);

  // cargar camiones al montar, si es el usuario correcto
  useEffect(() => {
    if (user?.email === "manudifrancesco1@gmail.com") {
      loadCamiones();
    }
  }, [user]);

  async function loadCamiones() {
    setLoadingCamiones(true);
    const { data, error } = await supabase
      .from("camiones")
      .select("id, fecha, ctg, camion_para, destino, chofer, chasis, kg_campo, kg_destino, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      alert("Error cargando camiones: " + error.message);
    } else {
      setCamiones(data);
    }
    setLoadingCamiones(false);
  }

  // cada vez que cambio la búsqueda, limpio la selección
  const handleSearchChange = (e) => {
    setSearchCtg(e.target.value);
    setSelectedCamion(null);
  };

  // camiones que coinciden con la búsqueda
  const filteredCamiones = camiones.filter((m) =>
    m.ctg.toLowerCase().includes(searchCtg.toLowerCase())
  );

  // al hacer click en una fila, selecciono ese camión
  const handleSelectCamion = (m) => {
    setSelectedCamion(m);
    setKgDestino(m.kg_destino ?? "");
  };

  // actualizar kg_destino para el camión seleccionado
  const handleUpdateDestino = async () => {
    if (!selectedCamion) return;
    const { error } = await supabase
      .from("camiones")
      .update({ kg_destino: parseFloat(kgDestino) })
      .eq("id", selectedCamion.id);
    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      // Sin notificación de éxito, simplemente refrescamos y limpiamos
      setSearchCtg("");
      setSelectedCamion(null);
      setKgDestino("");
      loadCamiones();
    }
  };

  if (loadingUser) return <p>Cargando usuario…</p>;
  if (user?.email !== "manudifrancesco1@gmail.com") {
    return <p>No tienes permiso para ver esta página.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Ingreso Acopios</h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Izquierda: buscador + tabla filtrada */}
        <section className="md:col-span-8 bg-white shadow rounded p-4">
          <div className="mb-4">
            <label className="block mb-1 font-medium">Buscar por CTG</label>
            <input
              type="text"
              value={searchCtg}
              onChange={handleSearchChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Escribe parte del CTG..."
            />
          </div>
          {loadingCamiones ? (
            <p>Cargando camiones…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Fecha</th>
                    <th className="px-4 py-2 text-left">CTG</th>
                    <th className="px-4 py-2 text-left">Para</th>
                    <th className="px-4 py-2 text-left">Destino</th>
                    <th className="px-4 py-2 text-left">Chofer</th>
                    <th className="px-4 py-2 text-left">Chasis</th>
                    <th className="px-4 py-2 text-left">Kg Campo</th>
                    <th className="px-4 py-2 text-left">Kg Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCamiones.map((m) => (
                    <tr
                      key={m.id}
                      className={`border-t cursor-pointer hover:bg-gray-50 ${
                        selectedCamion?.id === m.id ? "bg-green-100" : ""
                      }`}
                      onClick={() => handleSelectCamion(m)}
                    >
                      <td className="px-4 py-2">{m.fecha}</td>
                      <td className="px-4 py-2">{m.ctg}</td>
                      <td className="px-4 py-2">{m.camion_para}</td>
                      <td className="px-4 py-2">{m.destino}</td>
                      <td className="px-4 py-2">{m.chofer}</td>
                      <td className="px-4 py-2">{m.chasis}</td>
                      <td className="px-4 py-2">{m.kg_campo}</td>
                      <td className="px-4 py-2">{m.kg_destino}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Derecha: formulario de actualización */}
        <aside className="md:col-span-4 bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Actualizar Kg Destino</h2>
          {!selectedCamion ? (
            <p className="text-gray-500">Selecciona un camión de la tabla.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="block font-medium">CTG:</span>
                <span>{selectedCamion.ctg}</span>
              </div>
              <div>
                <span className="block font-medium">Fecha:</span>
                <span>{selectedCamion.fecha}</span>
              </div>
              <div>
                <label className="block mb-1 font-medium">Kg Destino</label>
                <input
                  type="number"
                  step="0.01"
                  value={kgDestino}
                  onChange={(e) => setKgDestino(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <button
                onClick={handleUpdateDestino}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Guardar Kg Destino
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
