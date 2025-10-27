// src/pages/FacturasPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import KpiCards from "../features/invoices/components/KpiCards";
// import InvoicesFilters from "../features/invoices/components/InvoicesFilters";
import InvoicesTable from "../features/invoices/components/InvoicesTable";
import RegisterPaymentModal from "../features/invoices/components/RegisterPaymentModal";
import ComprobantesModal from "../features/invoices/components/ComprobantesModal";
import { registerPayment } from "../features/invoices/api/mockApi";
import { supabase } from "../lib/supabase";
import { inRangeISO, todayISO, addDaysISO } from "../features/invoices/utiles/dateMoney";
import { reconcileOcrDates, formatDateAR } from "../lib/ocr/dateUtils";
import OcrConfirmModal from "../lib/ocr/OcrConfirmModal";
import { runOcr } from "../lib/ocr/runOcr";

const asNumber = (v) => (v == null ? 0 : Number(v));
const todayStr = () => new Date().toISOString().slice(0, 10); // yyyy-mm-dd

// Convierte dd/mm/aaaa o dd-mm-aaaa a yyyy-mm-dd
const dmyToIso = (s) => {
  if (!s) return "";
  const [dd, mm, yyyy] = String(s).split(/[\/\-]/);
  if (!dd || !mm || !yyyy) return s;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const PAGE_SIZE = 10;

export default function FacturasPage() {
  const [loadChunk, setLoadChunk] = useState("10"); // "10" | "20" | "50" | "ALL"
  const [filters, setFilters] = useState({});
  const [estadoChip, setEstadoChip] = useState("POR_PAGAR"); // POR_PAGAR | VENCIDA | PAGADA | TODAS
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState({ column: 'vencimiento', direction: 'asc' });
  const [estadoCounts, setEstadoCounts] = useState({ TODAS: 0, POR_PAGAR: 0, VENCIDA: 0, PAGADA: 0 });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [compTarget, setCompTarget] = useState(null);
  const [compChooser, setCompChooser] = useState({ open: false, row: null });

  // Global search (desde Navbar)
  const [globalSearch, setGlobalSearch] = useState('');

  // OCR modal state
  const [ocrOpen, setOcrOpen] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");

  // OCR extracted/controlled fields
  const [fechaEmision, setFechaEmision] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [importeNetoGravado, setImporteNetoGravado] = useState("");
  const [importeTotal, setImporteTotal] = useState("");
  const [tipoFactura, setTipoFactura] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [categoria, setCategoria] = useState("");
  const [categoriasAgro] = useState(["Insumos", "Servicios", "Flete", "Alquiler", "Mantenimiento"]);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [cargandoOcr, setCargandoOcr] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  // Tamaño de página automático (filas visibles sin scroll)
  const [autoPageSize, setAutoPageSize] = useState(PAGE_SIZE);
  useEffect(() => {
    const calcAutoRows = () => {
      // Estimaciones conservadoras: alto de fila ≈ 44px; reservar cabecera/controles ≈ 360px
      const rowH = 44;
      const reserved = 360; // header, filtros, paddings, footer
      const h = window.innerHeight || 800;
      const rows = Math.max(10, Math.floor((h - reserved) / rowH));
      setAutoPageSize(rows);
    };
    calcAutoRows();
    window.addEventListener('resize', calcAutoRows);
    return () => window.removeEventListener('resize', calcAutoRows);
  }, []);

  // Filtros (modal local)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fltDraft, setFltDraft] = useState({ proveedor: "", desde: "", hasta: "", min: "", max: "" });
  const filterPopRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!filtersOpen) return;
      const el = filterPopRef.current;
      if (el && !el.contains(e.target)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [filtersOpen]);

  // Escuchar búsqueda global proveniente del Navbar
  useEffect(() => {
    const handler = (e) => {
      const q = (e.detail?.q || '').toString();
      setGlobalSearch(q);
    };
    window.addEventListener('global-search', handler);
    // inicializar con lo último tipeado si existiera
    const initial = (window.__GLOBAL_SEARCH_QUERY__ || '').toString();
    if (initial) setGlobalSearch(initial);
    return () => window.removeEventListener('global-search', handler);
  }, []);

  // --- core fetch with support for append and custom pageSize and sorting
  async function fetchList({ p = page, est = estadoChip, f = filters, append = false, pageSize = PAGE_SIZE, s = sort } = {}) {
    setLoading(true);
    try {
      const PAGE_SZ = pageSize || PAGE_SIZE;
      const from = (p - 1) * PAGE_SZ;
      const to = p * PAGE_SZ - 1;

      // Usuario actual (RLS)
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        console.warn("Sin usuario autenticado");
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Base select
      const sel = 'id, created_at, creado_por, file_path, fecha_emision, fecha_vencimiento, razon_social, cuit, numero_factura, importe_total, neto, iva, forma_pago, tipo_factura, categoria';

      let query = supabase
        .from('facturas')
        .select(sel, { count: 'exact' });

      // Filtros simples (proveedor, fechas, montos) usando tu barra de filtros si vienen definidos
      if (f?.proveedor) query = query.ilike('razon_social', `%${f.proveedor}%`);
      if (f?.desde) query = query.gte('fecha_vencimiento', f.desde);
      if (f?.hasta) query = query.lte('fecha_vencimiento', f.hasta);
      if (f?.min != null) query = query.gte('importe_total', Number(f.min));
      if (f?.max != null) query = query.lte('importe_total', Number(f.max));

      // Pre-filtrado por estado para mejorar la paginación (eliminamos huecos de páginas)
      const todayIso = todayStr();
      if (est === 'VENCIDA') {
        // Solo vencidas por fecha (luego filtramos pagadas en cliente)
        query = query.lt('fecha_vencimiento', todayIso);
      } else if (est === 'POR_PAGAR') {
        // No vencidas por fecha o sin fecha (NULL) — luego filtramos pagadas en cliente
        // Equivalente SQL: (fecha_vencimiento >= todayIso OR fecha_vencimiento IS NULL)
        query = query.or(`fecha_vencimiento.gte.${todayIso},fecha_vencimiento.is.null`);
      } else {
        // 'PAGADA' o 'TODAS' -> sin filtro de fecha aquí
      }

      // Ordenamiento dinámico por columna seleccionada
      const sortMap = {
        proveedor: 'razon_social',
        emision: 'fecha_emision',
        vencimiento: 'fecha_vencimiento',
        total: 'importe_total',
      };
      const col = sortMap[s?.column] || 'fecha_vencimiento';
      const asc = (s?.direction || 'asc') !== 'desc';
      query = query.order(col, { ascending: asc }).range(from, to);

      const { data: factRows, error, count } = await query;
      if (error) throw error;

      const ids = (factRows || []).map(r => String(r.id));

      // Comprobantes -> estado PAGADA si tiene al menos uno
      let compMap = new Map();
      if (ids.length > 0) {
        const { data: comps, error: cErr } = await supabase
          .from('comprobantes')
          .select('factura_id')
          .in('factura_id', ids);
        if (!cErr && comps) {
          comps.forEach(c => {
            const k = String(c.factura_id);
            compMap.set(k, (compMap.get(k) || 0) + 1);
          });
        }
      }

      const today = todayStr();
      const mappedAll = (factRows || []).map(f => {
        const tieneComp = (compMap.get(String(f.id)) || 0) > 0;
        const compCount = compMap.get(String(f.id)) || 0;
        let estado = 'POR_PAGAR';
        if (tieneComp) estado = 'PAGADA';
        else if (f.fecha_vencimiento && String(f.fecha_vencimiento) < today) estado = 'VENCIDA';

        return {
          id: f.id,
          // columnas tabla
          tipo_factura: f.tipo_factura || null,
          numero_factura: f.numero_factura || null,
          proveedor: f.razon_social || null,
          emisionFecha: f.fecha_emision || null,
          vencimientoFecha: f.fecha_vencimiento || null,
          moneda: 'ARS',
          iva: asNumber(f.iva) || 0,
          total: asNumber(f.importe_total) || 0,
          estado,
          // extras
          razon_social: f.razon_social,
          fecha_emision: f.fecha_emision,
          fecha_vencimiento: f.fecha_vencimiento,
          importe_total: f.importe_total,
          neto: f.neto,
          forma_pago: f.forma_pago,
          categoria: f.categoria,
          file_path: f.file_path,
          created_at: f.created_at,
          hasComprobante: !!tieneComp,
          compCount: compCount,
        };
      });

      // Filtrado por chip de estado desde el UI
      const mapped = mappedAll.filter(r => {
        if (est === 'TODAS') return true;
        return r.estado === est;
      });

      // Verificar existencia real del archivo de factura (solo filas de la página actual)
      const existsMap = {};
      await Promise.all(
        (mapped || []).map(async (r) => {
          try {
            const raw = r.file_path;
            if (!raw) { existsMap[r.id] = false; return; }
            let objectPath = String(raw)
              .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
              .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
              .replace(/^facturas\//i, '');
            if (objectPath.startsWith('facturas/')) objectPath = objectPath.slice('facturas/'.length);
            if (!/\.pdf(\?|$)/i.test(objectPath)) { existsMap[r.id] = false; return; }
            const { data: s, error: sErr } = await supabase.storage
              .from('facturas')
              .createSignedUrl(objectPath, 60);
            existsMap[r.id] = !!(s?.signedUrl) && !sErr;
          } catch (_) {
            existsMap[r.id] = false;
          }
        })
      );
      const mappedWithFlag = mapped.map((r) => ({ ...r, hasFactura: !!existsMap[r.id] }));
      setRows(prev => (append ? [...prev, ...mappedWithFlag] : mappedWithFlag));
      setTotal(count || mappedAll.length);
      setPage(p);
    } catch (e) {
      console.error('fetchList supabase', e);
    } finally {
      setLoading(false);
    }
  }

  // Minimal counts fetcher: calcula contadores con misma lógica de estado que la tabla (PAGADA por comprobante, VENCIDA por fecha < hoy, sino POR_PAGAR) y aplica los mismos filtros
  async function fetchCounts({ f = filters } = {}) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        setEstadoCounts({ TODAS: 0, POR_PAGAR: 0, VENCIDA: 0, PAGADA: 0 });
        return;
      }
      // Aplicar mismos filtros que fetchList
      let query = supabase
        .from('facturas')
        .select('id, fecha_vencimiento', { count: 'exact' });

      if (f?.proveedor) query = query.ilike('razon_social', `%${f.proveedor}%`);
      if (f?.desde) query = query.gte('fecha_vencimiento', f.desde);
      if (f?.hasta) query = query.lte('fecha_vencimiento', f.hasta);
      if (f?.min != null && f.min !== "") query = query.gte('importe_total', Number(f.min));
      if (f?.max != null && f.max !== "") query = query.lte('importe_total', Number(f.max));

      const { data: factRows, error } = await query;
      if (error) throw error;
      const ids = (factRows || []).map(r => String(r.id));

      // Mapear comprobantes para determinar PAGADA
      let setPaid = new Set();
      if (ids.length > 0) {
        const { data: comps, error: cErr } = await supabase
          .from('comprobantes')
          .select('factura_id')
          .in('factura_id', ids);
        if (cErr) throw cErr;
        setPaid = new Set((comps || []).map(c => String(c.factura_id)));
      }

      const today = todayStr();
      let cntTodas = 0, cntPorPagar = 0, cntVencida = 0, cntPagada = 0;

      (factRows || []).forEach(fx => {
        cntTodas += 1;
        const idStr = String(fx.id);
        const tieneComp = setPaid.has(idStr);
        if (tieneComp) {
          cntPagada += 1;
        } else if (fx.fecha_vencimiento && String(fx.fecha_vencimiento) < today) {
          cntVencida += 1;
        } else {
          cntPorPagar += 1;
        }
      });

      setEstadoCounts({
        TODAS: cntTodas,
        POR_PAGAR: cntPorPagar,
        VENCIDA: cntVencida,
        PAGADA: cntPagada,
      });
    } catch (err) {
      console.error('fetchCounts error', err);
    }
  }

  // cargar primera página cuando cambian estado o filtros
  useEffect(() => {
    setPage(1);
    fetchList({ p: 1, append: false, s: sort, est: estadoChip });
    fetchCounts({ f: filters });
  }, [estadoChip, JSON.stringify(filters)]);

  // Mount effect to compute counts initially
  useEffect(() => { fetchCounts({ f: filters }); }, []);

  useEffect(() => {
    if (filtersOpen) {
      setFltDraft({
        proveedor: filters.proveedor || "",
        desde: filters.desde || "",
        hasta: filters.hasta || "",
        min: filters.min ?? "",
        max: filters.max ?? "",
      });
    }
  }, [filtersOpen]);

  // Abre la factura en una nueva pestaña (no usa modal ni drawer)
  async function openDetail(inv) {
    try {
      const id = inv?.id || selected?.id;
      if (!id) return;

      // Traer solo lo necesario para obtener la URL firmada
      const { data: fact, error } = await supabase
        .from('facturas')
        .select('id, file_path')
        .eq('id', id)
        .single();
      if (error) throw error;

      if (!fact?.file_path) {
        alert('Esta factura no tiene archivo adjunto.');
        return;
      }

      // Normalizar path y generar URL firmada (bucket privado "facturas")
      let objectPath = String(fact.file_path)
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^facturas\//i, '');
      if (objectPath.startsWith('facturas/')) objectPath = objectPath.slice('facturas/'.length);

      const { data: s, error: sErr } = await supabase.storage
        .from('facturas')
        .createSignedUrl(objectPath, 3600);
      if (sErr) throw sErr;

      const url = s?.signedUrl;
      if (!url) {
        alert('No se pudo generar el acceso al archivo.');
        return;
      }

      // Abrir en nueva pestaña y fin
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('openDetail error', err);
      alert('No se pudo abrir la factura. Probá nuevamente.');
    }
  }

  async function openEdit(inv) {
    const f = inv || selected;
    if (!f) return;
    // Precargar campos del modal con la factura existente
    setFechaEmision(f.emisionFecha ? formatDateAR(f.emisionFecha) : "");
    setRazonSocial(f.razon_social || f.proveedor || "");
    setCuit(f.cuit || "");
    setNumeroFactura(f.numero_factura || "");
    setImporteTotal(f.total != null ? String(f.total) : "");
    setTipoFactura(f.tipo_factura || "");
    setImporteNetoGravado(f.neto != null ? String(f.neto) : "");
    setFechaVencimiento(f.vencimientoFecha ? formatDateAR(f.vencimientoFecha) : "");
    setFormaPago(f.forma_pago || "");
    setCategoria(f.categoria || "");
    // Modo edición (sin archivo / preview)
    setSelectedFile(null);
    setFilePreviewUrl("");
    // Intentar mostrar el archivo existente en el visor (bucket privado -> URL firmada)
    try {
      // 1) Asegurarnos de tener el file_path fresco desde la DB
      let pathFromRow = f.file_path || null;
      if (!pathFromRow && f.id) {
        const { data: factDb, error: factErr } = await supabase
          .from('facturas')
          .select('file_path')
          .eq('id', f.id)
          .single();
        if (!factErr) pathFromRow = factDb?.file_path || null;
      }

      if (pathFromRow) {
        const raw = String(pathFromRow);
        // Normalizar a la ruta del objeto dentro del bucket (sin el prefijo del bucket ni la URL pública)
        // Casos soportados:
        // 1) "facturas/carpeta/archivo.pdf"
        // 2) "/storage/v1/object/public/facturas/carpeta/archivo.pdf"
        // 3) URL completa con ".../storage/v1/object/.../facturas/..."
        let objectPath = raw
          .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
          .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
          .replace(/^facturas\//i, '');
        if (objectPath.startsWith('facturas/')) {
          objectPath = objectPath.slice('facturas/'.length);
        }
        const { data, error } = await supabase.storage
          .from('facturas')
          .createSignedUrl(objectPath, 3600); // 1 hora
        if (error) throw error;
        if (data?.signedUrl) setFilePreviewUrl(data.signedUrl);
      } else {
        // Si no hay archivo asociado, nos aseguramos de limpiar preview
        setFilePreviewUrl('');
      }
    } catch (err) {
      console.error('Error generando URL firmada para preview (editar):', err);
      // No bloqueamos la edición por un error de preview
      setFilePreviewUrl('');
    }
    setIsEdit(true);
    setOcrOpen(true);
  }

  // --- Toolbar actions (visibilidad dinámica según selección) ---
  function handleCancelSelection() {
    setSelected(null);
  }
  async function handleEditSelected() {
    if (!selected?.id) return;
    await openEdit(selected);
  }
  async function handleDeleteSelected() {
    if (!selected?.id) return;
    const ok = window.confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.");
    if (!ok) return;
    try {
      const { error } = await supabase.from('facturas').delete().eq('id', selected.id);
      if (error) throw error;
      setSelected(null);
      await fetchList({ p: 1, append: false, s: sort, est: estadoChip });
      await fetchCounts({ f: filters });
    } catch (e) {
      console.error("No se pudo eliminar la factura:", e);
      alert("No se pudo eliminar la factura.");
    }
  }

  // --- Comprobante handlers (moved from fetchList scope) ---
  function handleAttachFactura(row) {
    setSelected(row);
    setIsEdit(true);
    const inp = document.getElementById('factura-file-input');
    if (inp) inp.click();
  }

  function handleAttachComprobante(row) {
    setCompTarget(row);
    const inp = document.getElementById('comprobante-file-input');
    if (inp) inp.click();
  }

  async function handleComprobantePicked(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !compTarget?.id) return;
    try {
      setUploading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Sin usuario');

      const path = `${user.id}/${compTarget.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const file_path = `comprobantes/${path}`;
      const { error: insErr } = await supabase.from('comprobantes').insert({ factura_id: compTarget.id, file_path });
      if (insErr) throw insErr;

      setCompTarget(null);
      await fetchList({ p: 1, append: false, s: sort, est: estadoChip });
      await fetchCounts({ f: filters });
    } catch (err) {
      console.error('Adjuntar comprobante', err);
      alert('No se pudo adjuntar el comprobante.');
    } finally {
      setUploading(false);
    }
  }

  async function openComprobante(row) {
    try {
      const fid = row?.id;
      if (!fid) return;
      const { data: comp, error } = await supabase
        .from('comprobantes')
        .select('id, file_path, created_at')
        .eq('factura_id', fid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!comp?.file_path) {
        alert('No encontramos comprobante para esta factura.');
        return;
      }
      let objectPath = String(comp.file_path)
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^comprobantes\//i, '');
      if (objectPath.startsWith('comprobantes/')) objectPath = objectPath.slice('comprobantes/'.length);
      const { data: s, error: sErr } = await supabase.storage.from('comprobantes').createSignedUrl(objectPath, 3600);
      if (sErr) throw sErr;
      if (s?.signedUrl) window.open(s.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('openComprobante', err);
      alert('No se pudo abrir el comprobante.');
    }
  }

  async function handlePaySubmit(payload) {
    if (!selected) return;
    const updated = await registerPayment(selected.id, payload);
    setSelected(updated);
    setPayOpen(false);
    await fetchList({ p: 1, append: false, s: sort, est: estadoChip }); // refrescamos primer página
    await fetchCounts({ f: filters });
  }

  function handleFileSelected(file) {
    setSelectedFile(file);
  }

  async function handleProcess(file) {
    const f = file || selectedFile;
    if (!f) return;
    setUploading(true);
    setFormErrors({});
    try {
      // Generar preview del archivo
      const url = URL.createObjectURL(f);
      setFilePreviewUrl(url);

      // Ejecutar OCR y obtener datos estructurados (como en OcrFacturaPage)
      setCargandoOcr(true);
      const ocrData = await runOcr(f);
      if (!ocrData) throw new Error("OCR sin datos");

      // Reconciliar fechas y formatear para el UI (dd/mm/aaaa)
      const { emision: emisionISO, venc: vencISO } = reconcileOcrDates(
        ocrData.fecha_emision,
        ocrData.fecha_vencimiento
      );

      // Prellenar campos del modal
      setFechaEmision(emisionISO ? formatDateAR(emisionISO) : (ocrData.fecha_emision || ""));
      setRazonSocial(ocrData.razon_social || "");
      setCuit(ocrData.cuit || "");
      setNumeroFactura(ocrData.numero_factura || "");
      setImporteTotal(
        ocrData.importe_total != null ? String(ocrData.importe_total) : ""
      );
      setTipoFactura(ocrData.tipo_factura || "");
      setImporteNetoGravado(
        ocrData.neto != null ? String(ocrData.neto) : ""
      );
      setFechaVencimiento(
        vencISO ? formatDateAR(vencISO) : (ocrData.fecha_vencimiento || "")
      );
      setFormaPago(ocrData.forma_pago || "");
      setCategoria(ocrData.categoria || "");

      // Abrir modal
      setOcrOpen(true);
    } catch (e) {
      console.error("OCR error", e);
      alert("No pudimos procesar el archivo. Probá nuevamente.");
    } finally {
      setCargandoOcr(false);
      setUploading(false);
    }
  }

  function handleOcrSubmit(e) {
    e.preventDefault?.();
    const errs = {};
    if (!numeroFactura) errs.numero_factura = "Comprobante requerido";
    if (!importeTotal) errs.importe_total = "Importe total requerido";
    if (!tipoFactura) errs.tipo_factura = "Elegí A, B o C";
    if (!fechaEmision) errs.fecha_emision = "Fecha de emisión requerida";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    (async () => {
      if (isEdit && selected?.id) {
        // Actualizar factura existente
        try {
          const payload = {
            fecha_emision: dmyToIso(fechaEmision),
            razon_social: razonSocial || null,
            cuit: cuit || null,
            numero_factura: numeroFactura || null,
            importe_total: Number(importeTotal) || 0,
            tipo_factura: tipoFactura || null,
            neto: importeNetoGravado != null && importeNetoGravado !== "" ? Number(importeNetoGravado) : null,
            fecha_vencimiento: fechaVencimiento ? dmyToIso(fechaVencimiento) : null,
            forma_pago: formaPago || null,
            categoria: categoria || null,
          };
          const { error } = await supabase.from('facturas').update(payload).eq('id', selected.id);
          if (error) throw error;
          setOcrOpen(false);
          setIsEdit(false);
     await fetchList({ p: 1, append: false, s: sort, est: estadoChip });
     await fetchCounts({ f: filters });
        } catch (err) {
          console.error('update factura', err);
          alert('No se pudo guardar la factura. Probá de nuevo.');
        }
      } else {
        // Flujo original de confirmación OCR
        setOcrOpen(false);
await fetchList({ p: 1, append: false, s: sort, est: estadoChip });
        await fetchCounts({ f: filters });
      }
    })();
  }

  // KPI sobre las filas cargadas actualmente (lo mantenemos simple por ahora)
  const metrics = useMemo(() => {
    const now = todayISO();
    let totalPorPagar30d = 0,
      vencidas = 0,
      pagadasMes = 0,
      saldoTotal = 0;

    rows.forEach((r) => {
      if (r.estado !== 'PAGADA') {
        saldoTotal += r.total || 0;
        if (r.estado === 'VENCIDA') vencidas += r.total || 0;
        if (inRangeISO(r.vencimientoFecha, now, addDaysISO(now, 30))) totalPorPagar30d += r.total || 0;
      }
      // pagadas en el mes (proxy: created_at del registro de factura en el mes actual)
      if (r.estado === 'PAGADA' && r.created_at) {
        const d = new Date(r.created_at);
        const mNow = new Date();
        if (d.getMonth() === mNow.getMonth() && d.getFullYear() === mNow.getFullYear()) {
          pagadasMes += r.total || 0;
        }
      }
    });

    return { totalPorPagar30d, vencidas, pagadasMes, saldoTotal };
  }, [rows]);

  // Filtro cliente por búsqueda global (sobre las filas actualmente cargadas)
  const filteredRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return rows;
    const match = (v) => {
      if (v == null) return false;
      const s = typeof v === 'number' ? String(v) : String(v);
      return s.toLowerCase().includes(q);
    };
    return rows.filter(r =>
      match(r.proveedor) ||
      match(r.numero_factura) ||
      match(r.tipo_factura) ||
      match(r.total) ||
      match(r.iva) ||
      match(r.categoria) ||
      match(r.forma_pago) ||
      match(r.emisionFecha) ||
      match(r.vencimientoFecha)
    );
  }, [rows, globalSearch]);

  // handlers de carga incremental
  const canLoadMore = rows.length < total;

  // --- footer summary range (X–Y de Z)
  const chunkSize = useMemo(() => (
    loadChunk === "ALL"
      ? (total || rows.length || PAGE_SIZE)
      : loadChunk === "AUTO"
      ? (autoPageSize || PAGE_SIZE)
      : (parseInt(loadChunk, 10) || PAGE_SIZE)
  ), [loadChunk, total, rows.length, autoPageSize]);

  const visibleRange = useMemo(() => {
    const start = total ? ((page - 1) * chunkSize + 1) : 0;
    const end = total ? Math.min(page * chunkSize, total) : rows.length;
    return { start, end };
  }, [page, total, rows.length, chunkSize]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchList({ p: nextPage, append: true, s: sort, est: estadoChip });
  };

  const handleLoadAll = async () => {
    // Pedimos todo desde p=1 con pageSize = total (el mock lo soporta)
    setPage(1);
    await fetchList({ p: 1, append: false, pageSize: Math.max(total, PAGE_SIZE), s: sort, est: estadoChip });
  };

  const handleLoadN = async (n) => {
    const target = Math.min(total, (rows?.length || 0) + n);
    setPage(1);
    await fetchList({ p: 1, append: false, pageSize: Math.max(target, PAGE_SIZE), s: sort, est: estadoChip });
  };

  const handlePrevN = async (n) => {
    const current = rows?.length || 0;
    const target = Math.max(PAGE_SIZE, current - n);
    setPage(1);
    await fetchList({ p: 1, append: false, pageSize: Math.max(target, PAGE_SIZE), s: sort, est: estadoChip });
  };

  // --- Comprobantes: helpers para preview y abrir por índice ---
  async function resolveCompPreviewUrl(row, idx, comp) {
    try {
      const fid = row?.id;
      if (!fid) return null;
      // Si ya viene el comp con file_path, intentamos firmar directo; sino, buscamos por índice
      let target = comp;
      if (!target) {
        const { data: comps, error } = await supabase
          .from('comprobantes')
          .select('id, file_path, created_at')
          .eq('factura_id', fid)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!Array.isArray(comps) || comps.length === 0) return null;
        target = comps[idx] || comps[0];
      }
      if (!target?.file_path) return null;
      let objectPath = String(target.file_path)
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^\/?storage\/v1\/object\/(?:sign|public)\//i, '')
        .replace(/^comprobantes\//i, '');
      if (objectPath.startsWith('comprobantes/')) objectPath = objectPath.slice('comprobantes/'.length);
      const { data: s, error: sErr } = await supabase.storage.from('comprobantes').createSignedUrl(objectPath, 3600);
      if (sErr) throw sErr;
      return s?.signedUrl || null;
    } catch (err) {
      console.error('resolveCompPreviewUrl', err);
      return null;
    }
  }

  async function handleDeleteComprobante(row, idx, comp) {
    try {
      const fid = row?.id;
      if (!fid) return;
      const ok = window.confirm('¿Eliminar este comprobante? Esta acción no se puede deshacer.');
      if (!ok) return;
      // Obtener el comprobante por índice (si no vino comp)
      let target = comp;
      if (!target) {
        const { data: comps, error } = await supabase
          .from('comprobantes')
          .select('id, created_at')
          .eq('factura_id', fid)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!Array.isArray(comps) || comps.length === 0) return;
        target = comps[idx] || comps[0];
      }
      if (!target?.id) return;
      const { error: delErr } = await supabase
        .from('comprobantes')
        .delete()
        .eq('id', target.id);
      if (delErr) throw delErr;
      // Mantener el modal abierto y refrescar su lista desde la DB (nueva referencia)
      const { data: remaining, error: rErr } = await supabase
        .from('comprobantes')
        .select('id, file_path, created_at')
        .eq('factura_id', fid)
        .order('created_at', { ascending: true });
      if (rErr) throw rErr;
      // actualizar el modal con una NUEVA referencia de row (para que re-renderice)
      setCompChooser(prev => ({
        open: true,
        row: { ...row, comprobantes: remaining || [], compCount: (remaining || []).length },
      }));
      // refrescar la tabla (contador y estado de factura)
      await fetchList({ p: 1, append: false, s: sort, est: estadoChip });
      await fetchCounts({ f: filters });
    } catch (err) {
      console.error('handleDeleteComprobante', err);
      alert('No se pudo eliminar el comprobante.');
    }
  }

  async function openComprobanteAtIndex(row, idx, comp) {
    try {
      const url = await resolveCompPreviewUrl(row, idx, comp);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else alert('No se pudo abrir el comprobante seleccionado.');
    } catch (err) {
      console.error('openComprobanteAtIndex', err);
      alert('No se pudo abrir el comprobante seleccionado.');
    }
  }

  return (
    <div className="w-full min-h-screen pb-12 px-2">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-700">Facturas</h1>
      </div>

      <div className="inline-block max-w-full">
        <KpiCards metrics={metrics} />

        <InvoicesTable
          rows={filteredRows}
          loading={loading}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          sort={sort}
          onSortChange={(col, dir) => {
            const next = {
              column: col,
              direction: dir || (sort.column === col && sort.direction === 'asc' ? 'desc' : 'asc'),
            };
            setSort(next);
            setPage(1);
            fetchList({ p: 1, append: false, s: next, est: estadoChip });
          }}
          onPageChange={(p) => {
            setPage(p);
            fetchList({ p, s: sort, est: estadoChip });
          }}
          onView={openDetail}
          onAttachFactura={handleAttachFactura}
          onAttachComprobante={handleAttachComprobante}
          onViewComprobante={openComprobante}
          selectedId={selected?.id}
          onSelect={(r) => setSelected(r)}
          onOpenComprobantes={(r) => setCompChooser({ open: true, row: r })}
          headerLeft={
            <>
              <input
                id="comprobante-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleComprobantePicked}
              />
              <select
                value={estadoChip}
                onChange={(e) => {
                  const key = e.target.value;
                  setEstadoChip(key);
                  setPage(1);
                  fetchList({ p: 1, append: false, s: sort, est: key });
                  fetchCounts({ f: filters });
                }}
                className="h-9 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm"
                aria-label="Estado de factura"
                title="Filtrar por estado"
              >
                <option value="TODAS">Todas ({estadoCounts.TODAS ?? 0})</option>
                <option value="POR_PAGAR">Por pagar ({estadoCounts.POR_PAGAR ?? 0})</option>
                <option value="VENCIDA">Vencidas ({estadoCounts.VENCIDA ?? 0})</option>
                <option value="PAGADA">Pagadas ({estadoCounts.PAGADA ?? 0})</option>
              </select>
            </>
          }
          headerRight={
            <>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm"
                  onClick={() => setFiltersOpen((s) => !s)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M3 5.25A.75.75 0 013.75 4.5h16.5a.75.75 0 01.53 1.28L15 10.56v6.69a.75.75 0 01-1.28.53l-2.5-2.5a.75.75 0 01-.22-.53v-4.19L3.22 5.78A.75.75 0 013 5.25z" />
                  </svg>
                  Filtros
                </button>
                {filtersOpen && (
                  <div
                    ref={filterPopRef}
                    className="absolute right-0 z-40 mt-2 w-[520px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-semibold">Filtros</h3>
                      <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setFiltersOpen(false)}>Cerrar</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-gray-700">Proveedor</label>
                        <input
                          type="text"
                          value={fltDraft.proveedor}
                          onChange={(e) => setFltDraft((s) => ({ ...s, proveedor: e.target.value }))}
                          className="w-full rounded border p-2"
                          placeholder="Nombre o razón social"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-700">Monto mín.</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={fltDraft.min}
                          onChange={(e) => setFltDraft((s) => ({ ...s, min: e.target.value }))}
                          className="w-full rounded border p-2"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-700">Vence desde</label>
                        <input
                          type="date"
                          value={fltDraft.desde}
                          onChange={(e) => setFltDraft((s) => ({ ...s, desde: e.target.value }))}
                          className="w-full rounded border p-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-700">Monto máx.</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={fltDraft.max}
                          onChange={(e) => setFltDraft((s) => ({ ...s, max: e.target.value }))}
                          className="w-full rounded border p-2"
                          placeholder=""
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-700">Vence hasta</label>
                        <input
                          type="date"
                          value={fltDraft.hasta}
                          onChange={(e) => setFltDraft((s) => ({ ...s, hasta: e.target.value }))}
                          className="w-full rounded border p-2"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md border text-sm"
                        onClick={() => {
                          setFltDraft({ proveedor: "", desde: "", hasta: "", min: "", max: "" });
                          setFilters({});
                        }}
                      >
                        Limpiar filtros
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
                          onClick={() => setFiltersOpen(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-md text-sm text-white bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setFilters({ ...fltDraft });
                            setFiltersOpen(false);
                          }}
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <input
                id="factura-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (f) {
                    handleFileSelected(f);
                    handleProcess(f);
                  }
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                  uploading ? "bg-emerald-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
                onClick={() => document.getElementById('factura-file-input')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>Leyendo...</span>
                  </>
                ) : (
                  "Cargar factura"
                )}
              </button>

              {selected?.id && (
                <>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
                    onClick={handleCancelSelection}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
                    onClick={handleEditSelected}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border border-red-300 text-sm text-red-600 hover:bg-red-50"
                    onClick={handleDeleteSelected}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </>
          }
          footerLeft={
            <>
              <span className="text-gray-700">Facturas a cargar</span>
              <select
                className="px-2 py-1.5 rounded-md border border-gray-300 bg-white"
                value={loadChunk}
                onChange={(e) => setLoadChunk(e.target.value)}
                disabled={loading || !canLoadMore}
              >
                <option value="AUTO">Auto</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="ALL">Todas</option>
              </select>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={async () => {
                  const chunk = loadChunk === "ALL"
                    ? total
                    : (loadChunk === "AUTO" ? autoPageSize : parseInt(loadChunk, 10));
                  if (!chunk) return;
                  if (loadChunk === "ALL") {
                    setPage(1);
                    await fetchList({ p: 1, append: false, pageSize: Math.max(total, 10), s: sort, est: estadoChip });
                    await fetchCounts({ f: filters });
                  } else {
                    setPage(1);
                    await fetchList({ p: 1, append: false, pageSize: chunk, s: sort, est: estadoChip });
                    await fetchCounts({ f: filters });
                  }
                }}
                disabled={loading || !canLoadMore}
              >
                Cargar
              </button>
            </>
          }
          onFooterNext={async () => {
            if (loadChunk === "ALL") return;
            const chunk = parseInt(loadChunk, 10) || PAGE_SIZE;
            const next = page + 1;
            if ((next - 1) * chunk >= (total || 0)) return;
            setPage(next);
            await fetchList({ p: next, append: false, pageSize: chunk, s: sort, est: estadoChip });
            await fetchCounts({ f: filters });
          }}
          onFooterPrev={async () => {
            if (loadChunk === "ALL") return;
            const chunk = parseInt(loadChunk, 10) || PAGE_SIZE;
            const prev = Math.max(1, page - 1);
            setPage(prev);
            await fetchList({ p: prev, append: false, pageSize: chunk, s: sort, est: estadoChip });
            await fetchCounts({ f: filters });
          }}
        />
      </div>

      <ComprobantesModal
        open={compChooser.open}
        row={compChooser.row}
        onClose={() => setCompChooser({ open: false, row: null })}
        onView={(idx, comp) => {
          if (!compChooser.row) return;
          openComprobanteAtIndex(compChooser.row, idx, comp);
          setCompChooser({ open: false, row: null });
        }}
        onDelete={(idx, comp) => handleDeleteComprobante(compChooser.row, idx, comp)}
        onAttach={() => compChooser.row && handleAttachComprobante(compChooser.row)}
        resolvePreviewUrl={resolveCompPreviewUrl}
      />

      <RegisterPaymentModal
        open={payOpen}
        invoice={selected}
        onClose={() => setPayOpen(false)}
        onSubmit={handlePaySubmit}
      />

      <OcrConfirmModal
        isOpen={ocrOpen}
        onClose={async () => { setOcrOpen(false); await fetchList({ p: 1, append: false, s: sort, est: estadoChip }); await fetchCounts({ f: filters }); }}
        onSubmit={handleOcrSubmit}
        cargando={cargandoOcr}
        file={selectedFile}
        filePreviewUrl={filePreviewUrl}
        facturaId={selected?.id}
        fechaEmision={fechaEmision} setFechaEmision={setFechaEmision}
        razonSocial={razonSocial} setRazonSocial={setRazonSocial}
        cuit={cuit} setCuit={setCuit}
        numeroFactura={numeroFactura} setNumeroFactura={setNumeroFactura}
        importeNetoGravado={importeNetoGravado} setImporteNetoGravado={setImporteNetoGravado}
        importeTotal={importeTotal} setImporteTotal={setImporteTotal}
        tipoFactura={tipoFactura} setTipoFactura={setTipoFactura}
        formaPago={formaPago} setFormaPago={setFormaPago}
        categoria={categoria} setCategoria={setCategoria}
        categoriasAgro={categoriasAgro}
        fechaVencimiento={fechaVencimiento} setFechaVencimiento={setFechaVencimiento}
        formErrors={formErrors}
      />
    </div>
  );
}

function labelChip(s) {
  return (
    {
      POR_PAGAR: "Por pagar",
      VENCIDA: "Vencidas",
      PAGADA: "Pagadas",
      TODAS: "Todas",
    }[s] || s
  );
}