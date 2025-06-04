import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Edit, Trash2, Save, X, Plus, Filter } from "lucide-react";

const defaultCultivos = ["Soja", "Maíz", "Trigo"];
const cosechas = ["23-24", "24-25"];
const acopios = ["", "AGD", "Bunge", "ACA"];
const formatNumber = (n) => (n || 0).toLocaleString("es-AR");

const columns = ["fecha", "coe", "acopio", "cosecha", "kg", "precio", "observaciones"];

const formatDate = (isoDate) => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

const formatPrice = (value) => {
  if (value == null) return "";
  return `$${Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function VentasPage() {
  const [camionesData, setCamionesData] = useState([]);
  const [ventasTable, setVentasTable] = useState([]);
  const [ventasCard, setVentasCard] = useState({});

  const [cultivoSeleccionado, setCultivoSeleccionado] = useState(defaultCultivos[0]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [errorCards, setErrorCards] = useState(null);

  const [loadingTable, setLoadingTable] = useState(true);
  const [errorTable, setErrorTable] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingData, setEditingData] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    acopio: "",
    cosecha: "",
    cultivo: cultivoSeleccionado,
    coe: "",
    kg: "",
    precio: "",
    observaciones: "",
  });

  const [mobileRow, setMobileRow] = useState(null);

  // ** Estados para filtros **
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterCoe, setFilterCoe] = useState("");
  const [filterAcopio, setFilterAcopio] = useState("");
  const [filterCosecha, setFilterCosecha] = useState("");

  // Fetch ventas en tabla, ordenando por fecha descendente
  useEffect(() => {
    (async () => {
      setLoadingTable(true);
      setErrorTable(null);
      try {
        const { data, error } = await supabase.from("ventas").select("*");
        if (error) throw error;
        const mapped = (data || [])
          .map((r) => ({
            id: r.id,
            fecha: r.fecha,
            acopio: r.acopio,
            cosecha: r.cosecha,
            cultivo: r.cultivo,
            coe: r.coe,
            kg: r.kg,
            precio: r.precio,
            observaciones: r.observaciones || "",
          }))
          .sort(
            (a, b) =>
              new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
        setVentasTable(mapped);
      } catch (err) {
        setErrorTable(err.message);
      } finally {
        setLoadingTable(false);
      }
    })();
  }, []);

  // Fetch camiones data
  useEffect(() => {
    (async () => {
      setLoadingCards(true);
      setErrorCards(null);
      try {
        const { data, error } = await supabase
          .from("camiones")
          .select("destino, kg_destino, cosecha:cosechas!inner(campania)")
          .eq("camion_para", "Cecilia")
          .eq("cosecha.cultivo", cultivoSeleccionado);
        if (error) throw error;
        setCamionesData(data || []);
      } catch (err) {
        setErrorCards(err.message);
        setCamionesData([]);
      } finally {
        setLoadingCards(false);
      }
    })();
  }, [cultivoSeleccionado]);

  // Recalcula stock para cards
  useEffect(() => {
    const grouped = {};
    camionesData.forEach(({ destino, kg_destino, cosecha }) => {
      const key = destino || "Sin destino";
      grouped[key] = grouped[key] || { total: 0, porCampania: {} };
      grouped[key].total += kg_destino || 0;
      const camp = cosecha?.campania || "Sin campaña";
      grouped[key].porCampania[camp] =
        (grouped[key].porCampania[camp] || 0) + (kg_destino || 0);
    });

    if (cultivoSeleccionado === "Soja") {
      const BASE_STOCK = 631464;
      const agdKey = "AGD";
      const baseCamp = "23-24";
      grouped[agdKey] = grouped[agdKey] || { total: 0, porCampania: {} };
      grouped[agdKey].porCampania[baseCamp] =
        (grouped[agdKey].porCampania[baseCamp] || 0) + BASE_STOCK;
      grouped[agdKey].total += BASE_STOCK;
    }

    ventasTable
      .filter((v) => v.cultivo === cultivoSeleccionado)
      .forEach(({ acopio, kg, cosecha }) => {
        if (grouped[acopio]) {
          grouped[acopio].total = Math.max(0, grouped[acopio].total - kg);
          if (grouped[acopio].porCampania[cosecha] != null) {
            grouped[acopio].porCampania[cosecha] = Math.max(
              0,
              grouped[acopio].porCampania[cosecha] - kg
            );
          }
        }
      });

    setVentasCard(grouped);
  }, [camionesData, ventasTable, cultivoSeleccionado]);

  // Edit / Delete handlers
  const handleEditClick = (row) => {
    setSelectedRowId(row.id);
    setEditingRowId(row.id);
    setEditingData({ ...row });
    setMobileRow(null);
  };
  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };
  const handleSaveEdit = async () => {
    try {
      const payload = {
        fecha: editingData.fecha,
        acopio: editingData.acopio,
        cosecha: editingData.cosecha,
        cultivo: editingData.cultivo,
        coe: editingData.coe,
        kg: Number(editingData.kg),
        precio: Number(editingData.precio),
        observaciones: editingData.observaciones,
      };
      const { data, error } = await supabase
        .from("ventas")
        .update(payload)
        .eq("id", editingRowId)
        .select("*");
      if (error) throw error;
      const updated = {
        ...data[0],
        observaciones: data[0].observaciones || "",
      };
      setVentasTable((prev) =>
        prev.map((r) => (r.id === editingRowId ? updated : r))
      );
      setEditingRowId(null);
      setEditingData({});
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  };
  const handleDelete = async (row) => {
    if (!window.confirm("¿Eliminar esta venta?")) return;
    try {
      const { error } = await supabase.from("ventas").delete().eq("id", row.id);
      if (error) throw error;
      setVentasTable((prev) => prev.filter((r) => r.id !== row.id));
      setMobileRow(null);
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Guardar nueva venta
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        fecha: formData.fecha,
        acopio: formData.acopio,
        cosecha: formData.cosecha,
        cultivo: formData.cultivo,
        coe: formData.coe,
        kg: Number(formData.kg),
        precio: Number(formData.precio),
        observaciones: formData.observaciones,
      };
      const { data: newRows, error } = await supabase
        .from("ventas")
        .insert([payload])
        .select("*");
      if (error) throw error;
      const added = {
        id: newRows[0].id,
        fecha: newRows[0].fecha,
        acopio: newRows[0].acopio,
        cosecha: newRows[0].cosecha,
        cultivo: newRows[0].cultivo,
        coe: newRows[0].coe,
        kg: newRows[0].kg,
        precio: newRows[0].precio,
        observaciones: newRows[0].observaciones || "",
      };
      setVentasTable((prev) => [added, ...prev]);
      setShowForm(false);
    } catch (err) {
      alert("No se pudo guardar: " + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ** Lógica de filtrado **
  const filteredVentas = ventasTable
    .filter((row) => row.cultivo === cultivoSeleccionado)
    .filter((row) => {
      if (filterDesde && new Date(row.fecha) < new Date(filterDesde)) return false;
      if (filterHasta && new Date(row.fecha) > new Date(filterHasta)) return false;
      if (filterCoe && !row.coe.toLowerCase().includes(filterCoe.toLowerCase())) return false;
      if (filterAcopio && row.acopio !== filterAcopio) return false;
      if (filterCosecha && row.cosecha !== filterCosecha) return false;
      return true;
    });

  return (
    <div className="px-4 py-2">
      {/* 1) BLOQUE DE CULTIVO */}
      <div className="mb-4 flex border-b">
        {defaultCultivos.map((cult) => (
          <button
            key={cult}
            onClick={() => {
              setCultivoSeleccionado(cult);
              if (!showForm) {
                setFormData((prev) => ({ ...prev, cultivo: cult }));
              }
            }}
            className={`
              flex-1 text-center py-2 font-medium
              sm:flex-none sm:px-4 sm:py-2
              ${
                cultivoSeleccionado === cult
                  ? "text-green-800 border-b-2 border-green-800"
                  : "text-gray-600 hover:text-gray-800"
              }
            `}
          >
            {cult}
          </button>
        ))}
      </div>

      {/* Cards de Stock */}
      {loadingCards ? (
        <p className="text-gray-500 mb-8">Cargando stock...</p>
      ) : errorCards ? (
        <p className="text-red-500 mb-8">Error: {errorCards}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(ventasCard).map(([dest, { total, porCampania }]) => (
            <div key={dest} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-lg">{dest}</h3>
                <p className="text-green-600 font-bold text-lg">
                  {formatNumber(total)} KG
                </p>
              </div>
              <hr className="border-gray-200 my-4" />
              {Object.entries(porCampania).map(([camp, kg]) => (
                <div key={camp} className="flex justify-between text-base">
                  <span>{camp}</span>
                  <span>{formatNumber(kg)} KG</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 2) FORMULARIO MÓVIL A PANTALLA COMPLETA */}
      {showForm && (
        <div className="fixed inset-0 bg-white p-4 z-50 sm:hidden overflow-auto">
          <button
            onClick={() => setShowForm(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
          <h3 className="text-green-800 font-semibold mb-4 text-lg">Nueva Venta</h3>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">COE</label>
                <input
                  type="text"
                  name="coe"
                  value={formData.coe}
                  onChange={handleInputChange}
                  className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Acopio</label>
              <div className="grid grid-cols-3 gap-2">
                {acopios.slice(1).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, acopio: opt }))
                    }
                    className={`border px-3 py-1 rounded text-sm ${
                      formData.acopio === opt
                        ? "bg-green-600 text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cosecha</label>
              <div className="grid grid-cols-2 gap-2">
                {cosechas.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, cosecha: opt }))
                    }
                    className={`border px-3 py-1 rounded text-sm ${
                      formData.cosecha === opt
                        ? "bg-green-600 text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cultivo</label>
              <div className="grid grid-cols-3 gap-2">
                {defaultCultivos.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({ ...p, cultivo: opt }))
                    }
                    className={`border px-3 py-1 rounded text-sm ${
                      formData.cultivo === opt
                        ? "bg-green-600 text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium">Cantidad (Kg)</label>
                <input
                  type="text"
                  name="kg"
                  value={formData.kg}
                  onChange={handleInputChange}
                  className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-right appearance-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Precio/Kg</label>
                <input
                  type="text"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-right appearance-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">Observaciones</label>
              <input
                type="text"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors hover:bg-green-700"
            >
              Guardar
            </button>
          </form>
        </div>
      )}

      {/* 3) ACCIONES MÓVILES A PANTALLA COMPLETA */}
      {mobileRow && (
        <div className="fixed inset-0 bg-white p-4 z-50 sm:hidden overflow-auto">
          <button
            onClick={() => setMobileRow(null)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
          <h3 className="text-green-800 font-semibold mb-4 text-lg">
            Opciones para venta
          </h3>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Fecha:</span>{" "}
              {formatDate(mobileRow.fecha)}
            </p>
            <p>
              <span className="font-medium">Acopio:</span> {mobileRow.acopio}
            </p>
            <p>
              <span className="font-medium">Cosecha:</span> {mobileRow.cosecha}
            </p>
            <p>
              <span className="font-medium">COE:</span> {mobileRow.coe}
            </p>
            <p>
              <span className="font-medium">Cantidad:</span>{" "}
              {formatNumber(mobileRow.kg)} Kg
            </p>
            <p>
              <span className="font-medium">Precio/Kg:</span>{" "}
              {formatPrice(mobileRow.precio)}
            </p>
            {mobileRow.observaciones && (
              <p>
                <span className="font-medium">Observaciones:</span>{" "}
                {mobileRow.observaciones}
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-center space-x-6">
            <button
              onClick={() => handleEditClick(mobileRow)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <Edit size={20} />
              <span>Editar</span>
            </button>
            <button
              onClick={() => handleDelete(mobileRow)}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              <Trash2 size={20} />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {/* 4) TABLA & FORM */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
        {/* En móvil: botones Nueva Venta & Filtrar Ventas */}
        <div className="sm:hidden mb-2">
          {!showForm && !mobileRow && (
            <>
              <button
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    cultivo: cultivoSeleccionado,
                    coe: "",
                    observaciones: "",
                  }));
                  setShowForm(true);
                }}
                className="
                  w-full flex items-center justify-center gap-2
                  bg-green-600 hover:bg-green-700 text-white
                  rounded-lg px-4 py-2 text-sm font-medium
                  shadow-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-green-400
                "
              >
                <Plus size={16} />
                Nueva Venta
              </button>

              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="
                  mt-2 w-full flex items-center justify-center gap-2
                  border border-green-600 text-green-600 bg-white
                  rounded-lg px-4 py-2 text-sm font-medium
                  shadow-sm transition-colors
                  hover:bg-green-50 hover:border-green-500
                  focus:outline-none focus:ring-2 focus:ring-green-400
                "
              >
                <Filter size={16} />
                {showFilters ? "Ocultar filtros" : "Filtrar Ventas"}
              </button>
            </>
          )}
        </div>

        {/* Contenedor de la tabla */}
        <div className="flex-1 bg-white shadow rounded-lg overflow-hidden">
          {/* Encabezado */}
          <div className="px-4 py-2 bg-gray-100 border-b">
            <h3 className="uppercase text-green-800 text-sm font-semibold">
              Ventas
            </h3>
          </div>

          {loadingTable ? (
            <div className="p-4 text-center text-gray-500">Cargando ventas...</div>
          ) : errorTable ? (
            <div className="p-4 text-center text-red-500">{errorTable}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 rounded-b-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className={`px-4 py-4 text-xs font-bold uppercase ${
                          col === "kg" || col === "precio" || col === "observaciones"
                            ? "text-right"
                            : "text-left"
                        } sticky top-0 bg-gray-50`}
                        style={{ zIndex: 10 }}
                      >
                        {col === "kg"
                          ? "Cantidad"
                          : col === "precio"
                          ? "Precio/Kg"
                          : col === "coe"
                          ? "COE"
                          : col === "observaciones"
                          ? "Observaciones"
                          : col.toUpperCase()}
                      </th>
                    ))}
                    <th
                      className="px-4 py-4 text-xs font-bold uppercase text-center sticky top-0 bg-gray-50"
                      style={{ zIndex: 10 }}
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVentas.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        if (window.innerWidth < 640) {
                          setMobileRow(row);
                        } else {
                          setSelectedRowId((prev) =>
                            prev === row.id ? null : row.id
                          );
                        }
                      }}
                      className={`cursor-pointer ${
                        selectedRowId === row.id
                          ? "bg-gray-100"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          className={`px-4 py-1 ${
                            col === "kg" || col === "precio" || col === "observaciones"
                              ? "text-right"
                              : "text-left"
                          }`}
                        >
                          {editingRowId === row.id ? (
                            <input
                              type="text"
                              name={col}
                              value={editingData[col] || ""}
                              onChange={(e) =>
                                setEditingData((p) => ({
                                  ...p,
                                  [col]: e.target.value,
                                }))
                              }
                              className="w-full border-b focus:outline-none text-right appearance-none text-sm"
                            />
                          ) : (
                            <>
                              {col === "fecha"
                                ? formatDate(row.fecha)
                                : col === "kg"
                                ? `${formatNumber(row.kg)} Kg`
                                : col === "precio"
                                ? formatPrice(row.precio)
                                : col === "coe"
                                ? row.coe
                                : col === "observaciones"
                                ? row.observaciones
                                : row[col]}
                            </>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-1 text-right">
                        <div className="flex w-full justify-end items-center space-x-2 h-8">
                          {editingRowId === row.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit();
                                }}
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : selectedRowId === row.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(row);
                                }}
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(row);
                                }}
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full"></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5) FORMULARIO ESCRITORIO */}
        <div className="hidden sm:block w-full sm:w-80 flex-shrink-0">
          {/* Botón Nueva Venta o Formulario */}
          {!mobileRow && (
            <>
              {!showForm && (
                <button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      cultivo: cultivoSeleccionado,
                      coe: "",
                      observaciones: "",
                    }));
                    setShowForm(true);
                  }}
                  className="
                    mb-4 w-full flex items-center justify-center gap-2
                    bg-green-600 hover:bg-green-700 text-white
                    rounded-lg px-4 py-2 text-sm font-medium
                    shadow-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-green-400
                  "
                >
                  <Plus size={16} />
                  Nueva Venta
                </button>
              )}

              {showForm && (
                <div className="bg-white shadow rounded-lg border p-4 mb-4 relative">
                  <button
                    onClick={() => setShowForm(false)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                  <h3 className="text-green-800 font-semibold mb-4">Nueva Venta</h3>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium">Fecha</label>
                        <input
                          type="date"
                          name="fecha"
                          value={formData.fecha}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">COE</label>
                        <input
                          type="text"
                          name="coe"
                          value={formData.coe}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Acopio</label>
                      <div className="grid grid-cols-3 gap-2">
                        {acopios.slice(1).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({ ...p, acopio: opt }))
                            }
                            className={`border px-3 py-1 rounded text-sm ${
                              formData.acopio === opt
                                ? "bg-green-600 text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Cosecha</label>
                      <div className="grid grid-cols-2 gap-2">
                        {cosechas.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({ ...p, cosecha: opt }))
                            }
                            className={`border px-3 py-1 rounded text-sm ${
                              formData.cosecha === opt
                                ? "bg-green-600 text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Cultivo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {defaultCultivos.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({ ...p, cultivo: opt }))
                            }
                            className={`border px-3 py-1 rounded text-sm ${
                              formData.cultivo === opt
                                ? "bg-green-600 text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium">Cantidad (Kg)</label>
                        <input
                          type="text"
                          name="kg"
                          value={formData.kg}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-right appearance-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">Precio/Kg</label>
                        <input
                          type="text"
                          name="precio"
                          value={formData.precio}
                          onChange={handleInputChange}
                          className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-right appearance-none text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Observaciones</label>
                      <input
                        type="text"
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        className="mt-1 w-full border rounded px-2 py-1 focus:outline-none text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors hover:bg-green-700"
                    >
                      Guardar
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* Botón Filtrar Ventas */}
          {!mobileRow && (
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="
                mb-4 w-full flex items-center justify-center gap-2
                border border-green-600 text-green-600 bg-white
                rounded-lg px-4 py-2 text-sm font-medium
                shadow-sm transition-colors
                hover:bg-green-50 hover:border-green-500
                focus:outline-none focus:ring-2 focus:ring-green-400
              "
            >
              <Filter size={16} />
              {showFilters ? "Ocultar filtros" : "Filtrar Ventas"}
            </button>
          )}

          {/* Formulario de filtros desplegable */}
          {!mobileRow && showFilters && (
            <div className="bg-white shadow rounded-lg border p-4 mb-4">
              {/* Fecha Desde / Hasta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium">Fecha Desde</label>
                  <input
                    type="date"
                    value={filterDesde}
                    onChange={(e) => setFilterDesde(e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Fecha Hasta</label>
                  <input
                    type="date"
                    value={filterHasta}
                    onChange={(e) => setFilterHasta(e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              {/* COE */}
              <div className="mb-4">
                <label className="block text-xs font-medium">COE</label>
                <input
                  type="text"
                  placeholder="Buscar COE"
                  value={filterCoe}
                  onChange={(e) => setFilterCoe(e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-1 text-xs"
                />
              </div>

              {/* Acopio y Cosecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium">Acopio</label>
                  <select
                    value={filterAcopio}
                    onChange={(e) => setFilterAcopio(e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                  >
                    {acopios.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === "" ? "Todos" : opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium">Cosecha</label>
                  <select
                    value={filterCosecha}
                    onChange={(e) => setFilterCosecha(e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                  >
                    <option value="">Todos</option>
                    {cosechas.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón Limpiar filtros */}
              <button
                onClick={() => {
                  setFilterDesde("");
                  setFilterHasta("");
                  setFilterCoe("");
                  setFilterAcopio("");
                  setFilterCosecha("");
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded text-xs hover:bg-gray-300"
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
