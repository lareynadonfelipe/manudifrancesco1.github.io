import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Filter } from "lucide-react";

const defaultCultivos = ["Soja", "Maíz", "Trigo"];
const acopios = ["AGD", "Bunge", "ACA"];
const cosechas = ["23-24", "24-25"];

const formatNumber = (n) => (n || 0).toLocaleString("es-AR");
const formatDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const formatPrice = (v) =>
  v == null
    ? ""
    : `$${Number(v).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

export default function VentasPage() {
  // STOCK & VENTAS
  const [camionesData, setCamionesData] = useState([]);
  const [ventasTable, setVentasTable] = useState([]);
  const [stockByCultivo, setStockByCultivo] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);
  const [errorStock, setErrorStock] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [errorTable, setErrorTable] = useState(null);

  // FORMS
  const [showNew, setShowNew] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    acopio: "",
    cosecha: "",
    cultivo: "",
    coe: "",
    kg: "",
    precio: "",
    observaciones: "",
  });
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterCoe, setFilterCoe] = useState("");
  const [filterAcopio, setFilterAcopio] = useState("");
  const [filterCosecha, setFilterCosecha] = useState("");

  // EXPAND CARD
  const [expandedCultivo, setExpandedCultivo] = useState(null);

  // FETCH VENTAS
useEffect(() => {
  (async () => {
    setLoadingTable(true);
    try {
      const { data, error } = await supabase
        .from("ventas")
        .select("*")
        .order("fecha", { ascending: false });  // <- ordena por fecha desc
      if (error) throw error;
      setVentasTable(
        (data || [])
          .map((r) => ({ ...r, observaciones: r.observaciones || "" }))
      );
    } catch (err) {
      setErrorTable(err.message);
    } finally {
      setLoadingTable(false);
    }
  })();
}, []);

  // FETCH STOCK
  useEffect(() => {
    (async () => {
      setLoadingStock(true);
      try {
        const { data, error } = await supabase
          .from("camiones")
          .select("destino, kg_destino, cosecha:cosechas!inner(campania, cultivo)")
          .eq("camion_para", "Cecilia");
        if (error) throw error;
        setCamionesData(
          (data || []).map((r) => ({
            destino: r.destino,
            kg_destino: r.kg_destino,
            cultivo: r.cosecha.cultivo,
            campania: r.cosecha.campania,
          }))
        );
      } catch (err) {
        setErrorStock(err.message);
      } finally {
        setLoadingStock(false);
      }
    })();
  }, []);

 // CALCULAR STOCK
useEffect(() => {
  const grouped = {};
  defaultCultivos.forEach((cult) => {
    grouped[cult] = { totalsByAcopio: {}, byCampaniaAndAcopio: {} };
    acopios.forEach((a) => (grouped[cult].totalsByAcopio[a] = 0));
    cosechas.forEach((camp) => {
      grouped[cult].byCampaniaAndAcopio[camp] = {};
      acopios.forEach((a) => (grouped[cult].byCampaniaAndAcopio[camp][a] = 0));
    });
  });

  // 1) Stock traído de Supabase
  camionesData.forEach(({ destino, kg_destino, cultivo, campania }) => {
    if (!grouped[cultivo]) return;
    grouped[cultivo].totalsByAcopio[destino] += kg_destino;
    grouped[cultivo].byCampaniaAndAcopio[campania][destino] += kg_destino;
  });

  // 2) Stock manual base: 631.464 KG de Soja 23-24 en AGD
  grouped["Soja"].totalsByAcopio["AGD"] += 631464;
  grouped["Soja"].byCampaniaAndAcopio["23-24"]["AGD"] += 631464;

  // (Opcional) debug:
  console.log(
    "📊 Stock manual Soja 23-24 AGD:",
    grouped["Soja"].byCampaniaAndAcopio["23-24"]["AGD"]
  );

  // 3) Restar las ventas
  ventasTable.forEach(({ cultivo, acopio, kg, cosecha }) => {
    if (
      grouped[cultivo] &&
      grouped[cultivo].totalsByAcopio[acopio] != null
    ) {
      grouped[cultivo].totalsByAcopio[acopio] = Math.max(
        0,
        grouped[cultivo].totalsByAcopio[acopio] - kg
      );
    }
    if (
      grouped[cultivo] &&
      grouped[cultivo].byCampaniaAndAcopio[cosecha] &&
      grouped[cultivo].byCampaniaAndAcopio[cosecha][acopio] != null
    ) {
      grouped[cultivo].byCampaniaAndAcopio[cosecha][acopio] = Math.max(
        0,
        grouped[cultivo].byCampaniaAndAcopio[cosecha][acopio] - kg
      );
    }
  });

  setStockByCultivo(grouped);
}, [camionesData, ventasTable]);


  // NUEVA VENTA
  const submitNew = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("ventas")
        .insert([
          {
            ...formData,
            kg: Number(formData.kg),
            precio: Number(formData.precio),
          },
        ])
        .select("*");
      if (error) throw error;
      setVentasTable((v) => [data[0], ...v]);
      setShowNew(false);
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        acopio: "",
        cosecha: "",
        cultivo: "",
        coe: "",
        kg: "",
        precio: "",
        observaciones: "",
      });
    } catch (err) {
      alert(err.message);
    }
  };

  // EDICIÓN
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditingData({ ...row });
    setShowNew(false);
    setShowFilters(false);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };
  const saveEdit = async () => {
    try {
      const { data, error } = await supabase
        .from("ventas")
        .update({
          ...editingData,
          kg: Number(editingData.kg),
          precio: Number(editingData.precio),
        })
        .eq("id", editingId)
        .select("*");
      if (error) throw error;
      setVentasTable((v) => v.map((r) => (r.id === editingId ? data[0] : r)));
      cancelEdit();
    } catch (err) {
      alert(err.message);
    }
  };
  const deleteEdit = async () => {
    if (!confirm("¿Eliminar registro?")) return;
    await supabase.from("ventas").delete().eq("id", editingId);
    setVentasTable((v) => v.filter((r) => r.id !== editingId));
    cancelEdit();
  };

// FILTRAR VENTAS
const filtered = ventasTable.filter((r) => {
  if (filterDesde && new Date(r.fecha) < new Date(filterDesde)) return false;
  if (filterHasta && new Date(r.fecha) > new Date(filterHasta)) return false;
  if (filterCoe && !r.coe.includes(filterCoe)) return false;
  if (filterAcopio && r.acopio !== filterAcopio) return false;
  if (filterCosecha && r.cosecha !== filterCosecha) return false;
  return true;
});

// Totales de kg y precio promedio
const totalKg = filtered.reduce((sum, r) => sum + Number(r.kg), 0);
const avgPrecio =
  filtered.length > 0
    ? filtered.reduce((sum, r) => sum + Number(r.precio), 0) / filtered.length
    : 0;


  return (
    <div className="px-6 py-4 space-y-8">
{/* STOCK CARDS */}
{loadingStock ? (
  <p className="text-gray-500">Cargando stock…</p>
) : errorStock ? (
  <p className="text-red-500">{errorStock}</p>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {defaultCultivos.map((cultivo) => {
      const { totalsByAcopio, byCampaniaAndAcopio } =
        stockByCultivo[cultivo] || {};
      const sum = Object.values(totalsByAcopio || {}).reduce(
        (a, b) => a + b,
        0
      );
      const open = expandedCultivo === cultivo;
      const camps = cosechas.filter((c) =>
        acopios.some((a) => byCampaniaAndAcopio?.[c]?.[a] > 0)
      );

      return (
        <div
          key={cultivo}
          className="bg-white rounded-lg shadow overflow-hidden cursor-pointer"
          onClick={() => setExpandedCultivo(open ? null : cultivo)}
        >
          {/* Header */}
          <div className="px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold">{cultivo}</h3>
            {sum > 0 ? (
              <span className="text-green-700 font-extrabold text-2xl">
                {formatNumber(sum)} KG
              </span>
            ) : (
              <span className="italic text-gray-400">Sin stock</span>
            )}
          </div>

          {/* Divider */}
          <hr className="border-gray-200 mx-6" />

          {/* Body */}
          <div className="px-6 py-4">
            {!open ? (
              /* ——— VISTA COLAPSADA: filas de acopios ——— */
              <ul className="space-y-1">
                {acopios.map((a) => {
                  const k = totalsByAcopio?.[a] || 0;
                  return (
                    <li key={a} className="flex justify-between py-1">
                      <span className="text-base font-medium text-gray-800">
                        {a}
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        {k > 0 ? `${formatNumber(k)} KG` : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              /* ——— VISTA EXPANDIDA: tabla por cosecha ——— */
              <div className="overflow-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left text-sm text-gray-500">
                        Acopio
                      </th>
                      {camps.map((c) => (
                        <th
                          key={c}
                          className="p-2 text-right text-sm text-gray-500"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {acopios.map((a) => (
                      <tr key={a}>
                        <td className="p-2 text-sm font-medium text-gray-800">
                          {a}
                        </td>
                        {camps.map((c) => (
                          <td
                            key={c}
                            className="p-2 text-right text-base font-semibold text-gray-900"
                          >
                            {formatNumber(
                              byCampaniaAndAcopio[c]?.[a] || 0
                            )}{" "}
                            KG
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
    })}
  </div>
)}



      {/* DOS COLUMNAS */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* TABLA DE VENTAS */}
        <div className="flex-1 bg-white shadow rounded overflow-hidden">
          <div className="px-4 py-3 bg-gray-100 border-b">
            {/* Título más pequeño */}
            <h3 className="uppercase text-green-800 text-lg font-semibold">
              Ventas
            </h3>
          </div>
          {loadingTable ? (
            <p className="p-6 text-center text-gray-500">Cargando…</p>
          ) : errorTable ? (
            <p className="p-6 text-center text-red-500">{errorTable}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { key: "fecha", label: "Fecha" },
                      { key: "acopio", label: "Acopio" },
                      { key: "cultivo", label: "Cultivo" },
                      { key: "cosecha", label: "Cosecha" },
                      { key: "kg", label: "Cantidad" },
                      { key: "precio", label: "Precio/Kg" },
                      { key: "coe", label: "COE", less: true },
                      { key: "observaciones", label: "Observaciones", less: true },
                    ].map(({ key, label, less }) => (
                      <th
                        key={key}
                        className={`px-4 py-2 uppercase ${
                          less ? "text-sm text-gray-500" : "text-sm font-bold text-gray-700"
                        } sticky top-0 bg-gray-50 ${
                          ["kg", "precio", "coe", "observaciones"].includes(key)
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
  {filtered.map((r) => (
    <tr
      key={r.id}
      onClick={() => startEdit(r)}
      className="cursor-pointer hover:bg-gray-100"
    >
      <td className="px-4 py-2">{formatDate(r.fecha)}</td>
      <td className="px-4 py-2">{r.acopio}</td>
      <td className="px-4 py-2">{r.cultivo}</td>
      <td className="px-4 py-2">{r.cosecha}</td>
      <td className="px-4 py-2 text-right">{formatNumber(r.kg)} KG</td>
      <td className="px-4 py-2 text-right">{formatPrice(r.precio)}</td>
      <td className="px-4 py-2 text-sm text-gray-500 text-right">{r.coe}</td>
      <td className="px-4 py-2 text-sm text-gray-500 text-right">{r.observaciones}</td>
    </tr>
  ))}

  {/* FILA DE TOTALES */}
  <tr className="bg-gray-100 font-semibold">
    <td className="px-4 py-2">Totales</td>
    <td className="px-4 py-2"></td>
    <td className="px-4 py-2"></td>
    <td className="px-4 py-2"></td>
    <td className="px-4 py-2 text-right">{formatNumber(totalKg)} KG</td>
    <td className="px-4 py-2 text-right">{formatPrice(avgPrecio)}</td>
    <td className="px-4 py-2"></td>
    <td className="px-4 py-2"></td>
  </tr>
</tbody>

              </table>
            </div>
          )}
        </div>

        {/* CONTROLES + FORMULARIOS */}
        <div className="w-full lg:w-80 space-y-4 flex-shrink-0">
          {/* EDITAR VENTA */}
          {editingId && (
            <div className="bg-white shadow rounded-lg border p-6">
              <h4 className="text-2xl font-bold mb-4">Editar Venta</h4>
              <form className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha
                  <input
                    type="date"
                    value={editingData.fecha}
                    onChange={(e) =>
                      setEditingData((d) => ({ ...d, fecha: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  COE
                  <input
                    type="text"
                    value={editingData.coe}
                    onChange={(e) =>
                      setEditingData((d) => ({ ...d, coe: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Acopio
                  <select
                    value={editingData.acopio}
                    onChange={(e) =>
                      setEditingData((d) => ({ ...d, acopio: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    {acopios.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Cosecha
                  <input
                    type="text"
                    value={editingData.cosecha}
                    onChange={(e) =>
                      setEditingData((d) => ({
                        ...d,
                        cosecha: e.target.value,
                      }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Cultivo
                  <select
                    value={editingData.cultivo}
                    onChange={(e) =>
                      setEditingData((d) => ({ ...d, cultivo: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    {defaultCultivos.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Cantidad (Kg)
                    <input
                      type="text"
                      value={editingData.kg}
                      onChange={(e) =>
                        setEditingData((d) => ({ ...d, kg: e.target.value }))
                      }
                      className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-right"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Precio/Kg
                    <input
                      type="text"
                      value={editingData.precio}
                      onChange={(e) =>
                        setEditingData((d) => ({ ...d, precio: e.target.value }))
                      }
                      className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-right"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Observaciones
                  <input
                    type="text"
                    value={editingData.observaciones}
                    onChange={(e) =>
                      setEditingData((d) => ({
                        ...d,
                        observaciones: e.target.value,
                      }))
                    }
                    className="mt-1 w-full border rounded px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 border rounded text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={deleteEdit}
                    className="px-4 py-2 bg-red-600 text-white rounded text-base"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="px-4 py-2 bg-green-600 text-white rounded text-base"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NUEVA VENTA */}
          <button
            onClick={() => {
              setShowNew((v) => !v);
              setShowFilters(false);
              cancelEdit();
            }}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-3 text-base font-medium"
          >
            <Plus size={18} /> Nueva Venta
          </button>
          {showNew && (
            <div className="bg-white shadow rounded-lg border p-4">
              <h4 className="text-xl font-bold mb-3">Agregar Venta</h4>
              <form onSubmit={submitNew} className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, fecha: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  COE
                  <input
                    type="text"
                    name="coe"
                    value={formData.coe}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, coe: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Acopio
                  <select
                    name="acopio"
                    value={formData.acopio}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, acopio: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    <option value="">Seleccione</option>
                    {acopios.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Cosecha
                  <input
                    type="text"
                    name="cosecha"
                    value={formData.cosecha}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, cosecha: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Cultivo
                  <select
                    name="cultivo"
                    value={formData.cultivo}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, cultivo: e.target.value }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  >
                    <option value="">Seleccione</option>
                    {defaultCultivos.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Kg
                    <input
                      type="text"
                      name="kg"
                      value={formData.kg}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, kg: e.target.value }))
                      }
                      className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-right"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Precio/Kg
                    <input
                      type="text"
                      name="precio"
                      value={formData.precio}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, precio: e.target.value }))
                      }
                      className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-right"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Observaciones
                  <input
                    type="text"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        observaciones: e.target.value,
                      }))
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNew(false)}
                    className="px-3 py-1 border rounded text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-green-600 text-white rounded text-base"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* FILTRAR VENTAS */}
          <button
            onClick={() => {
              setShowFilters((v) => !v);
              setShowNew(false);
              cancelEdit();
            }}
            className="w-full flex items-center justify-center gap-2 border border-green-600 text-green-600 rounded-lg px-4 py-3 text-base font-medium"
          >
            <Filter size={18} /> Filtrar Ventas
          </button>
          {showFilters && (
            <div className="bg-white shadow rounded-lg border p-4 space-y-3">
              <h4 className="text-xl font-bold mb-2">Filtros</h4>
              <label className="block text-sm font-medium text-gray-700">
                Fecha Desde
                <input
                  type="date"
                  value={filterDesde}
                  onChange={(e) => setFilterDesde(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Fecha Hasta
                <input
                  type="date"
                  value={filterHasta}
                  onChange={(e) => setFilterHasta(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                COE
                <input
                  type="text"
                  value={filterCoe}
                  onChange={(e) => setFilterCoe(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Acopio
                <select
                  value={filterAcopio}
                  onChange={(e) => setFilterAcopio(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {acopios.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Cosecha
                <input
                  type="text"
                  value={filterCosecha}
                  onChange={(e) => setFilterCosecha(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </label>
              <button
                onClick={() => {
                  setFilterDesde("");
                  setFilterHasta("");
                  setFilterCoe("");
                  setFilterAcopio("");
                  setFilterCosecha("");
                }}
                className="w-full bg-gray-200 px-3 py-1 rounded text-base"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
