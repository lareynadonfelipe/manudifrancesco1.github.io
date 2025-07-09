// src/pages/EditorPage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaniaStore } from "@/store/campaniaStore";

export default function EditorPage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const { campaniaSeleccionada } = useCampaniaStore();

  // — Cosechas —
  const [cosechas, setCosechas] = useState([]);
  const [loadingCosechas, setLoadingCosechas] = useState(true);
  const [selectedCosecha, setSelectedCosecha] = useState(null);
  // Nuevo formulario cosecha
  const [showCosechaForm, setShowCosechaForm] = useState(false);
  const [loteCosecha, setLoteCosecha] = useState("");
  const [cultivoCosecha, setCultivoCosecha] = useState("");
  const [productorCosecha, setProductorCosecha] = useState("");

  // — Camiones —
  const [camiones, setCamiones] = useState([]);
  const [editingCamion, setEditingCamion] = useState(null);

  // Campos camión
  const [fechaCamion, setFechaCamion] = useState("");
  const [ctgCamion, setCtgCamion] = useState("");
  const [camionPara, setCamionPara] = useState("");
  const [destinoCamion, setDestinoCamion] = useState("");
  const [choferCamion, setChoferCamion] = useState("");
  const [chasisCamion, setChasisCamion] = useState("");
  const [kgCampoCamion, setKgCampoCamion] = useState("");

  // Autocomplete chofer
  const [choferOptions, setChoferOptions] = useState([]);
  const [choferChasisMap, setChoferChasisMap] = useState({});
  const camionParaOptions = ["Cecilia", "Horacio"];
  const destinoOptions = ["AGD", "ACA", "Bunge", "Teumaco", "Silo Bolsa"];

  // — Carga de usuario —
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => setUser(user))
      .catch(console.error)
      .finally(() => setLoadingUser(false));
  }, []);

  // — Carga inicial de datos —
  useEffect(() => {
    loadCosechas();
    loadChoferData();
  }, []);

  // — Funciones —
  async function loadCosechas() {
    setLoadingCosechas(true);
    const { data, error } = await supabase
      .from("cosechas")
      .select("id, lote, cultivo, productor")
      .order("lote", { ascending: true });
    if (error) alert("Error cargando cosechas: " + error.message);
    else setCosechas(data);
    setLoadingCosechas(false);
  }

  async function loadChoferData() {
    const { data } = await supabase
      .from("camiones")
      .select("chofer,chasis")
      .order("id", { ascending: false });
    const map = {}, opts = [];
    data.forEach(({ chofer, chasis }) => {
      if (chofer && !map[chofer]) {
        map[chofer] = chasis;
        opts.push(chofer);
      }
    });
    setChoferChasisMap(map);
    setChoferOptions(opts);
  }

  async function loadCamiones(cosecha) {
    const { data, error } = await supabase
      .from("camiones")
      .select("id, fecha, ctg, camion_para, destino, chofer, chasis, kg_campo, created_at")
      .eq("cosecha_id", cosecha.id)
      .order("created_at", { ascending: false });
    if (error) alert("Error cargando camiones: " + error.message);
    else setCamiones(data);
  }

  const handleSelectCosecha = (c) => {
    setSelectedCosecha(c);
    setEditingCamion(null);
    setCamiones([]);
    loadCamiones(c);
  };

  const handleChoferChange = (e) => {
    const v = e.target.value;
    setChoferCamion(v);
    setChasisCamion(choferChasisMap[v] || "");
  };

  // Agregar o editar camión
  const handleSubmitCamion = async (e) => {
    e.preventDefault();
    if (!selectedCosecha) return;
    const payload = {
      fecha: fechaCamion,
      ctg: ctgCamion,
      camion_para: camionPara,
      destino: destinoCamion,
      chofer: choferCamion,
      chasis: chasisCamion,
      kg_campo: parseFloat(kgCampoCamion),
    };
    let error;
    if (editingCamion) {
      ({ error } = await supabase
        .from("camiones")
        .update(payload)
        .eq("id", editingCamion.id));
    } else {
      ({ error } = await supabase
        .from("camiones")
        .insert([{ ...payload, cosecha_id: selectedCosecha.id }]));
    }
    if (error) alert(error.message);
    else {
      loadCamiones(selectedCosecha);
      loadChoferData();
      setEditingCamion(null);
    }
  };

  const handleDeleteCamion = async () => {
    if (!editingCamion || !confirm("¿Eliminar este camión?")) return;
    const { error } = await supabase
      .from("camiones")
      .delete()
      .eq("id", editingCamion.id);
    if (error) alert(error.message);
    else {
      loadCamiones(selectedCosecha);
      loadChoferData();
      setEditingCamion(null);
    }
  };

  // Agregar nueva cosecha
  const handleSubmitCosecha = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("cosechas")
      .insert([
        {
          lote: loteCosecha,
          cultivo: cultivoCosecha,
          productor: productorCosecha,
          campania: campaniaSeleccionada,
        },
      ]);
    if (error) alert("Error al agregar cosecha: " + error.message);
    else {
      setLoteCosecha("");
      setCultivoCosecha("");
      setProductorCosecha("");
      setShowCosechaForm(false);
      loadCosechas();
    }
  };

  if (loadingUser) return <p>Cargando usuario…</p>;
  if (!user || user.email !== "manudifrancesco1@gmail.com") {
    return <p>No tienes permiso para ver esta página.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Editor de Cosechas</h1>
      <p className="text-gray-600">Campaña: {campaniaSeleccionada}</p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 1) Cosechas (3 cols) */}
        <aside className="md:col-span-3 bg-white shadow rounded p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Cosechas</h2>
            <button
              onClick={() => setShowCosechaForm((v) => !v)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
            >
              + Nueva
            </button>
          </div>

          {showCosechaForm && (
            <form onSubmit={handleSubmitCosecha} className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="Lote"
                value={loteCosecha}
                onChange={(e) => setLoteCosecha(e.target.value)}
                className="w-full border px-2 py-1 rounded"
                required
              />
              <input
                type="text"
                placeholder="Cultivo"
                value={cultivoCosecha}
                onChange={(e) => setCultivoCosecha(e.target.value)}
                className="w-full border px-2 py-1 rounded"
                required
              />
              <input
                type="text"
                placeholder="Productor"
                value={productorCosecha}
                onChange={(e) => setProductorCosecha(e.target.value)}
                className="w-full border px-2 py-1 rounded"
                required
              />
              <button
                type="submit"
                className="w-full bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
              >
                Guardar
              </button>
            </form>
          )}

          {loadingCosechas ? (
            <p>Cargando…</p>
          ) : (
            <ul className="space-y-3 max-h-[500px] overflow-auto">
              {cosechas.map((c) => (
                <li
                  key={c.id}
                  onClick={() => handleSelectCosecha(c)}
                  className={`p-3 rounded cursor-pointer ${
                    selectedCosecha?.id === c.id
                      ? "bg-green-100"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="text-lg font-bold">{c.lote}</div>
                  <div className="text-sm text-gray-700">Prod: {c.productor}</div>
                  <div className="text-sm text-gray-500">{c.cultivo}</div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 2) Camiones (6 cols) */}
        <section className="md:col-span-6 bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Camiones</h2>
          {!selectedCosecha ? (
            <p className="text-gray-500">Selecciona una cosecha.</p>
          ) : camiones.length === 0 ? (
            <p className="text-gray-500">No hay camiones aún.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {camiones.map((m) => (
                    <tr
                      key={m.id}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() => setEditingCamion(m)}
                    >
                      <td className="px-4 py-2">{m.fecha}</td>
                      <td className="px-4 py-2">{m.ctg}</td>
                      <td className="px-4 py-2">{m.camion_para}</td>
                      <td className="px-4 py-2">{m.destino}</td>
                      <td className="px-4 py-2">{m.chofer}</td>
                      <td className="px-4 py-2">{m.chasis}</td>
                      <td className="px-4 py-2">{m.kg_campo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3) Formulario (3 cols) */}
        <section className="md:col-span-3 bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold mb-4">
            {editingCamion ? "Editar Camión" : "Agregar Camión"}
          </h2>
          {!selectedCosecha ? (
            <p className="text-gray-500">Selecciona una cosecha.</p>
          ) : (
            <form onSubmit={handleSubmitCamion} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Fecha</label>
                <input
                  type="date"
                  value={fechaCamion}
                  onChange={(e) => setFechaCamion(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">CTG</label>
                <input
                  type="text"
                  value={ctgCamion}
                  onChange={(e) => setCtgCamion(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Camión para</label>
                <div className="flex gap-2">
                  {camionParaOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCamionPara(opt)}
                      className={`px-4 py-2 rounded ${
                        camionPara === opt
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Destino</label>
                <div className="flex flex-wrap gap-2">
                  {destinoOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDestinoCamion(opt)}
                      className={`px-4 py-2 rounded ${
                        destinoCamion === opt
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 hover:bg-gray-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Chofer</label>
                <input
                  type="text"
                  list="choferOptions"
                  value={choferCamion}
                  onChange={handleChoferChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
                <datalist id="choferOptions">
                  {choferOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block mb-1 font-medium">Chasis</label>
                <input
                  type="text"
                  value={chasisCamion}
                  onChange={(e) => setChasisCamion(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Kg Campo</label>
                <input
                  type="number"
                  step="0.01"
                  value={kgCampoCamion}
                  onChange={(e) => setKgCampoCamion(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {editingCamion ? "Guardar Cambios" : "Agregar"}
                </button>
                {editingCamion && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingCamion(null)}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCamion}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
