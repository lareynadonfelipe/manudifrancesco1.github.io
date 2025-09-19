// src/pages/OcrFacturaPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';

// Toggle if ya agregaste la columna en DB
const HAS_FECHA_VENCIMIENTO = true; // ponelo en false si no corriste el SQL

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validatePickedFile(srcFile) {
  if (!srcFile) return false;
  const isPdfMime = srcFile.type === 'application/pdf' || /\.pdf$/i.test(srcFile.name || '');
  if (!isPdfMime) {
    alert('El archivo debe ser PDF.');
    return false;
  }
  if (srcFile.size > MAX_FILE_SIZE) {
    alert('El archivo es muy grande. Máximo permitido: 10 MB.');
    return false;
  }
  return true;
}

async function insertFacturaSafe(payload) {
  // intenta insertar incluyendo fecha_vencimiento si está presente;
  // si falla por columna inexistente, reintenta sin esa propiedad
  let base = supabase.from('facturas').insert([payload]).select('id').single();
  let { data, error } = await base;
  if (error && /fecha_vencimiento/i.test(error.message)) {
    const { fecha_vencimiento, ...rest } = payload;
    return await supabase.from('facturas').insert([rest]).select('id').single();
  }
  return { data, error };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ---------- Utilidades ----------
function toISODate(value) {
  if (!value) return null;
  const ddmmyyyy = value.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m}-${d}`; // yyyy-mm-dd
  }
  const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) return value;
  return null;
}

// Sanitiza nombres de archivos para usar como claves en Supabase Storage
function sanitizeFileName(name) {
  if (!name) return 'archivo';
  // Normaliza y elimina diacríticos (acentos), luego permite solo [A-Za-z0-9._-]
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '-');
}

// --------- Helper para detectar facturas vencidas ----------
function isOverdueISO(iso) {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}
// --------- Helpers de fecha y suma ----------
function isWithinNextDays(iso, days) {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return d >= today && d <= limit;
}
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

const asNumber = (v) => (v == null ? 0 : Number(v));

function formatCurrencyAR(v) {
  const n = asNumber(v);
  if (Number.isNaN(n)) return '-';
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Validadores ----------

// OCR real usando pdfjs + tesseract
async function obtenerDatosDesdeOCR(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  const imageDataURL = canvas.toDataURL();

  const { data: { text } } = await Tesseract.recognize(imageDataURL, 'spa');

  // Extracción de campos (mantenemos tus heurísticas)
  const fecha_emision = text.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)?.[1] || null;

  const razon_social_match = text.match(/Raz[oó]n Social\s*:\s*(.*?)(?:\n|Fecha de Emisión|CUIT|Domicilio Comercial|$)/);
  const razon_social = razon_social_match?.[1]?.replace(/\n/g, '').trim() || null;

  const cuit_match = text.match(/CUIT\s*:\s*(\d{11})/i);
  const cuit = cuit_match?.[1] || null;

  const numero_factura_match = text.match(/Comp\.? Nro\s*:\s*([A-Z]?-?\d{1,4}-?\d{1,8}|\d{8})/i);
  const numero_factura = numero_factura_match?.[1]?.trim() || null;

  const importe_match = text.match(/Importe Total\s*:\s*\$?\s*([\d.,]+)/i);
  const importe_total = importe_match
    ? parseFloat(importe_match[1].replace(/\.(?=\d{3})/g, '').replace(',', '.'))
    : 0;

  return {
    fecha_emision,
    razon_social,
    cuit,
    numero_factura,
    importe_total,
    raw_text: text,
  };
}

// ---------- Componente principal ----------
export default function OcrFacturaPage() {
  const [facturas, setFacturas] = useState([]);
  const [file, setFile] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Modal + campos editables
  const [showModal, setShowModal] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  // Preview en canvas (solo primera hoja) + zoom
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1.0); // 1.0 = 100%

  const [fechaEmision, setFechaEmision] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [importeTotal, setImporteTotal] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [subiendoComprobanteId, setSubiendoComprobanteId] = useState(null); // para marcar pagada
  const [tab, setTab] = useState('apagar'); // 'apagar' | 'pagadas'

  // Validación de formulario (modal)
  const [formErrors, setFormErrors] = useState({});
  const required = (v) => v != null && String(v).trim() !== '';
  const cleanAmount = (v) => {
    if (v == null) return '';
    return String(v).replace(/\s+/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  };
  const formatAmountPretty = (v) => {
    const n = Number(cleanAmount(v));
    if (Number.isNaN(n)) return '';
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const validateModal = () => {
    const errs = {};
    if (!required(razonSocial)) errs.razon_social = 'Requerido';
    if (!required(importeTotal) || Number.isNaN(Number(cleanAmount(importeTotal))) || Number(cleanAmount(importeTotal)) <= 0) {
      errs.importe_total = 'Importe inválido';
    }
    // fecha_emision opcional, pero si viene debe ser parseable por toISODate
    if (fechaEmision && !toISODate(fechaEmision)) errs.fecha_emision = 'Formato no válido (dd/mm/aaaa o yyyy-mm-dd)';
    if (fechaVencimiento && !toISODate(fechaVencimiento)) errs.fecha_vencimiento = 'Formato no válido (dd/mm/aaaa o yyyy-mm-dd)';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Filtros
  const [fProveedor, setFProveedor] = useState('');
  const [fCUIT, setFCUIT] = useState('');
  const [fVencDesde, setFVencDesde] = useState(''); // yyyy-mm-dd o dd/mm/aaaa
  const [fVencHasta, setFVencHasta] = useState('');
  const [fMinImporte, setFMinImporte] = useState('');
  const [fMaxImporte, setFMaxImporte] = useState('');

  // Resumen
  const [resumen, setResumen] = useState({
    totalAPagar: 0,
    totalVencidas: 0,
    totalPagadasMes: 0,
    proximas7: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [pagadasShowCount, setPagadasShowCount] = useState(10);

  // OCR raw text y lupa/magnifier/visor accesible
  const [ocrRawText, setOcrRawText] = useState('');
  // Lupa (magnifier) y visor accesible
  const [magnifierOn, setMagnifierOn] = useState(false);
  const [magnifierScale, setMagnifierScale] = useState(2); // 2x por defecto
  const [magnifierSize, setMagnifierSize] = useState(160); // px diámetro
  const [lensPos, setLensPos] = useState({ x: 0, y: 0, show: false });
  const [canvasDataUrl, setCanvasDataUrl] = useState('');
  const [accessibleViewer, setAccessibleViewer] = useState(false); // usar iframe nativo para zoom/copy


  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        fetchFacturas();
      } else {
        console.warn('No hay usuario autenticado');
      }
    })();
  }, []);

  const fetchFacturas = async () => {
    const { data: facturasData, error } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al leer facturas:', error);
      alert('No se pudieron cargar las facturas.');
      return;
    }

    // Recopilar los IDs de las facturas como strings
    const facturaIdList = (facturasData || []).map(f => String(f.id));

    // Traer comprobantes SOLO de estas facturas y computar agregados
    let compRows = [];
    if (facturaIdList.length > 0) {
      const { data: _compRows, error: compErr } = await supabase
        .from('comprobantes')
        .select('factura_id, created_at, file_path')
        .in('factura_id', facturaIdList);
      if (compErr) {
        console.warn('No se pudieron leer comprobantes:', compErr);
      } else {
        compRows = _compRows || [];
      }
    }

    // Mapas auxiliares
    const countMap = new Map();            // factura_id -> cantidad de comprobantes
    const latestPathMap = new Map();       // factura_id -> file_path más reciente
    const latestDateMap = new Map();       // factura_id -> created_at más reciente
    const paidByFacturaThisMonth = new Set();
    const som = startOfMonth();
    const eom = endOfMonth();

    compRows.forEach((row) => {
      const key = String(row.factura_id);
      // contador
      const prev = countMap.get(key) || 0;
      countMap.set(key, prev + 1);

      // más reciente por fecha
      const prevDate = latestDateMap.get(key);
      const curDate = row.created_at ? new Date(row.created_at).getTime() : 0;
      if (!prevDate || curDate > prevDate) {
        latestDateMap.set(key, curDate);
        latestPathMap.set(key, row.file_path || null);
      }

      // pagadas este mes
      const d = new Date(row.created_at);
      if (!Number.isNaN(d.valueOf()) && d >= som && d <= eom) {
        paidByFacturaThisMonth.add(key);
      }
    });

    const facturasConUrls = await Promise.all(
      (facturasData || []).map(async (f) => {
        const k = String(f.id);
        const hasComprobantes = (countMap.get(k) || 0) > 0;

        // firmar URL de la factura
        const { data: signedFactura } = f.file_path
          ? await supabase.storage.from('facturas').createSignedUrl(f.file_path, 60 * 60)
          : { data: null };

        // firmar URL del último comprobante (si existe)
        let latestCompUrl = null;
        const latestPath = latestPathMap.get(k) || null;
        if (latestPath) {
          const { data: signedComp } = await supabase.storage
            .from('comprobantes')
            .createSignedUrl(latestPath, 60 * 60);
          latestCompUrl = signedComp?.signedUrl || null;
        }

        return {
          ...f,
          signedUrl: signedFactura?.signedUrl || null,
          latestCompUrl,
          comprobantesCount: countMap.get(k) || 0,
          estado: hasComprobantes ? 'pagada' : 'apagar',
          _paidThisMonth: paidByFacturaThisMonth.has(k),
        };
      })
    );

    // Resumen
    const aPagar = facturasConUrls.filter(f => f.estado === 'apagar');
    const pagadas = facturasConUrls.filter(f => f.estado === 'pagada');
    const totalAPagar = aPagar.reduce((acc, f) => acc + asNumber(f.importe_total), 0);
    const totalVencidas = aPagar
      .filter(f => isOverdueISO(f.fecha_vencimiento))
      .reduce((acc, f) => acc + asNumber(f.importe_total), 0);
    const totalPagadasMes = pagadas
      .filter(f => f._paidThisMonth)
      .reduce((acc, f) => acc + asNumber(f.importe_total), 0);
    const proximas7 = aPagar
      .filter(f => isWithinNextDays(f.fecha_vencimiento, 7))
      .reduce((acc, f) => acc + asNumber(f.importe_total), 0);

    setResumen({ totalAPagar, totalVencidas, totalPagadasMes, proximas7 });
    setFacturas(facturasConUrls);
  };

  // Dispara OCR y abre modal con los campos prellenados
  const handleExtract = async (pickedFile) => {
    try {
      setCargando(true);

      const srcFile = pickedFile ?? file;
      if (!srcFile) {
        alert('Por favor, seleccioná un archivo PDF.');
        setCargando(false);
        return;
      }
      if (!validatePickedFile(srcFile)) {
        setCargando(false);
        return;
      }

      // Obtengo usuario
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        throw new Error("Usuario no autenticado.");
      }

      // OCR
      const ocrData = await obtenerDatosDesdeOCR(srcFile);
      if (!ocrData) {
        throw new Error("No se pudieron extraer datos desde OCR.");
      }

      // Prellenar campos del modal
      setFechaEmision(ocrData.fecha_emision || '');
      setRazonSocial(ocrData.razon_social || '');
      setCuit(ocrData.cuit || '');
      setNumeroFactura(ocrData.numero_factura || '');
      setImporteTotal(ocrData.importe_total ? String(ocrData.importe_total) : '');
      setOcrRawText(ocrData.raw_text || '');

      // Preview del archivo
      setFilePreviewUrl(URL.createObjectURL(srcFile));

      // Resetear zoom a 100% al abrir
      setZoom(1.0);

      // abrir modal
      setShowModal(true);
      setCargando(false);
    } catch (error) {
      console.error("Error durante la extracción:", error.message);
      alert("Ocurrió un error durante la lectura: " + error.message);
      setCargando(false);
    }
  };

  // Confirmar modal: subir archivos + guardar en DB
  const handleConfirmAndSave = async (e) => {
    e?.preventDefault?.();
    try {
      setCargando(true);
      // Validación rápida antes de guardar
      if (!validateModal()) {
        setCargando(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Usuario no autenticado.');

      if (!file) throw new Error('No hay archivo de factura para subir.');

      // Generar path estable
      const uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const cleanName = sanitizeFileName(file.name);
      const facturaPath = `${user.id}/${uid}/${cleanName}`;

      // Subir factura a bucket 'facturas'
      const { error: upErr } = await supabase.storage
        .from('facturas')
        .upload(facturaPath, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      // Comprobante (opcional) a bucket 'comprobantes'
      let comprobantePath = null;
      if (comprobanteFile) {
        const cleanComp = sanitizeFileName(comprobanteFile.name);
        comprobantePath = `${user.id}/${uid}/${cleanComp}`;
        const { error: compErr } = await supabase.storage
          .from('comprobantes')
          .upload(comprobantePath, comprobanteFile, { upsert: true, cacheControl: '3600' });
        if (compErr) throw compErr;
      }

      // Parseos de campos
      const fechaISO = toISODate(fechaEmision);
      const vencISO = toISODate(fechaVencimiento);
      const importeNum = importeTotal ? Number(cleanAmount(importeTotal)) : null;

      // Insert en tabla facturas
      const payload = {
        file_path: facturaPath, // para reconstruir signed url
        creado_por: user.id,
        fecha_emision: fechaISO,
        razon_social: razonSocial || null,
        cuit: cuit || null,
        numero_factura: numeroFactura || null,
        importe_total: importeNum,
        ...(HAS_FECHA_VENCIMIENTO && vencISO ? { fecha_vencimiento: vencISO } : {})
      };

      const { data: insertedFactura, error: insertError } = await insertFacturaSafe(payload);
      if (insertError) throw insertError;
      const facturaId = insertedFactura.id;

      if (comprobantePath) {
        const { error: compInsertErr } = await supabase
          .from('comprobantes')
          .insert([{
            factura_id: facturaId,
            file_path: comprobantePath,
            creado_por: user.id,
            nota: null
          }]);
        if (compInsertErr) throw compInsertErr;
      }

      // cerrar modal, refrescar tabla
      setShowModal(false);
      setComprobanteFile(null);
      setFile(null);
      setFilePreviewUrl('');
      setFechaVencimiento('');
      await fetchFacturas();

      alert('Factura guardada correctamente.');
    } catch (err) {
      console.error('Error al guardar:', err.message);
      alert('No se pudo guardar la factura: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  // Adjuntar comprobante para marcar pagada
  const handleMarcarPagada = async (factura, fileObj) => {
    try {
      if (!fileObj) return;
      setSubiendoComprobanteId(factura.id);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Usuario no autenticado.');
      const uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const cleanComp = sanitizeFileName(fileObj.name);
      const path = `${user.id}/${uid}/${cleanComp}`;
      const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, fileObj, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { error: compInsertErr } = await supabase.from('comprobantes').insert([{ factura_id: factura.id, file_path: path, creado_por: user.id }]);
      if (compInsertErr) throw compInsertErr;
      await fetchFacturas();
      setTab('pagadas');
    } catch (e) {
      alert('No se pudo marcar como pagada: ' + e.message);
    } finally {
      setSubiendoComprobanteId(null);
    }
  };

  // Adjuntar uno o más comprobantes desde la tabla (multi-upload)
  const handleAdjuntarComprobantes = async (factura, fileList) => {
    try {
      if (!fileList || fileList.length === 0) return;
      setSubiendoComprobanteId(factura.id);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error('Usuario no autenticado.');

      const files = Array.from(fileList);
      for (const fileObj of files) {
        const uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const cleanComp = sanitizeFileName(fileObj.name);
        const path = `${user.id}/${uid}/${cleanComp}`;
        const { error: upErr } = await supabase.storage
          .from('comprobantes')
          .upload(path, fileObj, { upsert: true, cacheControl: '3600' });
        if (upErr) throw upErr;
        const { error: compInsertErr } = await supabase
          .from('comprobantes')
          .insert([{ factura_id: factura.id, file_path: path, creado_por: user.id }]);
        if (compInsertErr) throw compInsertErr;
      }
      await fetchFacturas();
      setTab('pagadas');
    } catch (e) {
      alert('No se pudieron adjuntar comprobantes: ' + e.message);
    } finally {
      setSubiendoComprobanteId(null);
    }
  };

  // Renderiza solo la primera hoja del PDF en un <canvas>
  useEffect(() => {
    let cancelled = false;
    async function renderFirstPage() {
      try {
        if (!showModal || !file || file.type !== 'application/pdf') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);

        // Escalado: ancho del contenedor disponible
        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : 800;
        const baseViewport = page.getViewport({ scale: 1 });
        const scaleToFit = (containerWidth / baseViewport.width) * zoom;
        const viewport = page.getViewport({ scale: scaleToFit });

        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        // Save canvas image as data URL for the magnifier
        const dataUrl = canvas.toDataURL('image/png');
        setCanvasDataUrl(dataUrl);
        if (cancelled) return;
      } catch (e) {
        console.warn('No se pudo previsualizar el PDF en canvas:', e);
      }
    }
    renderFirstPage();
    // Re-render al redimensionar
    const onResize = () => renderFirstPage();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, [showModal, file, zoom]);

  return (
    <div className="p-6">

      {/* Acciones */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            id="file-input-factura"
            type="file"
            accept="application/pdf"
            onChange={async (e) => {
              const selectedFile = e.target.files?.[0] || null;
              if (!selectedFile) return;
              if (!validatePickedFile(selectedFile)) return;
              setFile(selectedFile);
              setFilePreviewUrl('');
              setCargando(true);
              // Start OCR immediately
              await handleExtract(selectedFile);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              document.getElementById('file-input-factura')?.click();
            }}
            disabled={cargando}
            className={`px-4 py-2 rounded-md shadow-sm transition text-white ${cargando ? 'bg-emerald-600 opacity-60 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            title="Seleccioná un PDF (máx 10 MB)"
          >
            {cargando ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin mr-2 h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Leyendo factura…
              </span>
            ) : (
              'Cargar factura'
            )}
          </button>
        </div>
      </div>

      {/* Drag & drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={async (e) => {
          e.preventDefault();
          const dropped = e.dataTransfer?.files?.[0];
          if (!dropped) return;
          if (!validatePickedFile(dropped)) return;
          setFile(dropped);
          setFilePreviewUrl('');
          setCargando(true);
          await handleExtract(dropped);
        }}
        className="mb-4 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 bg-white/50 hover:bg-white/70 transition"
      >
        Soltá aquí tu PDF o hacé clic en "Cargar factura".
      </div>

      {/* Modal de carga de archivo */}

      {/* Modal de confirmación/edición */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full sm:max-w-3xl md:max-w-4xl xl:max-w-6xl max-h-[85vh] overflow-auto rounded-xl bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-xl font-semibold">Confirmar datos de la factura</h2>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Archivo: <strong>{file?.name}</strong>
              </p>
            </div>

            {/* Layout responsivo: en XL vista a la izquierda y formulario a la derecha */}
            <div className="grid gap-4 xl:grid-cols-6">
              {/* Vista (col izquierda) */}
              {file && (
                <div className="xl:col-span-3">
                  <div className="rounded border p-2 mb-1">
                    <div className="mb-2" />
                    {accessibleViewer ? (
                      <div className="h-[28vh] xl:h-[36vh] bg-gray-50">
                        <iframe
                          src={filePreviewUrl}
                          title="Visor PDF"
                          className="h-full w-full"
                        />
                      </div>
                    ) : file.type === 'application/pdf' ? (
                      <div
                        className="relative h-[28vh] xl:h-[36vh] overflow-auto bg-gray-50 flex items-start justify-center"
                        onMouseMove={(e) => {
                          if (!magnifierOn) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
                          const y = e.clientY - rect.top + e.currentTarget.scrollTop;
                          setLensPos({ x, y, show: true });
                        }}
                        onMouseLeave={() => setLensPos((p) => ({ ...p, show: false }))}
                      >
                        <canvas ref={canvasRef} className="block" />
                        {magnifierOn && lensPos.show && canvasDataUrl && (
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute rounded-full ring-2 ring-black/20 shadow-lg"
                            style={{
                              width: `${magnifierSize}px`,
                              height: `${magnifierSize}px`,
                              left: `${Math.max(0, lensPos.x - magnifierSize / 2)}px`,
                              top: `${Math.max(0, lensPos.y - magnifierSize / 2)}px`,
                              backgroundImage: `url(${canvasDataUrl})`,
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: `${(() => {
                                const canvas = canvasRef.current;
                                if (!canvas) return 'auto';
                                const displayedWidth = canvas.getBoundingClientRect().width;
                                const displayedHeight = canvas.getBoundingClientRect().height;
                                return `${displayedWidth * magnifierScale}px ${displayedHeight * magnifierScale}px`;
                              })()}`,
                              backgroundPosition: `${(lensPos.x * magnifierScale - magnifierSize / 2) * -1}px ${(lensPos.y * magnifierScale - magnifierSize / 2) * -1}px`,
                              backdropFilter: 'none',
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-[28vh] xl:h-[36vh] overflow-auto bg-gray-50 flex items-start justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={filePreviewUrl} alt="preview" className="block" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    {/* (izquierda) reservado por si necesitamos algo luego */}
                    <div className="flex-1" />
                    {/* (derecha) Controles: Visor accesible | Lupa | − % + */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAccessibleViewer(v => !v)}
                        className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
                        title="Alternar visor accesible (zoom/selección nativos)"
                      >
                        {accessibleViewer ? 'Usar vista rápida' : 'Visor accesible'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMagnifierOn(v => !v)}
                        className={`text-xs rounded border px-2 py-1 hover:bg-gray-50 ${magnifierOn ? 'bg-green-600 text-white border-green-600' : ''}`}
                        title="Alternar lupa"
                      >
                        Lupa
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                        disabled={accessibleViewer}
                        className={`rounded border px-2 py-1 text-xs ${accessibleViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Alejar"
                        aria-label="Alejar"
                      >
                        −
                      </button>
                      <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}
                        disabled={accessibleViewer}
                        className={`rounded border px-2 py-1 text-xs ${accessibleViewer ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Acercar"
                        aria-label="Acercar"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Formulario (col derecha) */}
              <div className="xl:col-span-3">
                <form onSubmit={handleConfirmAndSave} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Fecha de emisión</label>
                      <input
                        type="text"
                        value={fechaEmision}
                        onChange={(e) => { setFechaEmision(e.target.value); if (formErrors.fecha_emision) setFormErrors(f => ({ ...f, fecha_emision: undefined })); }}
                        className={`w-full rounded border p-2 ${formErrors.fecha_emision ? 'border-red-400' : ''}`}
                        placeholder="dd/mm/aaaa o yyyy-mm-dd"
                      />
                      {formErrors.fecha_emision && <p className="mt-1 text-xs text-red-600">{formErrors.fecha_emision}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Fecha de vencimiento</label>
                      <input
                        type="text"
                        value={fechaVencimiento}
                        onChange={(e) => { setFechaVencimiento(e.target.value); if (formErrors.fecha_vencimiento) setFormErrors(f => ({ ...f, fecha_vencimiento: undefined })); }}
                        className={`w-full rounded border p-2 ${formErrors.fecha_vencimiento ? 'border-red-400' : ''}`}
                        placeholder="dd/mm/aaaa o yyyy-mm-dd"
                      />
                      {formErrors.fecha_vencimiento && <p className="mt-1 text-xs text-red-600">{formErrors.fecha_vencimiento}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Razón social</label>
                      <input
                        type="text"
                        value={razonSocial}
                        onChange={(e) => { setRazonSocial(e.target.value); if (formErrors.razon_social) setFormErrors(f => ({ ...f, razon_social: undefined })); }}
                        className={`w-full rounded border p-2 ${formErrors.razon_social ? 'border-red-400' : ''}`}
                        placeholder="Ej: LINZOAIN HORACIO ANTONIO"
                      />
                      {formErrors.razon_social && <p className="mt-1 text-xs text-red-600">{formErrors.razon_social}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">CUIT</label>
                      <input
                        type="text"
                        value={cuit}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9\-]/g, '');
                          setCuit(v);
                        }}
                        className="w-full rounded border p-2"
                        placeholder="Ej: 20-12345678-3"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Comprobante Nº</label>
                      <input
                        type="text"
                        value={numeroFactura}
                        onChange={(e) => setNumeroFactura(e.target.value)}
                        className="w-full rounded border p-2"
                        placeholder="Ej: A-0001-00001234"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Importe total</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={importeTotal}
                        onChange={(e) => {
                          // permitir solo dígitos, puntos de miles y coma decimal mientras escribe
                          const v = e.target.value.replace(/[^0-9.,\s]/g, '');
                          setImporteTotal(v);
                          if (formErrors.importe_total) setFormErrors(f => ({ ...f, importe_total: undefined }));
                        }}
                        onBlur={() => {
                          const pretty = formatAmountPretty(importeTotal);
                          if (pretty) setImporteTotal(pretty);
                        }}
                        className={`w-full rounded border p-2 text-right font-medium ${formErrors.importe_total ? 'border-red-400' : ''}`}
                        placeholder="Ej: 125.000,00"
                      />
                      {formErrors.importe_total && <p className="mt-1 text-xs text-red-600">{formErrors.importe_total}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Comprobante de pago (opcional)</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => setComprobanteFile(e.target.files?.[0] ?? null)}
                        className="w-full rounded border p-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Al guardar, podés <strong>adjuntar comprobante</strong> desde la lista para marcarla como pagada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="rounded border px-4 py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando}
                      className="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60"
                    >
                      {cargando ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-[11px] tracking-wide uppercase text-gray-500">Total a pagar</div>
          <div className="text-2xl font-semibold text-gray-900">$ {resumen.totalAPagar.toLocaleString('es-AR')}</div>
        </div>
        <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-[11px] tracking-wide uppercase text-gray-500">Vencidas</div>
          <div className="text-2xl font-semibold text-red-600">$ {resumen.totalVencidas.toLocaleString('es-AR')}</div>
        </div>
        <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-[11px] tracking-wide uppercase text-gray-500">Pagadas este mes</div>
          <div className="text-2xl font-semibold text-emerald-700">$ {resumen.totalPagadasMes.toLocaleString('es-AR')}</div>
        </div>
        <div className="rounded-xl border border-gray-200/60 bg-white/70 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-[11px] tracking-wide uppercase text-gray-500">Próx. 7 días</div>
          <div className="text-2xl font-semibold text-gray-900">$ {resumen.proximas7.toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* Toggle filtros */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6 mb-2">
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="Proveedor" value={fProveedor} onChange={(e)=>setFProveedor(e.target.value)} />
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="CUIT" value={fCUIT} onChange={(e)=>setFCUIT(e.target.value)} />
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="Vence desde" value={fVencDesde} onChange={(e)=>setFVencDesde(e.target.value)} />
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="Vence hasta" value={fVencHasta} onChange={(e)=>setFVencHasta(e.target.value)} />
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="Importe mín." value={fMinImporte} onChange={(e)=>setFMinImporte(e.target.value)} />
          <input className="rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400" placeholder="Importe máx." value={fMaxImporte} onChange={(e)=>setFMaxImporte(e.target.value)} />
          <div className="md:col-span-3 lg:col-span-6 flex justify-end">
            <button
              type="button"
              onClick={() => { setFProveedor(''); setFCUIT(''); setFVencDesde(''); setFVencHasta(''); setFMinImporte(''); setFMaxImporte(''); }}
              className="mt-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* Sistema de pestañas: A Pagar / Pagadas */}
      <div className="mt-6 mb-2">
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/70 shadow-sm px-2 py-1">
          <button
            className={`px-4 py-2 transition font-semibold ${
              tab === 'apagar'
                ? 'bg-green-50 text-green-700 font-semibold rounded-lg'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('apagar')}
          >
            A Pagar
          </button>
          <button
            className={`px-4 py-2 transition font-semibold ${
              tab === 'pagadas'
                ? 'bg-green-50 text-green-700 font-semibold rounded-lg'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab('pagadas')}
          >
            Pagadas
          </button>
        </div>
        <div className="rounded-xl overflow-hidden bg-white/70 shadow-sm">
          {/* Tabla de facturas según tab */}
          <FacturaTabTable
            tab={tab}
            facturas={facturas}
            fProveedor={fProveedor}
            fCUIT={fCUIT}
            fVencDesde={fVencDesde}
            fVencHasta={fVencHasta}
            fMinImporte={fMinImporte}
            fMaxImporte={fMaxImporte}
            pagadasShowCount={pagadasShowCount}
            setPagadasShowCount={setPagadasShowCount}
            onRowClick={(factura) => handleRowFacturaClick(factura)}
            expandedRowId={expandedRowId}
            formatCurrencyAR={formatCurrencyAR}
            asNumber={asNumber}
            isOverdueISO={isOverdueISO}
            isWithinNextDays={isWithinNextDays}
            subiendoComprobanteId={subiendoComprobanteId}
            handleMarcarPagada={handleMarcarPagada}
            handleAdjuntarComprobantes={handleAdjuntarComprobantes}
            fetchFacturas={fetchFacturas}
            setExpandedRowId={setExpandedRowId}
          />
        </div>
      </div>
    </div>
  );
}

// --- Componente Tabla por Tab ---
function FacturaTabTable({
  tab,
  facturas,
  fProveedor,
  fCUIT,
  fVencDesde,
  fVencHasta,
  fMinImporte,
  fMaxImporte,
  pagadasShowCount,
  setPagadasShowCount,
  onRowClick,
  expandedRowId,
  formatCurrencyAR,
  asNumber,
  isOverdueISO,
  isWithinNextDays,
  subiendoComprobanteId,
  handleMarcarPagada,
  handleAdjuntarComprobantes,
  fetchFacturas,
  setExpandedRowId,
}) {
  // Filtros comunes
  let base = facturas.filter(f => (tab === 'apagar' ? f.estado === 'apagar' : f.estado === 'pagada'));
  const desdeISO = toISODate(fVencDesde);
  const hastaISO = toISODate(fVencHasta);
  const minImp = fMinImporte ? Number(String(fMinImporte).replace(/\.(?=\d{3})/g, '').replace(',', '.')) : null;
  const maxImp = fMaxImporte ? Number(String(fMaxImporte).replace(/\.(?=\d{3})/g, '').replace(',', '.')) : null;
  base = base.filter(f => {
    if (fProveedor && !(f.razon_social || '').toLowerCase().includes(fProveedor.toLowerCase())) return false;
    if (fCUIT && !(f.cuit || '').includes(fCUIT)) return false;
    if (tab === 'apagar') {
      if (desdeISO && (!f.fecha_vencimiento || f.fecha_vencimiento < desdeISO)) return false;
      if (hastaISO && (!f.fecha_vencimiento || f.fecha_vencimiento > hastaISO)) return false;
    }
    const imp = asNumber(f.importe_total);
    if (minImp != null && !Number.isNaN(minImp) && imp < minImp) return false;
    if (maxImp != null && !Number.isNaN(maxImp) && imp > maxImp) return false;
    return true;
  });
  let rows;
  if (tab === 'apagar') {
    rows = [...base].sort((a, b) => {
      const ta = a.fecha_vencimiento ? Date.parse(a.fecha_vencimiento) : Infinity;
      const tb = b.fecha_vencimiento ? Date.parse(b.fecha_vencimiento) : Infinity;
      return ta - tb;
    });
  } else {
    const ordered = [...base].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
    rows = ordered.slice(0, pagadasShowCount);
  }
  const total = tab === 'pagadas' ? base.length : undefined;

  // Columnas: Vence, Razón Social, Comp. Nº, Importe, Estado/Pagar
  return (
    <div>
      <table className="min-w-full table-auto border-0">
        <thead>
          <tr className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 text-gray-700">Vence</th>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 text-gray-700">Razón Social</th>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 text-gray-700">Comp. Nº</th>
            <th className="px-4 py-3 text-right text-sm font-medium bg-gray-50 text-gray-700">Importe</th>
            <th className="px-4 py-3 text-left text-sm font-medium bg-gray-50 text-gray-700">
              {tab === 'apagar' ? 'Pagar' : 'Estado'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-10 text-center text-gray-500">
                {tab === 'apagar'
                  ? <>
                      No hay facturas a pagar con los filtros actuales.
                      <br />
                      <button
                        type="button"
                        onClick={() => document.getElementById('file-input-factura')?.click()}
                        className="mt-4 px-4 py-2 rounded-md bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                      >
                        Cargar factura
                      </button>
                    </>
                  : 'No hay facturas pagadas que coincidan con los filtros.'}
              </td>
            </tr>
          ) : (
            rows.map(f => (
              <tr
                key={f.id}
                className="group even:bg-gray-50 hover:bg-emerald-50 transition cursor-pointer"
                onClick={() => onRowClick(f)}
              >
                {/* Vence */}
                <td className="px-4 py-3 text-gray-900 border-0 align-middle">
                  <div className="flex items-center gap-2">
                    <span>{f.fecha_vencimiento ?? '-'}</span>
                    {tab === 'apagar' && isOverdueISO(f.fecha_vencimiento) && (
                      <span className="rounded-full bg-red-100 text-red-700 text-xs px-2 py-0.5">Vencida</span>
                    )}
                    {tab === 'apagar' && !isOverdueISO(f.fecha_vencimiento) && isWithinNextDays(f.fecha_vencimiento, 7) && (
                      <span className="rounded-full bg-amber-100 text-amber-800 text-xs px-2 py-0.5">En 7 días</span>
                    )}
                  </div>
                </td>
                {/* Razón Social */}
                <td className="px-4 py-3 font-medium text-gray-900 border-0 align-middle">{f.razon_social ?? '-'}</td>
                {/* Comp. Nº */}
                <td className="px-4 py-3 text-gray-900 border-0 align-middle">{f.numero_factura ?? '—'}</td>
                {/* Importe */}
                <td className="px-4 py-3 text-gray-900 border-0 align-middle text-right">{formatCurrencyAR(f.importe_total)}</td>
                {/* Estado o Pagar */}
                <td className="px-4 py-3 text-gray-900 border-0 align-middle">
                  {tab === 'apagar' ? (
                    <div className="inline-flex items-center gap-2">
                      <input
                        id={`comp-input-${f.id}`}
                        type="file"
                        accept=".pdf,image/*"
                        multiple
                        className="hidden"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            handleAdjuntarComprobantes(f, files);
                          }
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`comp-input-${f.id}`)?.click();
                        }}
                        className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm shadow-sm ${subiendoComprobanteId === f.id ? 'bg-emerald-600/60 text-white cursor-wait' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        disabled={subiendoComprobanteId === f.id}
                        title="Adjuntar comprobante(s)"
                      >
                        {subiendoComprobanteId === f.id ? 'Subiendo…' : 'Pagar'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs bg-green-100 text-green-800">Pagada</span>
                      {f.comprobantesCount > 0 && (
                        <div className="inline-flex items-center gap-2">
                          {f.latestCompUrl ? (
                            <a
                              href={f.latestCompUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ver comprobante
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">Sin acceso</span>
                          )}
                          {f.comprobantesCount > 1 && (
                            <span className="text-xs text-gray-500">({f.comprobantesCount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Pie de tabla para pagadas: paginación */}
      {tab === 'pagadas' && rows.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-sm text-gray-700 px-4 py-2">
          <div>
            Mostrando <strong>{rows.length}</strong> de <strong>{total}</strong> pagadas.
          </div>
          <div className="flex items-center gap-2">
            {rows.length < total && (
              <button
                type="button"
                onClick={() => setPagadasShowCount(c => c + 10)}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Ver más
              </button>
            )}
            {pagadasShowCount > 10 && (
              <button
                type="button"
                onClick={() => setPagadasShowCount(10)}
                className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
              >
                Ver menos
              </button>
            )}
          </div>
        </div>
      )}
      {/* Pie de tabla para a pagar: total */}
      {tab === 'apagar' && rows.length > 0 && (
        <div className="flex justify-end p-3 text-sm text-gray-700">
          <span className="mr-2">Total a pagar (filtrado):</span>
          <strong>{formatCurrencyAR(rows.reduce((acc, f) => acc + asNumber(f.importe_total), 0))}</strong>
        </div>
      )}
    </div>
  );
}


// --- Modal de edición de factura ---
import ReactDOM from 'react-dom';
function useFacturaModal() {
  const [modalFactura, setModalFactura] = React.useState(null);
  return [modalFactura, setModalFactura];
}

// Agregar hook para modal de edición
const [modalFactura, setModalFactura] = (() => {
  let _modalFactura = null;
  let _setModalFactura = () => {};
  function useModalFactura() {
    const [factura, setFactura] = React.useState(null);
    _modalFactura = factura;
    _setModalFactura = setFactura;
    return [factura, setFactura];
  }
  return [null, () => {}];
})();

// Handler para click en fila
function handleRowFacturaClick(factura) {
  setModalFactura(factura);
}

// Modal de edición
function FacturaEditModal({ factura, onClose, fetchFacturas, formatCurrencyAR, handleMarcarPagada }) {
  const [editFields, setEditFields] = React.useState({
    fecha_emision: factura?.fecha_emision || '',
    fecha_vencimiento: factura?.fecha_vencimiento || '',
    razon_social: factura?.razon_social || '',
    cuit: factura?.cuit || '',
    numero_factura: factura?.numero_factura || '',
    importe_total: factura?.importe_total || '',
  });
  const [cargando, setCargando] = React.useState(false);
  const [comprobanteFile, setComprobanteFile] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [comprobantes, setComprobantes] = React.useState([]);
  const [loadingComps, setLoadingComps] = React.useState(false);
  const [markingUnpaid, setMarkingUnpaid] = React.useState(false);

  React.useEffect(() => {
    if (!factura?.id) return;
    setLoadingComps(true);
    (async () => {
      const { data: compRows, error: compErr } = await supabase
        .from('comprobantes')
        .select('id, file_path, created_at')
        .eq('factura_id', factura.id)
        .order('created_at', { ascending: false });
      if (!compErr && compRows) {
        // Firmar links
        const signedComps = await Promise.all(
          compRows.map(async (c) => {
            let url = null;
            if (c.file_path) {
              const { data: signed } = await supabase.storage.from('comprobantes').createSignedUrl(c.file_path, 60 * 60);
              url = signed?.signedUrl || null;
            }
            return { ...c, signedUrl: url };
          }),
        );
        setComprobantes(signedComps);
      } else {
        setComprobantes([]);
      }
      setLoadingComps(false);
    })();
  }, [factura?.id]);

  if (!factura) return null;

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setCargando(true);
    try {
      const updates = {
        fecha_emision: editFields.fecha_emision,
        fecha_vencimiento: editFields.fecha_vencimiento,
        razon_social: editFields.razon_social,
        cuit: editFields.cuit,
        numero_factura: editFields.numero_factura,
        importe_total: Number(String(editFields.importe_total).replace(/\.(?=\d{3})/g, '').replace(',', '.')),
      };
      await supabase.from('facturas').update(updates).eq('id', factura.id);
      await fetchFacturas();
      alert('Factura actualizada');
      onClose();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
    setCargando(false);
  };

  const handleComprobanteUpload = async (e) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;
    setUploading(true);
    await handleMarcarPagada(factura, fileObj);
    await fetchFacturas();
    setUploading(false);
    e.target.value = '';
  };

  const handleMarkUnpaid = async () => {
    if (!window.confirm('¿Seguro que deseas marcar como impaga? Se eliminará el último comprobante adjunto.')) return;
    setMarkingUnpaid(true);
    // Eliminar último comprobante
    if (comprobantes.length > 0) {
      const lastComp = comprobantes[0];
      await supabase.from('comprobantes').delete().eq('id', lastComp.id);
      await fetchFacturas();
    }
    setMarkingUnpaid(false);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-3xl md:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-xl font-semibold">Editar factura</h2>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Archivo: <strong>{factura?.file_path?.split('/').pop()}</strong>
          </p>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha de emisión</label>
              <input
                type="text"
                value={editFields.fecha_emision}
                onChange={e => setEditFields(f => ({ ...f, fecha_emision: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="dd/mm/aaaa o yyyy-mm-dd"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha de vencimiento</label>
              <input
                type="text"
                value={editFields.fecha_vencimiento}
                onChange={e => setEditFields(f => ({ ...f, fecha_vencimiento: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="dd/mm/aaaa o yyyy-mm-dd"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Razón social</label>
              <input
                type="text"
                value={editFields.razon_social}
                onChange={e => setEditFields(f => ({ ...f, razon_social: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="Ej: LINZOAIN HORACIO ANTONIO"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CUIT</label>
              <input
                type="text"
                value={editFields.cuit}
                onChange={e => setEditFields(f => ({ ...f, cuit: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="Ej: 20-12345678-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Comprobante Nº</label>
              <input
                type="text"
                value={editFields.numero_factura}
                onChange={e => setEditFields(f => ({ ...f, numero_factura: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="Ej: A-0001-00001234"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Importe total</label>
              <input
                type="text"
                value={editFields.importe_total}
                onChange={e => setEditFields(f => ({ ...f, importe_total: e.target.value }))}
                className="w-full rounded border p-2"
                placeholder="Ej: 125.000,00"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {factura.signedUrl && (
              <>
                <a
                  href={factura.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Ver factura
                </a>
                <a
                  href={factura.signedUrl}
                  download
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Descargar factura
                </a>
              </>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {cargando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {factura.estado === 'apagar' && (
              <>
                <label
                  htmlFor="edit-modal-comprobante-input"
                  className={`rounded-md px-4 py-2 text-sm font-medium cursor-pointer ${
                    uploading
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {uploading ? 'Subiendo…' : 'Adjuntar comprobante'}
                </label>
                <input
                  id="edit-modal-comprobante-input"
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleComprobanteUpload}
                />
              </>
            )}
            {factura.estado === 'pagada' && (
              <button
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-medium ${markingUnpaid ? 'bg-gray-200 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                disabled={markingUnpaid}
                onClick={handleMarkUnpaid}
              >
                {markingUnpaid ? 'Procesando…' : 'Marcar como impaga'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2"
            >
              Cerrar
            </button>
          </div>
        </form>
        {/* Historial de comprobantes */}
        <div className="mt-6">
          <div className="font-semibold text-gray-700 mb-1">Historial de comprobantes</div>
          {loadingComps ? (
            <div className="text-sm text-gray-400">Cargando…</div>
          ) : comprobantes.length === 0 ? (
            <div className="text-sm text-gray-400">No hay comprobantes adjuntos.</div>
          ) : (
            <ul className="space-y-2">
              {comprobantes.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {c.signedUrl ? (
                    <a
                      href={c.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline text-sm"
                    >
                      Descargar
                    </a>
                  ) : (
                    <span className="text-xs text-red-400">Sin acceso</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Render modal de edición si corresponde
if (typeof window !== 'undefined') {
  if (modalFactura) {
    ReactDOM.render(
      <FacturaEditModal
        factura={modalFactura}
        onClose={() => setModalFactura(null)}
        fetchFacturas={fetchFacturas}
        formatCurrencyAR={formatCurrencyAR}
        handleMarcarPagada={handleMarcarPagada}
      />,
      (() => {
        let div = document.getElementById('factura-edit-modal-root');
        if (!div) {
          div = document.createElement('div');
          div.id = 'factura-edit-modal-root';
          document.body.appendChild(div);
        }
        return div;
      })()
    );
  } else {
    const div = document.getElementById('factura-edit-modal-root');
    if (div) ReactDOM.unmountComponentAtNode(div);
  }
}