import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Circle, Filter, FileText } from "lucide-react";import LiquidacionesReaderModal from "@/components/liquidaciones/LiquidacionesReaderModal";

// ======= Helper modals for ventas/liquidaciones =========
function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function NewVentaModal({ open, onClose, formData, setFormData, onSubmit, acopios, cultivos }) {
  if (!open) return null;
  const [errors, setErrors] = React.useState({});
  const requiredMsg = "Campo obligatorio";
  const validate = () => {
    const e = {};
    if (!formData.fecha) e.fecha = requiredMsg;
    if (!formData.acopio) e.acopio = requiredMsg;
    if (!formData.cultivo) e.cultivo = requiredMsg;
    if (!formData.cosecha) e.cosecha = requiredMsg;
    if (!formData.kg || isNaN(Number(formData.kg))) e.kg = "Ingresá kilos válidos";
    if (!formData.precio || isNaN(Number(formData.precio))) e.precio = "Ingresá precio válido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSubmitLocal = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(e);
  };
  // For cosecha button group, use cosechas from outer scope
  // eslint-disable-next-line no-undef
  return (
    <Overlay onClose={onClose}>
      <h4 className="text-xl font-bold mb-3">Agregar Venta</h4>
      <form onSubmit={handleSubmitLocal} className="space-y-4">
        {/* Fecha a ancho completo (sin fondo ni separador) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha *
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={(e) => setFormData((f) => ({ ...f, fecha: e.target.value }))}
              aria-invalid={!!errors.fecha}
              className={`mt-1 w-full border rounded-md px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent${errors.fecha ? ' border-red-500 ring-red-200' : ''}`}
            />
            {errors.fecha && <span className="mt-1 block text-xs text-red-600">{errors.fecha}</span>}
          </label>
        </div>
        {/* ----- Nueva estructura: dos columnas (mejorada para carga rápida) ----- */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Columna izquierda: Fecha + Acopio + botones/chips */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="text-sm font-medium text-gray-700">Acopio *</div>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {acopios.map((a) => {
                  const active = formData.acopio === a;
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setFormData((f) => ({ ...f, acopio: a }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
              {errors.acopio && <span className="mt-1 block text-xs text-red-600">{errors.acopio}</span>}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Cultivo *</div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {cultivos.map((c) => {
                  const active = formData.cultivo === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormData((f) => ({ ...f, cultivo: c }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {errors.cultivo && <span className="mt-1 block text-xs text-red-600">{errors.cultivo}</span>}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Cosecha *</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {cosechas.map((camp) => {
                  const active = formData.cosecha === camp;
                  return (
                    <button
                      type="button"
                      key={camp}
                      onClick={() => setFormData((f) => ({ ...f, cosecha: camp }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {camp}
                    </button>
                  );
                })}
              </div>
              {errors.cosecha && <span className="mt-1 block text-xs text-red-600">{errors.cosecha}</span>}
            </div>
          </div>

          {/* Columna derecha: Cantidad y Precio, inputs grandes */}
          <div className="md:col-span-5 space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              Cantidad (Kg)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                placeholder="Ej: 25000"
                name="kg"
                value={formData.kg}
                onChange={(e) => setFormData((f) => ({ ...f, kg: e.target.value }))}
                className={`mt-1 w-full border rounded-md px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-right${errors.kg ? ' border-red-500 ring-red-200' : ''}`}
              />
              {errors.kg && <span className="mt-1 block text-xs text-red-600">{errors.kg}</span>}
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Precio/Kg
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ej: 320.50"
                name="precio"
                value={formData.precio}
                onChange={(e) => {
                  const v = e.target.value;
                  // permitir solo números y un punto decimal
                  const cleaned = v.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  const normalized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                  setFormData((f) => ({ ...f, precio: normalized }));
                }}
                className={`mt-1 w-full border rounded-md px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-right${errors.precio ? ' border-red-500 ring-red-200' : ''}`}
              />
              {errors.precio && <span className="mt-1 block text-xs text-red-600">{errors.precio}</span>}
            </label>
          </div>
        </div>
        {/* Footer stays below both columns */}
        <div className="flex justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded text-base">Cancelar</button>
          <button
            type="submit"
            disabled={Object.keys(errors).length > 0}
            className={`px-3 py-1 rounded text-base text-white ${Object.keys(errors).length > 0 ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600'} `}
          >
            Guardar
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function EditVentaModal({ open, onClose, initialData, acopios, cultivos, onSubmit }) {
  if (!open) return null;
  const [formData, setFormData] = React.useState({
    id: initialData?.id,
    fecha: initialData?.fecha || new Date().toISOString().split('T')[0],
    acopio: initialData?.acopio || '',
    cultivo: initialData?.cultivo || '',
    cosecha: initialData?.cosecha || '',
    kg: initialData?.kg ?? '',
    precio: initialData?.precio ?? '',
  });
  React.useEffect(() => {
    setFormData({
      id: initialData?.id,
      fecha: initialData?.fecha || new Date().toISOString().split('T')[0],
      acopio: initialData?.acopio || '',
      cultivo: initialData?.cultivo || '',
      cosecha: initialData?.cosecha || '',
      kg: initialData?.kg ?? '',
      precio: initialData?.precio ?? '',
    });
  }, [initialData, open]);

  const [errors, setErrors] = React.useState({});
  const requiredMsg = 'Campo obligatorio';
  const validate = () => {
    const e = {};
    if (!formData.fecha) e.fecha = requiredMsg;
    if (!formData.acopio) e.acopio = requiredMsg;
    if (!formData.cultivo) e.cultivo = requiredMsg;
    if (!formData.cosecha) e.cosecha = requiredMsg;
    if (formData.kg === '' || isNaN(Number(formData.kg))) e.kg = 'Ingresá kilos válidos';
    if (formData.precio === '' || isNaN(Number(formData.precio))) e.precio = 'Ingresá precio válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitLocal = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...formData });
  };

  return (
    <Overlay onClose={onClose}>
      <h4 className="text-xl font-bold mb-3">Editar Venta</h4>
      <form onSubmit={handleSubmitLocal} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fecha *
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={(e) => setFormData((f) => ({ ...f, fecha: e.target.value }))}
              aria-invalid={!!errors.fecha}
              className={`mt-1 w-full border rounded-md px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent${errors.fecha ? ' border-red-500 ring-red-200' : ''}`}
            />
            {errors.fecha && <span className="mt-1 block text-xs text-red-600">{errors.fecha}</span>}
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="text-sm font-medium text-gray-700">Acopio *</div>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {acopios.map((a) => {
                  const active = formData.acopio === a;
                  return (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setFormData((f) => ({ ...f, acopio: a }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
              {errors.acopio && <span className="mt-1 block text-xs text-red-600">{errors.acopio}</span>}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Cultivo *</div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {cultivos.map((c) => {
                  const active = formData.cultivo === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormData((f) => ({ ...f, cultivo: c }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {errors.cultivo && <span className="mt-1 block text-xs text-red-600">{errors.cultivo}</span>}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700">Cosecha *</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {cosechas.map((camp) => {
                  const active = formData.cosecha === camp;
                  return (
                    <button
                      type="button"
                      key={camp}
                      onClick={() => setFormData((f) => ({ ...f, cosecha: camp }))}
                      className={`px-3 py-2 rounded-md border text-sm md:text-base text-center ${
                        active
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {camp}
                    </button>
                  );
                })}
              </div>
              {errors.cosecha && <span className="mt-1 block text-xs text-red-600">{errors.cosecha}</span>}
            </div>
          </div>

          <div className="md:col-span-5 space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              Cantidad (Kg)
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                name="kg"
                value={formData.kg}
                onChange={(e) => setFormData((f) => ({ ...f, kg: e.target.value }))}
                className={`mt-1 w-full border rounded-md px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-right${errors.kg ? ' border-red-500 ring-red-200' : ''}`}
              />
              {errors.kg && <span className="mt-1 block text-xs text-red-600">{errors.kg}</span>}
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Precio/Kg
              <input
                type="text"
                inputMode="decimal"
                name="precio"
                value={formData.precio}
                onChange={(e) => {
                  const v = e.target.value;
                  const cleaned = v.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  const normalized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
                  setFormData((f) => ({ ...f, precio: normalized }));
                }}
                className={`mt-1 w-full border rounded-md px-4 py-3 text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-right${errors.precio ? ' border-red-500 ring-red-200' : ''}`}
              />
              {errors.precio && <span className="mt-1 block text-xs text-red-600">{errors.precio}</span>}
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded text-base">Cancelar</button>
          <button type="submit" className="px-3 py-1 rounded text-base text-white bg-green-600">Guardar</button>
        </div>
      </form>
    </Overlay>
  );
}

function FilterVentasModal({ open, onClose, filters, setFilters, acopios, cosechas, cultivos }) {
  if (!open) return null;
  const [local, setLocal] = React.useState(filters);
  React.useEffect(() => setLocal(filters), [open]); // refrescar al abrir
  const apply = () => {
    setFilters(local);
    onClose();
  };
  const clear = () => setLocal({});
  return (
    <Overlay onClose={onClose}>
      <h4 className="text-xl font-bold mb-3">Filtros de ventas</h4>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Fecha</label>
          <input
            type="text"
            placeholder="2025 • 2025-09 • 2025-09-12"
            value={local.fecha || ""}
            onChange={(e) => setLocal((f) => ({ ...f, fecha: e.target.value }))}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Acopio</label>
          <select
            value={local.acopio || ""}
            onChange={(e) => setLocal((f) => ({ ...f, acopio: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 bg-white"
          >
            <option value="">(todos)</option>
            {acopios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Cultivo</label>
          <select
            value={local.cultivo || ""}
            onChange={(e) => setLocal((f) => ({ ...f, cultivo: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 bg-white"
          >
            <option value="">(todos)</option>
            {cultivos.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Cosecha</label>
          <select
            value={local.cosecha || ""}
            onChange={(e) => setLocal((f) => ({ ...f, cosecha: e.target.value }))}
            className="w-full border rounded-md px-3 py-2 bg-white"
          >
            <option value="">(todas)</option>
            {cosechas.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">KG</label>
          <input
            type="text"
            placeholder=">10000 • 10000-20000"
            value={local.kg || ""}
            onChange={(e) => setLocal((f) => ({ ...f, kg: e.target.value }))}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm text-gray-600 mb-1">Precio/Kg</label>
          <input
            type="text"
            placeholder="<300 • 200-400"
            value={local.precio || ""}
            onChange={(e) => setLocal((f) => ({ ...f, precio: e.target.value }))}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
          onClick={clear}
        >
          Limpiar
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={apply}
        >
          Aplicar
        </button>
      </div>
    </Overlay>
  );
}


const acopios = ["AGD", "Bunge", "ACA"];
const cosechas = ["23-24", "24-25"];
const defaultCultivos = ["Soja", "Maíz", "Trigo"];

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

// === Helpers PDF (resolver URL y abrir firmado) ===
const getPdfUrlGeneric = (row) => row?.archivo_url || row?.archivoUrl || row?.pdf_url || row?.pdfUrl || "";
const resolveStoragePath = (input) => {
  if (!input) return null;
  const s = String(input);
  if (/^https?:\/\//i.test(s)) {
    const m = s.match(/\/storage\/v1\/object\/(?:public\/)?liquidaciones\/(.+)$/);
    if (m && m[1]) return m[1];
    return s; // URL completa ya firmada o accesible
  }
  let p = s.replace(/^\/+/, "");
  p = p.replace(/^public\//, "");
  p = p.replace(/^liquidaciones\//, "");
  return p;
};
async function handleViewPdfSelected(row) {
  try {
    const raw = getPdfUrlGeneric(row);
    if (!raw) {
      alert("Esta liquidación no tiene PDF adjunto.");
      return;
    }
    const pathOrUrl = resolveStoragePath(raw);
    if (!pathOrUrl) {
      alert("No pude resolver la ruta del PDF.");
      return;
    }
    if (/^https?:\/\//i.test(pathOrUrl)) {
      window.open(pathOrUrl, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.storage
      .from("liquidaciones")
      .createSignedUrl(pathOrUrl, 60 * 10);
    if (error || !data?.signedUrl) throw error || new Error("No se pudo firmar la URL");
    window.open(data.signedUrl, "_blank", "noopener");
  } catch (e) {
    console.error(e);
    alert(e?.message || String(e));
  }
}

function VentasPage() {
  // STOCK & VENTAS
  const [camionesData, setCamionesData] = useState([]);
  const [ventasTable, setVentasTable] = useState([]);
  const [stockByCultivo, setStockByCultivo] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);
  const [errorStock, setErrorStock] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [errorTable, setErrorTable] = useState(null);
  const ventasScrollRef = useRef(null);
  const [ventasScrolled, setVentasScrolled] = useState(false);
  const liqScrollRef = useRef(null);
  const [liqScrolled, setLiqScrolled] = useState(false);

  // === Global search (Navbar) ===
  const [query, setQuery] = useState(typeof window !== "undefined" ? (window.__GLOBAL_SEARCH_QUERY__ || "") : "");
  useEffect(() => {
    const onGlobalSearch = (e) => setQuery(e?.detail?.q ?? "");
    window.addEventListener("global-search", onGlobalSearch);
    return () => window.removeEventListener("global-search", onGlobalSearch);
  }, []);
  const qNorm = (query || "").trim().toLowerCase();

  // ORDEN & FILTROS (por columna)
  const [sort, setSort] = useState({ key: null, dir: 'asc' }); // dir: 'asc' | 'desc'
  const [filters, setFilters] = useState({}); // { fecha: '2025-09', acopio: 'AGD', kg: '>10000', precio: '200-400', ... }
  // Panel de filtros (único)
  const [showFilters, setShowFilters] = useState(false);

  // FORMS
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingMode, setEditingMode] = useState(false); // true = mostrar formulario Editar Venta
  const [editingData, setEditingData] = useState({});
  const [liquidacionesLocal, setLiquidacionesLocal] = useState([]);
  const [liqDeVenta, setLiqDeVenta] = useState([]);
  // === DnD y lista de liquidaciones sin venta (cuando no hay venta seleccionada) ===
  const [liqSinVenta, setLiqSinVenta] = useState([]);
  const [dndBusy, setDndBusy] = useState(false);
  const [dragOverVentaId, setDragOverVentaId] = useState(null);

  // Filtros para "Liquidaciones para asociar"
  const [liqSearch, setLiqSearch] = useState("");
  const [liqFilterGrano, setLiqFilterGrano] = useState("");
  const [liqFilterCosecha, setLiqFilterCosecha] = useState("");
  const [liqFiltersOpen, setLiqFiltersOpen] = useState(false);
  const liqGranoOpts = React.useMemo(() => {
    const set = new Set((liqSinVenta || []).map(r => r.grano).filter(Boolean));
    return Array.from(set);
  }, [liqSinVenta]);
  const liqCosechaOpts = React.useMemo(() => {
    const set = new Set((liqSinVenta || []).map(r => r.cosecha || r.campania).filter(Boolean));
    return Array.from(set);
  }, [liqSinVenta]);
  const liqSinVentaFiltradas = React.useMemo(() => {
    const q = (liqSearch || "").toLowerCase();
    const norm = (v) => (v == null ? "" : String(v)).toLowerCase();
    return (liqSinVenta || []).filter((r) => {
      if (liqFilterGrano && (r.grano || "") !== liqFilterGrano) return false;
      if (liqFilterCosecha && ((r.cosecha || r.campania || "")) !== liqFilterCosecha) return false;
      if (!q) return true;
      return (
        norm(r.fecha).includes(q) ||
        norm(r.coe).includes(q) ||
        norm(r.nro_comprobante).includes(q) ||
        norm(r.grano).includes(q) ||
        norm(r.cosecha).includes(q) ||
        norm(r.campania).includes(q) ||
        norm(r.cantidad_kg).includes(q) ||
        norm(r.precio_kg).includes(q) ||
        norm(r.archivo_nombre).includes(q)
      );
    });
  }, [liqSinVenta, liqSearch, liqFilterGrano, liqFilterCosecha]);

  // Aplicar búsqueda global también a la bandeja de "Liquidaciones para asociar"
  const liqSinVentaFiltradasGlobal = useMemo(() => {
    if (!qNorm) return liqSinVentaFiltradas;
    const norm = (v) => (v == null ? "" : String(v)).toLowerCase();
    return liqSinVentaFiltradas.filter((r) => {
      return (
        norm(r.fecha).includes(qNorm) ||
        norm(r.grano).includes(qNorm) ||
        norm(r.cosecha).includes(qNorm) ||
        norm(r.campania).includes(qNorm) ||
        norm(r.coe).includes(qNorm) ||
        norm(r.nro_comprobante).includes(qNorm) ||
        norm(r.cantidad_kg).includes(qNorm) ||
        norm(r.precio_kg).includes(qNorm) ||
        norm(r.archivo_nombre).includes(qNorm)
      );
    });
  }, [liqSinVentaFiltradas, qNorm]);

  // Desasociar liquidación de una venta
  const [unassigning, setUnassigning] = useState(false);
  const unassignSelected = async () => {
    if (!editingId || !selectedLiq?.id) return;
    if (!confirm("¿Desasociar esta liquidación de la venta?")) return;
    try {
      setUnassigning(true);
      const id = selectedLiq.id;
      const kg = Number(selectedLiq.cantidad_kg) || 0;
      const { error } = await supabase
        .from('liquidaciones_arca')
        .update({ venta_id: null })
        .eq('id', id);
      if (error) throw error;

      // Quitar de la lista de la venta actual (panel derecho)
      setLiqDeVenta((prev) => prev.filter((r) => r.id !== id));

      // Restar kilos asignados a esta venta
      setLiqSumByVenta((prev) => ({
        ...prev,
        [editingId]: Math.max(0, (prev[editingId] || 0) - kg),
      }));

      // Agregar a la bandeja de "sin venta" si no hay venta seleccionada
      setLiqSinVenta((prev) => {
        const base = {
          id: selectedLiq.id,
          coe: selectedLiq.coe,
          nro_comprobante: selectedLiq.nro_comprobante,
          cantidad_kg: selectedLiq.cantidad_kg,
          precio_kg: selectedLiq.precio_kg,
          archivo_url: selectedLiq.archivo_url || selectedLiq.archivoUrl,
          archivo_nombre: selectedLiq.archivo_nombre || selectedLiq.archivoNombre,
        };
        // si ya existe, evitar duplicado
        if (prev.some((x) => x.id === base.id)) return prev;
        // si HAY venta seleccionada, igual la mostramos en sin-venta cuando se desasocia? => sí, para reutilizar DnD
        return [base, ...prev];
      });

      setSelectedLiq(null);
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setUnassigning(false);
    }
  };

  const allowDrop = (ev) => {
    ev.preventDefault();
  };

  const onDragLiquidacion = (id) => (ev) => {
    ev.dataTransfer.setData('text/liquidacion-id', String(id));
  };

  const handleDropLiqOnVenta = (ventaId) => async (ev) => {
    ev.preventDefault();
    const liqIdStr = ev.dataTransfer.getData('text/liquidacion-id');
    const liqId = Number(liqIdStr);
    if (!liqId) return;
    try {
      setDndBusy(true);
      const { error } = await supabase
        .from('liquidaciones_arca')
        .update({ venta_id: ventaId })
        .eq('id', liqId);
      if (error) throw error;

      // Sacar de la lista de sin venta
      setLiqSinVenta((prev) => prev.filter((r) => r.id !== liqId));

      // Si la venta droppeada es la actualmente seleccionada, incorporarla a su tabla
      if (editingId === ventaId) {
        // Buscar la liq en el arreglo previo para mapear campos
        const match = liqSinVenta.find((x) => x.id === liqId);
        if (match) {
          setLiqDeVenta((prev) => [
            {
              id: match.id,
              coe: match.coe,
              nro_comprobante: match.nro_comprobante,
              cantidad_kg: match.cantidad_kg,
              precio_kg: match.precio_kg,
              archivo_url: match.archivo_url,
              archivo_nombre: match.archivo_nombre,
            },
            ...prev,
          ]);
        }
      }

      // Actualizar sums por venta (si las usás en esta vista)
      setLiqSumByVenta((prev) => ({
        ...prev,
        [ventaId]: (prev[ventaId] || 0) + (Number((liqSinVenta.find(x=>x.id===liqId)||{}).cantidad_kg)||0),
      }));
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setDndBusy(false);
    }
  };
  const [selectedLiq, setSelectedLiq] = useState(null);
  const [liqSumByVenta, setLiqSumByVenta] = useState({});
  // SUMA DE KG POR VENTA (para estado Completa/Faltan KG)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("liquidaciones_arca")
          .select("venta_id, cantidad_kg")
          .not("venta_id", "is", null);
        if (error) throw error;
        const sums = {};
        (data || []).forEach((r) => {
          const id = r.venta_id;
          const k = Number(r.cantidad_kg) || 0;
          sums[id] = (sums[id] || 0) + k;
        });
        setLiqSumByVenta(sums);
      } catch (err) {
        console.warn("No pude calcular suma de liquidaciones por venta:", err?.message || err);
      }
    })();
  }, []);

  // LIQUIDACIONES DE LA VENTA SELECCIONADA (panel derecho)
useEffect(() => {
  if (!editingId) {
    setLiqDeVenta([]);
    return;
  }
  (async () => {
    try {
      const { data, error } = await supabase
        .from("liquidaciones_arca")
       .select("id, coe, nro_comprobante, cantidad_kg, precio_kg, importe_neto_a_pagar, pago_segun_condiciones, archivo_url, archivo_nombre")
        .eq("venta_id", editingId)
        .order("fecha", { ascending: false });
      if (error) throw error;
      setSelectedLiq(null);
      setLiqDeVenta(data || []);
    } catch (err) {
      console.warn("No pude traer liquidaciones de la venta:", err?.message || err);
      setLiqDeVenta([]);
    }
  })();
}, [editingId]);

  // Cargar liquidaciones SIN venta solo cuando no hay venta seleccionada
  useEffect(() => {
    if (editingId) {
      setLiqSinVenta([]);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('liquidaciones_arca')
          .select('id, fecha, grano, cosecha, coe, nro_comprobante, cantidad_kg, precio_kg, archivo_url, archivo_nombre')
          .is('venta_id', null)
          .order('fecha', { ascending: false });
        if (error) throw error;
        setLiqSinVenta(data || []);
      } catch (err) {
        console.warn('No pude traer liquidaciones sin venta:', err?.message || err);
        setLiqSinVenta([]);
      }
    })();
  }, [editingId]);

  const [liquidacionOpen, setLiquidacionOpen] = useState(false);
  const [editVentaOpen, setEditVentaOpen] = useState(false);
  const [liqInitialFile, setLiqInitialFile] = useState(null);
  const [editLiqData, setEditLiqData] = useState(null);
  // File picker para "Cargar liquidación" (patrón Facturas)
  const liqPickerRef = useRef(null);
  

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

  // FETCH LIQUIDACIONES ARCA (inicial)
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("liquidaciones_arca")
          .select("id, fecha, grano, cantidad_kg, precio_kg, archivo_url, archivo_nombre")
          .order("fecha", { ascending: false })
          .limit(20);
        if (error) throw error;
        setLiquidacionesLocal(
          (data || []).map((r) => ({
            ...r,
            kg: r.cantidad_kg ?? r.kg,
            precio: r.precio_kg ?? r.precio,
            archivoNombre: r.archivo_nombre ?? r.archivoNombre,
            archivoUrl: r.archivo_url ?? r.archivoUrl,
          }))
        );
      } catch (err) {
        console.warn("No pude traer liquidaciones_arca:", err?.message || err);
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

  // 2) Override de entregados: Soja 23-24 en AGD = 887.770 KG (forzar valor base de entregados)
  {
    const cult = "Soja";
    const acopio = "AGD";
    const camp = "23-24";
    const forced = 887770; // KG entregados
    if (grouped[cult]) {
      const current = grouped[cult].byCampaniaAndAcopio?.[camp]?.[acopio] || 0;
      const delta = forced - current;
      // setear celda exacta
      if (!grouped[cult].byCampaniaAndAcopio[camp]) grouped[cult].byCampaniaAndAcopio[camp] = {};
      grouped[cult].byCampaniaAndAcopio[camp][acopio] = forced;
      // ajustar el total por acopio con el delta
      if (grouped[cult].totalsByAcopio[acopio] == null) grouped[cult].totalsByAcopio[acopio] = 0;
      grouped[cult].totalsByAcopio[acopio] += delta;
    }
  }

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

  // 4) Normalizar: forzar que el total por acopio sea la suma de todas las cosechas (consistencia visual)
  Object.keys(grouped).forEach((cult) => {
    const g = grouped[cult];
    if (!g) return;
    Object.keys(g.totalsByAcopio || {}).forEach((a) => {
      let sumA = 0;
      Object.keys(g.byCampaniaAndAcopio || {}).forEach((camp) => {
        sumA += Number(g.byCampaniaAndAcopio?.[camp]?.[a] || 0);
      });
      g.totalsByAcopio[a] = sumA;
    });
  });

  // 5) Coerción final: asegurar números y sin negativos
  Object.keys(grouped).forEach((cult) => {
    const g = grouped[cult];
    if (!g) return;
    Object.keys(g.totalsByAcopio || {}).forEach((a) => {
      const v = Number(g.totalsByAcopio[a]) || 0;
      g.totalsByAcopio[a] = v < 0 ? 0 : v;
    });
    Object.keys(g.byCampaniaAndAcopio || {}).forEach((camp) => {
      const row = g.byCampaniaAndAcopio[camp] || {};
      Object.keys(row).forEach((a) => {
        const v = Number(row[a]) || 0;
        row[a] = v < 0 ? 0 : v;
      });
    });
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
            kg: Number(String(formData.kg).replace(',', '.')),
            precio: Number(String(formData.precio).replace(',', '.')),
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
    setEditingMode(true);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
    setEditingMode(false);
  };
  const saveEdit = async () => {
    try {
      const { data, error } = await supabase
        .from("ventas")
        .update({
          ...editingData,
          kg: Number(String(editingData.kg).replace(',', '.')),
          precio: Number(String(editingData.precio).replace(',', '.')),
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

// Totales de kg y precio promedio (sin filtros)
const totalKg = ventasTable.reduce((sum, r) => sum + Number(r.kg), 0);
const avgPrecio =
  ventasTable.length > 0
    ? ventasTable.reduce((sum, r) => sum + Number(r.precio), 0) / ventasTable.length
    : 0;

// Totales visibles con filtros/orden
const normalize = (v) => (v ?? '').toString().toLowerCase();
const passesFilter = (row, key, value) => {
  if (!value) return true;
  const raw = row[key];
  // Numéricos: kg / precio aceptan:  ">=100", "<200", "100-300"
  if (['kg', 'precio'].includes(key)) {
    const num = Number(raw);
    const val = String(value).replace(',', '.').trim();
    const mRange = val.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
    if (mRange) {
      const min = Number(mRange[1]);
      const max = Number(mRange[2]);
      return !isNaN(num) && num >= min && num <= max;
    }
    const mOp = val.match(/^(<=|>=|<|>)\s*(\d+(?:\.\d+)?)/);
    if (mOp) {
      const op = mOp[1];
      const cmp = Number(mOp[2]);
      if (isNaN(num)) return false;
      if (op === '<') return num < cmp;
      if (op === '<=') return num <= cmp;
      if (op === '>') return num > cmp;
      if (op === '>=') return num >= cmp;
    }
    const target = Number(val);
    if (!isNaN(target)) return !isNaN(num) && num === target;
    return true;
  }
  // Fecha: permite filtrar por "2025", "2025-09" o "2025-09-12"
  if (key === 'fecha') {
    if (!raw) return false;
    return String(raw).startsWith(String(value));
  }
  // Texto: contains (case-insensitive)
  return normalize(raw).includes(normalize(value));
};

const ventasFiltradasYOrdenadas = React.useMemo(() => {
  let rows = [...ventasTable];
  // aplicar filtros activos
  Object.entries(filters).forEach(([k, v]) => {
    if (v) rows = rows.filter((r) => passesFilter(r, k, v));
  });
  // ordenar
  if (sort.key) {
    const k = sort.key;
    const dir = sort.dir === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      // num
      if (['kg', 'precio'].includes(k)) {
        const an = Number(av) || 0;
        const bn = Number(bv) || 0;
        return (an - bn) * dir;
      }
      // fecha YYYY-MM-DD
      if (k === 'fecha') {
        const ad = new Date(av || 0).getTime();
        const bd = new Date(bv || 0).getTime();
        return (ad - bd) * dir;
      }
      // string
      return normalize(av).localeCompare(normalize(bv)) * dir;
    });
  }
  // búsqueda global (Navbar): fecha, acopio, cultivo, cosecha, kg, precio
  if (qNorm) {
    const norm = (v) => (v == null ? "" : String(v)).toLowerCase();
    rows = rows.filter((r) => {
      return (
        norm(r.fecha).includes(qNorm) ||
        norm(r.acopio).includes(qNorm) ||
        norm(r.cultivo).includes(qNorm) ||
        norm(r.cosecha).includes(qNorm) ||
        norm(r.kg).includes(qNorm) ||
        norm(r.precio).includes(qNorm)
      );
    });
  }
  return rows;
}, [ventasTable, filters, sort, qNorm]);

const totalKgVisible = ventasFiltradasYOrdenadas.reduce((sum, r) => sum + Number(r.kg), 0);
const avgPrecioVisible =
  ventasFiltradasYOrdenadas.length > 0
    ? ventasFiltradasYOrdenadas.reduce((sum, r) => sum + Number(r.precio), 0) / ventasFiltradasYOrdenadas.length
    : 0;


  return (
    <div className="w-full min-h-screen pb-12 px-2 text-[15px] md:text-base lg:text-[17px]">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h1 className="text-2xl font-semibold text-gray-700">Stock / Ventas</h1>
        </div>
{/* STOCK CARDS */}
{loadingStock ? (
  <p className="text-gray-500">Cargando stock…</p>
) : errorStock ? (
  <p className="text-red-500">{errorStock}</p>
) : (
  <div className="grid justify-start gap-6 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    {defaultCultivos.map((cultivo) => {
      const { totalsByAcopio, byCampaniaAndAcopio } =
        stockByCultivo[cultivo] || {};
      const sum = Object.values(totalsByAcopio || {}).reduce(
        (a, b) => a + (Number(b) || 0),
        0
      );
      const open = expandedCultivo === cultivo;
      const camps = cosechas.filter((c) =>
        acopios.some((a) => byCampaniaAndAcopio?.[c]?.[a] > 0)
      );

      return (
        <div
          key={cultivo}
          className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden cursor-pointer"
          onClick={() => setExpandedCultivo(open ? null : cultivo)}
        >
          {/* Header */}
          <div className="px-6 py-4 flex justify-between items-center">
            <h3 className="text-2xl font-semibold">{cultivo}</h3>
            {sum > 0 ? (
              <span className="text-green-700 font-extrabold text-2xl">
                {formatNumber(sum)} KG
              </span>
            ) : (
              <span className="italic text-gray-400">Sin stock</span>
            )}
          </div>

          {/* Divider */}
          <hr className="border-gray-100 mx-6" />

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



      {/* TABLA DE VENTAS + PANEL DERECHA (liquidaciones de la venta) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* IZQUIERDA: VENTAS */}
        <div className="lg:col-span-7">
          <div className={`rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden ${editingId ? 'min-h-[540px]' : ''}`}>
            <div className="px-5 py-4 h-[72px] bg-white/70 border-b border-gray-200/60 backdrop-blur flex items-center justify-between">
              <h3 className="text-gray-900 text-lg font-semibold">Ventas</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium inline-flex items-center gap-2"
                  title="Mostrar/ocultar filtros"
                >
                  <Filter size={18} />
                  Filtros
                  {Object.values(filters).some(Boolean) && (
                    <span className="ml-1 inline-flex items-center justify-center text-xs px-1.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">●</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowNew(true);
                    cancelEdit();
                  }}
                  className="px-4 py-2 rounded-md shadow-sm transition text-white bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
                >
                  Nueva Venta
                </button>
                {editingId && (
                  <>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
                      title="Cancelar selección de venta"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setEditVentaOpen(true)}
                      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={deleteEdit}
                      className="px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-base font-medium"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
            {loadingTable ? (
              <p className="p-6 text-center text-gray-500">Cargando…</p>
            ) : errorTable ? (
              <p className="p-6 text-center text-red-500">{errorTable}</p>
            ) : (
              <div
                className="overflow-x-auto max-h-[60vh]"
                ref={ventasScrollRef}
                onScroll={(e) => setVentasScrolled(e.currentTarget.scrollTop > 0)}
              >
                <table className="min-w-full text-base">
                  <thead className={`bg-white sticky top-0 z-10 border-b border-gray-200/60 ${ventasScrolled ? 'shadow-sm' : ''}`}>
                    <tr className="h-12">
                      {[
                        { key: "fecha", label: "Fecha" },
                        { key: "acopio", label: "Acopio" },
                        { key: "cultivo", label: "Cultivo" },
                        { key: "cosecha", label: "Cosecha" },
                        { key: "kg", label: "Cantidad" },
                        { key: "precio", label: "Precio/Kg" },
                        { key: "ok", label: "" },
                      ].map(({ key, label }) => {
                        const isSortable = key !== 'ok';
                        const isSorted = sort.key === key;
                        const arrow = isSorted ? (sort.dir === 'asc' ? '▲' : '▼') : '';
                        return (
                          <th
                            key={key}
                            className={`px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 select-none ${key === 'ok' ? 'text-center w-10' : 'text-left'} ${isSortable ? 'cursor-pointer hover:text-gray-900' : ''}`}
                            onClick={() => {
                              if (!isSortable) return;
                              setSort((s) => {
                                if (s.key !== key) return { key, dir: 'asc' };
                                return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
                              });
                            }}
                            title={`Click: ordenar`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span>{label}</span>
                              {isSorted && <span className="text-[10px] opacity-70">{arrow}</span>}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {ventasFiltradasYOrdenadas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          {qNorm
                            ? "No hay ventas que coincidan con la búsqueda."
                            : "No hay ventas para mostrar."}
                        </td>
                      </tr>
                    ) : ventasFiltradasYOrdenadas.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => {
                          setEditingId(r.id);
                          setEditingData({ ...r });
                          setEditingMode(false); // ver panel de liquidaciones por defecto
                          setLiqFiltersOpen(false);
                        }}
                        onDragOver={allowDrop}
                        onDragEnter={() => setDragOverVentaId(r.id)}
                        onDragLeave={() => setDragOverVentaId((prev) => (prev === r.id ? null : prev))}
                        onDrop={(e) => { setDragOverVentaId(null); handleDropLiqOnVenta(r.id)(e); }}
                        className={`h-[52px] cursor-pointer even:bg-gray-50 hover:bg-gray-100 ${editingId === r.id ? 'ring-2 ring-green-500/30 bg-green-50' : ''} ${dragOverVentaId === r.id ? 'outline outline-2 outline-emerald-500' : ''}`}
                      >
                        <td className="px-4 py-2.5 h-[52px] align-middle whitespace-nowrap">{formatDate(r.fecha)}</td>
                        <td className="px-4 py-2.5 h-[52px] align-middle whitespace-nowrap">{r.acopio}</td>
                        <td className="px-4 py-2.5 h-[52px] align-middle whitespace-nowrap">{r.cultivo}</td>
                        <td className="px-4 py-2.5 h-[52px] align-middle whitespace-nowrap">{r.cosecha}</td>
                        <td className="px-4 py-2.5 h-[52px] align-middle text-left whitespace-nowrap">{formatNumber(r.kg)} KG</td>
                        <td className="px-4 py-2.5 h-[52px] align-middle text-left whitespace-nowrap">{formatPrice(r.precio)}</td>
                        {(() => {
                          const asignados = liqSumByVenta[r.id] || 0;
                          const restantes = Math.max(0, Number(r.kg) - asignados);
                          const completa = restantes === 0;
                          return (
                            <td className="px-4 py-2.5 h-[52px] align-middle text-center">
                              {completa ? (
                                <CheckCircle size={18} className="inline align-middle text-green-600" title="Completa" />
                              ) : (
                                <Circle size={18} className="inline align-middle text-yellow-500" title="Faltan KG" />
                              )}
                            </td>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold sticky bottom-0 z-10 border-t border-gray-200/60 h-[52px]">
                      <td className="px-4 py-2.5 h-[52px] align-middle">Totales</td>
                      <td className="px-4 py-2.5 h-[52px] align-middle"></td>
                      <td className="px-4 py-2.5 h-[52px] align-middle"></td>
                      <td className="px-4 py-2.5 h-[52px] align-middle"></td>
                      <td className="px-4 py-2.5 h-[52px] align-middle text-left">{formatNumber(totalKgVisible)} KG</td>
                      <td className="px-4 py-2.5 h-[52px] align-middle text-left">{formatPrice(avgPrecioVisible)}</td>
                      <td className="px-4 py-2.5 h-[52px] align-middle"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* DERECHA: LIQUIDACIONES DE LA VENTA SELECCIONADA */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
            <div className="px-5 py-4 h-[72px] bg-white/70 border-b border-gray-200/60 backdrop-blur flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-gray-900 text-lg font-semibold">
                    {!editingId && liqSinVenta.length > 0 ? "Liquidaciones para asociar" : "Liquidaciones de la venta"}
                  </h3>
                  {!editingId && liqSinVenta.length > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arrastrá una liquidación sobre una venta para asociarla
                    </p>
                  )}
                </div>

                {!editingId && (
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setLiqFiltersOpen((v) => !v)}
                      className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-base font-medium inline-flex items-center gap-2"
                      title="Mostrar/ocultar filtros de liquidaciones"
                    >
                      <Filter size={18} />
                      Filtros
                      {(liqSearch || liqFilterGrano || liqFilterCosecha) && (
                        <span className="ml-1 inline-flex items-center justify-center text-xs px-1.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">●</span>
                      )}
                    </button>

                    {liqFiltersOpen && (
                      <div className="absolute right-0 mt-2 w-[560px] z-20">
                        <div className="rounded-lg border border-gray-200 bg-white shadow-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-1">
                            <label className="block text-xs text-gray-600 mb-1">Buscar</label>
                            <input
                              type="text"
                              value={liqSearch}
                              onChange={(e)=>setLiqSearch(e.target.value)}
                              placeholder="grano, cosecha, COE, KG, precio…"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Grano</label>
                            <select
                              value={liqFilterGrano}
                              onChange={(e)=>setLiqFilterGrano(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">(todos)</option>
                              {liqGranoOpts.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Cosecha</label>
                            <select
                              value={liqFilterCosecha}
                              onChange={(e)=>setLiqFilterCosecha(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">(todas)</option>
                              {liqCosechaOpts.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                              onClick={() => { setLiqSearch(''); setLiqFilterGrano(''); setLiqFilterCosecha(''); }}
                            >
                              Limpiar
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                              onClick={() => setLiqFiltersOpen(false)}
                            >
                              Aplicar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingId && selectedLiq?.id && (
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={unassignSelected}
                      disabled={unassigning}
                      className="px-3 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium disabled:opacity-50"
                      title="Desasociar la liquidación seleccionada de esta venta"
                    >
                      {unassigning ? 'Desasociando…' : 'Desasociar'}
                    </button>
                  </div>
                )}
              </div>
            {!editingId ? (
              <div
                className="overflow-x-auto max-h-[60vh]"
                ref={liqScrollRef}
                onScroll={(e) => setLiqScrolled(e.currentTarget.scrollTop > 0)}
              >
                {liqSinVentaFiltradasGlobal.length === 0 ? (
                  <p className="p-6 text-center text-gray-500">
                    {qNorm ? "No hay liquidaciones que coincidan con la búsqueda." : "Seleccioná una venta para ver sus liquidaciones"}
                  </p>
                ) : (
                  <table className="min-w-full text-base">
                    <thead className={`bg-white sticky top-0 z-10 border-b border-gray-200/60 ${liqScrolled ? 'shadow-sm' : ''}`}>
                      <tr className="h-12">
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">COE</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">KG</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">Precio/Kg</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">Archivo</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {liqSinVentaFiltradasGlobal.map((l) => (
                        <tr
                          key={l.id}
                          className={`h-12 cursor-grab hover:bg-gray-100 even:bg-gray-50 ${selectedLiq?.id === l.id ? 'bg-green-50' : ''}`}
                          draggable
                          onDragStart={onDragLiquidacion(l.id)}
                          title="Arrastrá esta liquidación a una venta de la tabla de la izquierda"
                        >
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap">{l.coe || '—'}</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap text-left">{formatNumber(Number(l.cantidad_kg) || 0)} KG</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap text-left">{formatPrice(Number(l.precio_kg))}</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap">
                            {(l.archivo_nombre || l.archivo_url) ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleViewPdfSelected(l); }}
                                className="p-0 leading-none text-emerald-700 hover:underline"
                                title={l.archivo_nombre || "Ver liquidación (PDF)"}
                                aria-label={l.archivo_nombre ? `Abrir PDF: ${l.archivo_nombre}` : "Abrir PDF de la liquidación"}
                              >
                                {l.archivo_nombre || (l.archivo_url ? l.archivo_url.split('/').pop() : 'Ver PDF')}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div
                className="overflow-x-auto max-h-[60vh]"
                ref={liqScrollRef}
                onScroll={(e) => setLiqScrolled(e.currentTarget.scrollTop > 0)}
              >
                {liqDeVenta.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="mb-3">Sin liquidaciones vinculadas.</p>
                    <button
                      type="button"
                      onClick={() => liqPickerRef.current && liqPickerRef.current.click()}
                      className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Cargar liquidación
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full text-base">
                    <thead className={`bg-white sticky top-0 z-10 border-b border-gray-200/60 ${liqScrolled ? 'shadow-sm' : ''}`}>
                      <tr className="h-12">
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">COE</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">KG</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">Precio/Kg</th>
                        <th className="px-4 py-2.5 text-xs uppercase tracking-wide text-gray-600 text-left">Archivo</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {liqDeVenta.map((l) => (
                        <tr
                          key={l.id}
                          className={`h-12 cursor-pointer hover:bg-gray-100 even:bg-gray-50 ${selectedLiq?.id === l.id ? 'bg-green-50' : ''}`}
                          onClick={() => {
                            setSelectedLiq(l);
                          }}
                          title={l.archivo_nombre || "Seleccionar liquidación"}
                        >
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap">{l.coe || "—"}</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap text-left">{formatNumber(Number(l.cantidad_kg) || 0)} KG</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap text-left">{formatPrice(Number(l.precio_kg))}</td>
                          <td className="px-4 py-2.5 h-12 align-middle whitespace-nowrap">
                            {(l.archivo_nombre || l.archivo_url) ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleViewPdfSelected(l); }}
                                className="p-0 leading-none text-emerald-700 hover:underline"
                                title={l.archivo_nombre || "Ver liquidación (PDF)"}
                                aria-label={l.archivo_nombre ? `Abrir PDF: ${l.archivo_nombre}` : "Abrir PDF de la liquidación"}
                              >
                                {l.archivo_nombre || (l.archivo_url ? l.archivo_url.split('/').pop() : 'Ver PDF')}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals and inputs: keep logic, but not rendered in a right panel */}
      <EditVentaModal
        open={editVentaOpen}
        onClose={() => setEditVentaOpen(false)}
        initialData={editingData}
        acopios={acopios}
        cultivos={defaultCultivos}
        onSubmit={async (payload) => {
          try {
            const { id, ...rest } = payload;
            const { data, error } = await supabase
              .from("ventas")
              .update(rest)
              .eq("id", editingId)
              .select("*");
            if (error) throw error;
            setVentasTable((v) => v.map((r) => (r.id === editingId ? data[0] : r)));
            setEditingData(data[0]);
            setEditVentaOpen(false);
            setEditingMode(false);
          } catch (err) {
            alert(err.message || String(err));
          }
        }}
      />

      {/* input oculto que dispara el file picker y abre el modal al elegir */}
      <input
        ref={liqPickerRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setLiqInitialFile(f);
          setEditLiqData(null);
          setLiquidacionOpen(true);
          // limpiar el input para permitir re-seleccionar el mismo archivo luego
          try { e.target.value = ""; } catch {}
        }}
      />

      <NewVentaModal
        open={showNew}
        onClose={() => setShowNew(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={submitNew}
        acopios={acopios}
        cultivos={defaultCultivos}
      />

      <FilterVentasModal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        acopios={acopios}
        cosechas={cosechas}
        cultivos={defaultCultivos}
      />

      <LiquidacionesReaderModal
        open={liquidacionOpen}
        onClose={() => {
          setLiquidacionOpen(false);
          setLiqInitialFile(null);
          setEditLiqData(null);
        }}
        initialFile={liqInitialFile}
        data={editLiqData || {}}
        acopios={acopios}
        cultivos={defaultCultivos}
        onParsed={(row) => setLiquidacionesLocal((prev) => [row, ...prev])}
        onSaved={(row) => {
          // Normalizar para lista local de últimas
          const normalized = {
            ...row,
            kg: row.cantidad_kg ?? row.kg,
            precio: row.precio_kg ?? row.precio,
            archivoNombre: row.archivo_nombre ?? row.archivoNombre,
            archivoUrl: row.archivo_url ?? row.archivoUrl,
          };

          // Actualizar/insertar en la bandeja de recientes
          setLiquidacionesLocal((prev) => {
            const idx = prev.findIndex((x) => x.id === normalized.id);
            if (idx === -1) return [normalized, ...prev]; // insert nuevo
            const copy = [...prev];
            copy[idx] = normalized; // update existente
            return copy;
          });

          // Actualizar acumulado de kg por venta (manejar edición vs inserción y posible cambio de venta)
          {
            const newKg = Number(row.cantidad_kg) || 0;
            const prevKg = Number(editLiqData?.cantidad_kg) || 0;
            const prevVentaId = editLiqData?.venta_id || null;
            const newVentaId = row.venta_id || null;

            if (prevVentaId && newVentaId && prevVentaId !== newVentaId) {
              // Se cambió de venta: restar de la anterior y sumar a la nueva
              setLiqSumByVenta((prev) => ({
                ...prev,
                [prevVentaId]: Math.max(0, (prev[prevVentaId] || 0) - prevKg),
                [newVentaId]: (prev[newVentaId] || 0) + newKg,
              }));
            } else if (newVentaId) {
              // Misma venta: usar delta si fue edición; si fue alta, delta == newKg
              const delta = editLiqData && editLiqData.id === row.id ? (newKg - prevKg) : newKg;
              setLiqSumByVenta((prev) => ({
                ...prev,
                [newVentaId]: Math.max(0, (prev[newVentaId] || 0) + delta),
              }));
            }
          }

          // Si la venta seleccionada es la misma, sincronizar la tabla derecha
          if (editingId && row.venta_id === editingId) {
            setLiqDeVenta((prev) => {
              const idx = prev.findIndex((x) => x.id === row.id);
              const mapped = {
                id: row.id,
                fecha: row.fecha,
                grano: row.grano,
                cantidad_kg: row.cantidad_kg,
                precio_kg: row.precio_kg,
                archivo_url: row.archivo_url ?? row.archivoUrl,
                archivo_nombre: row.archivo_nombre ?? row.archivoNombre,
              };
              if (idx === -1) return [mapped, ...prev]; // insert si no estaba
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...mapped }; // update si ya estaba
              return copy;
            });
            setSelectedLiq(row);
          }
        }}
      />

      </div>
    </div>
  );
}
export default function VentasPageProtected() {
  return (
    <ProtectedRoute>
      <VentasPage />
    </ProtectedRoute>
  );
}