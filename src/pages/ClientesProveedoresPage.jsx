import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, ChevronRight, Search, Download } from "lucide-react";
import ModalNuevoContacto from "@/components/ModalNuevoContacto";
import ModalVerContacto from "@/components/ModalVerContacto";

const camposIniciales = {
  id: null,
  categoria: "",
  nombre: "",
  tipo_persona: "física",
  documento: "",
  direccion: "",
  localidad: "",
  provincia: "",
  pais: "",
  cp: "",
  telefono: "",
  celular: "",
  email: "",
  email_facturacion: "",
  contacto: "",
  cargo_contacto: "",
  observaciones: "",
  banco: "",
  cbu: "",
  alias: "",
  tipo_cuenta: "",
  nro_cuenta: "",
  titular_cuenta: "",
  cuit_titular: "",
  factura_tipo: "",
  factura_ocr_ejemplo: "",
  subcategoria_id: null,
  activo: true,
};

export default function ClientesProveedoresPage() {
  const [contactos, setContactos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showVer, setShowVer] = useState(false);
  const [form, setForm] = useState(camposIniciales);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [selected, setSelected] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [userId, setUserId] = useState(null);
  const [authWarning, setAuthWarning] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Catálogos
  const [categoriasCat, setCategoriasCat] = useState([]);
  const [subcategoriasCat, setSubcategoriasCat] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCatLoading(true);
        setCatError("");
        const catQ = await supabase.from("categorias").select("id, nombre, activo").order("nombre");
        const subQ = await supabase.from("subcategorias").select("id, nombre, activo, categoria_id").order("nombre");
        if (catQ.error) setCatError(catQ.error.message);
        else setCategoriasCat(catQ.data || []);
        if (subQ.error) setCatError((prev) => prev || subQ.error.message);
        else setSubcategoriasCat(subQ.data || []);
      } catch (e) {
        setCatError(e?.message || String(e));
      } finally {
        setCatLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fetchContactos();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      setUserId(uid);
      if (!uid) {
        setAuthWarning("No hay sesión activa. Iniciá sesión para ver tus clientes/proveedores.");
      } else {
        setAuthWarning("");
        // eslint-disable-next-line no-console
        console.debug("AUTH userId:", uid, "SUPABASE_URL:", (import.meta?.env?.VITE_SUPABASE_URL || window?.__SUPABASE_URL__ || "N/D"));
      }
    })();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchContactos();
    }
  }, [userId]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusqueda(busqueda.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function fetchContactos() {
    setCargando(true);
    setErrorMsg("");
    setDebugInfo(null);
    try {
      // 1) Pedimos solo el count para verificar acceso y cantidad real vía el mismo cliente
      const countQuery = await supabase
        .from("clientes_proveedores")
        .select("id", { count: "exact", head: true });
      const serverCount = countQuery?.count ?? null;
      const countError = countQuery?.error ? countQuery.error.message : null;

      // 2) Traemos los registros (sin filtro por creado_por)
      const result = await supabase
        .from("clientes_proveedores")
        .select("*, nombre:razon_social, subcategoria:subcategorias!clientes_proveedores_subcategoria_id_fkey(id,nombre)")
        .order("razon_social");

      if (result.error) {
        setErrorMsg(result.error.message || "Error desconocido al cargar clientes_proveedores.");
      } else {
        setContactos(result.data || []);
      }

      // Guardamos info de depuración
      setDebugInfo({
        serverCount,
        countError,
        fetched: result.data ? result.data.length : 0,
        hadError: !!result.error,
      });

      // Log en consola para inspección detallada
      // eslint-disable-next-line no-console
      console.debug("CP DEBUG => count:", serverCount, "countError:", countError, "rows:", result.data?.length, "error:", result.error);
    } catch (e) {
      setErrorMsg(e?.message || String(e));
      // eslint-disable-next-line no-console
      console.error("CP DEBUG exception:", e);
    } finally {
      setCargando(false);
    }
  }

  function validarFormulario(datos) {
    let err = {};
    if (!datos.nombre) err.nombre = "Requerido";
    if (!datos.tipo_persona) err.tipo_persona = "Requerido";
    if (!datos.documento) err.documento = "Requerido";
    return err;
  }

  async function handleGuardar(contacto) {
    const err = validarFormulario(contacto);
    setErrores(err);
    if (Object.keys(err).length > 0) return;

    setCargando(true);

    if (contacto.id) {
      const { id, ...rest } = contacto;
      const campos = { 
        ...rest, 
        razon_social: contacto.nombre, 
        actualizado_por: userId || rest.actualizado_por || null, 
        actualizado_el: new Date().toISOString()
      };
      delete campos.nombre;
      const { error } = await supabase
        .from("clientes_proveedores")
        .update(campos)
        .eq("id", id);
      if (!error) {
        fetchContactos();
        setShowModal(false);
        setForm(camposIniciales);
        setErrores({});
      }
    } else {
      const dataInsert = { 
        ...contacto, 
        razon_social: contacto.nombre, 
        creado_por: userId, 
        creado_el: new Date().toISOString(), 
        activo: true 
      };
      delete dataInsert.nombre;
      if (dataInsert.id == null) delete dataInsert.id;
      const { error } = await supabase
        .from("clientes_proveedores")
        .insert([dataInsert]);
      if (!error) {
        fetchContactos();
        setShowModal(false);
        setForm(camposIniciales);
        setErrores({});
      }
    }
    setCargando(false);
  }

  function handleEditar(contacto) {
    setForm(contacto);
    setErrores({});
    setShowModal(true);
  }

  function handleCancelar() {
    setForm(camposIniciales);
    setErrores({});
    setShowModal(false);
  }

  function requestSort(key) {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }

  const contactosFiltrados = contactos.filter((c) => {
    const texto = (
      (c.nombre || c.razon_social || "") +
      (c.categoria || "") +
      (c.documento || "") +
      (c.celular || "") +
      (c.email || "") +
      (c.contacto || "") +
      (c.observaciones || "")
    ).toLowerCase();
    return debouncedBusqueda ? texto.includes(debouncedBusqueda) : true;
  });

  const sortedContactos = React.useMemo(() => {
    if (!sortConfig.key) return contactosFiltrados;

    const sorted = [...contactosFiltrados];
    sorted.sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      const bVal = (b[sortConfig.key] || "").toString().toLowerCase();

      if (aVal < bVal) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [contactosFiltrados, sortConfig]);

  return (
    <div className="max-w-7xl mx-auto p-0 md:p-6 relative flex flex-row gap-0">
      {/* Tabla principal */}
      <div className="flex-1 transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 px-4">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por razón social, documento, categoría..."
                className="pl-8 pr-3 py-2 rounded-lg border border-emerald-300 w-full focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <span className="hidden md:inline-block text-emerald-700 text-sm bg-emerald-50 rounded-full px-2.5 py-1">
              {contactos.length}
            </span>
            {authWarning && (
              <span className="text-amber-700 text-xs bg-amber-100 rounded-full px-3 py-1">
                {authWarning}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setForm(camposIniciales);
                setShowModal(true);
                setErrores({});
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> Nuevo
            </button>
            {/* (Opcional futuro) Exportar CSV */}
            {/* <button
              onClick={() => {}}
              className="hidden md:flex border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3 py-2 rounded-lg items-center gap-2"
            >
              <Download size={16} /> Exportar
            </button> */}
          </div>
        </div>
        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm p-0 mt-3 overflow-x-auto min-h-[350px] max-h-[70vh] overflow-y-auto border border-slate-200">
          {errorMsg && (
            <div className="mx-3 my-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              Error al cargar: {errorMsg}
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 text-left font-medium">Razón social</th>
                <th className="p-3 text-left font-medium">Documento</th>
                <th
                  className="p-3 text-left font-medium cursor-pointer select-none"
                  onClick={() => requestSort("categoria")}
                  aria-sort={
                    sortConfig.key === "categoria"
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  Categoría
                  {sortConfig.key === "categoria" ? (
                    sortConfig.direction === "asc" ? " ▲" : " ▼"
                  ) : null}
                </th>
                <th className="p-3 text-left font-medium">Subcategoría</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">CBU</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center">
                    Cargando...
                  </td>
                </tr>
              ) : sortedContactos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">
                    {authWarning || (
                      debugInfo && debugInfo.serverCount > 0 && debugInfo.fetched === 0
                        ? "No se muestran filas aunque existen en el servidor. Revisá URL/Key del proyecto Supabase o RLS."
                        : "Sin registros visibles. Verificá filtros o permisos RLS."
                    )}
                  </td>
                </tr>
              ) : (
                sortedContactos.map((c) => (
                  <tr
                    key={c.id}
                    className="h-12 border-b border-slate-100 last:border-0 group hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => {
                      setSelected(c);
                      setShowVer(true);
                    }}
                  >
                    <td className="p-3 font-semibold">{c.nombre}</td>
                    <td className="p-3 tabular-nums text-gray-700 font-mono tracking-tight whitespace-nowrap">{c.documento || <span className="text-gray-400">-</span>}</td>
                    <td className="p-3 whitespace-nowrap">
                      {c.categoria ? (
                        <span
                          className="inline-flex h-7 items-center px-3 bg-green-700 text-white text-[12px] font-medium rounded-full"
                        >
                          {c.categoria}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {c.subcategoria?.nombre ? (
                        <span
                          className="inline-flex h-7 items-center px-3 border border-green-700 bg-transparent text-green-700 text-[12px] font-normal rounded-full"
                        >
                          {c.subcategoria.nombre}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">{c.email || <span className="text-gray-400">-</span>}</td>
                    <td className="p-3 whitespace-nowrap">{c.cbu || <span className="text-gray-400">-</span>}</td>
                    <td className="p-3 text-right pr-4 text-gray-300 group-hover:text-green-600 transition-colors"><ChevronRight size={16} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE VISUALIZACIÓN */}
      {showVer && selected && (
        <ModalVerContacto
          open={showVer}
          onClose={() => {
            setShowVer(false);
            setSelected(null);
          }}
          contacto={selected}
          onEditar={(contacto) => {
            setShowVer(false);
            handleEditar(contacto);
          }}
          onEliminar={async (contacto) => {
            setShowVer(false);
            // Para eliminar físicamente desde el modal:
            await supabase.from("clientes_proveedores").delete().eq("id", contacto.id);
            fetchContactos();
          }}
        />
      )}

      {/* Modal de edición/alta */}
      <ModalNuevoContacto
        open={showModal}
        onClose={handleCancelar}
        onSubmit={handleGuardar}
        initialData={form}
        errores={errores}
        cargando={cargando}
        categoriasCat={categoriasCat}
        subcategoriasCat={subcategoriasCat}
        catLoading={catLoading}
      />
    </div>
  );
}
