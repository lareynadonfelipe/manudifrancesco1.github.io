// src/components/liquidaciones/LiquidacionesReaderModal.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ====== Format helpers ====== */
function toNumber(raw) {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function formatNumber(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? toNumber(n) ?? NaN : n;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("es-AR").format(num);
}
function formatCurrency(n) {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "string" ? toNumber(n) ?? NaN : n;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
function formatDate(d) {
  if (!d) return "—";
  // If it's an ISO date-only string (YYYY-MM-DD), render it directly without Date()
  if (typeof d === "string") {
    const mIso = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (mIso) {
      const [, y, mo, dd] = mIso;
      return `${dd}/${mo}/${y}`;
    }
    // If it's already in dd/mm/yyyy, return as-is
    const mLocal = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mLocal) return d;
  }
  // Fallback: try to format real Date objects or other strings
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function safePathFromFile(file) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const cleanName = (file?.name || "liquidacion.pdf").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `uploads/${ts}-${cleanName}`;
}

/* ====== PDF helpers ====== */
async function readPdfText(file) {
  // Usar entrada principal de v5 y worker mjs (evita paths que no existen)
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const url = URL.createObjectURL(file);
  try {
    // @ts-ignore
    const loadingTask = pdfjsLib.getDocument({ url });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it) => it.str).join(" ");
      fullText += "\n" + pageText;
    }
    return fullText;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseFromText(text) {
  const get = (re, idx = 1) => {
    const m = text.match(re);
    return m ? m[idx].trim() : undefined;
  };
  const getLastMoneyAfter = (re) => {
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const all = [...text.matchAll(rx)];
    if (all.length === 0) return undefined;
    const raw = all[all.length - 1][1]?.trim();
    return raw ? toNumber(raw) : undefined;
  };
  const nextAmountAfter = (labelRe, haystack, maxAhead = 200) => {
    const m = haystack.match(labelRe);
    if (!m) return undefined;
    const start = (m.index ?? 0) + m[0].length;
    const slice = haystack.slice(start, start + maxAhead);
    const mny = slice.match(/\$?\s*([\d\.,]+)/);
    return mny ? toNumber(mny[1]) : undefined;
  };
  // Busca el mayor monto en una ventana después del label (evita capturar KG)
  const lastAmountAfter = (labelRe, haystack, maxAhead = 260) => {
    const m = haystack.match(labelRe);
    if (!m) return undefined;
    const start = (m.index ?? 0) + m[0].length;
    const slice = haystack.slice(start, start + maxAhead);
    // tomar TODOS los montos que aparezcan en la ventana
    const all = [...slice.matchAll(/\$?\s*([\d\.,]+)(?!\s*Kg)/gi)].map(x => toNumber(x[1])).filter(Boolean);
    if (all.length === 0) return undefined;
    // devolver el MAYOR (suele ser el total) para evitar agarrar 50.000 (kg)
    return Math.max(...all);
  };
  // Busca la primera secuencia larga de dígitos después de un label (para Nº de Comprobante)
    const nextDigitsAfter = (labelRe, haystack, maxAhead = 600) => {
    const m = haystack.match(labelRe);
    if (!m) return undefined;
    const start = (m.index ?? 0) + m[0].length;
    const slice = haystack.slice(start, start + maxAhead);
    const it = slice.match(/\b(\d{8,20})\b/);
    return it ? it[1] : undefined; // PRIMER número largo (el más cercano al label)
  };
  const pickPreferredDate = (haystack) => {
    // 1) Fecha cercana a "Precio/TN … Fecha:"
    let m = haystack.match(/Precio\s*\/?TN[\s\S]{0,120}?Fecha\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (m) return m[1];
    // 2) Última etiqueta "Fecha: dd/mm/aaaa"
    const labeled = [...haystack.matchAll(/Fecha\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/gi)];
    if (labeled.length) return labeled[labeled.length - 1][1];
    // 3) Si no hay etiqueta, elegir la fecha más reciente del documento
    const all = [...haystack.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)];
    if (all.length) {
      const best = all
        .map(mm => {
          const [d, mo, y] = mm[1].split('/');
          const t = new Date(`${y}-${mo}-${d}T00:00:00Z`).getTime();
          return { s: mm[1], t: isNaN(t) ? 0 : t };
        })
        .sort((a,b) => b.t - a.t)[0];
      return best?.s;
    }
    return undefined;
  };
  // ===== FECHA =====
  let fechaStr = pickPreferredDate(text);
  let fecha = fechaStr ? fechaStr.split('/').reverse().join('-') : undefined;
  // ===== COMPRADOR =====
  let comprador =
    get(/^(?:[A-ZÁÉÍÓÚÑ\s\.&,\-]+S\.?A\.?|[A-ZÁÉÍÓÚÑ\s\.&,\-]+COOP\.?\s*LTDA\.?)/m) ||
    get(/Comprador\s*: ?\s*([A-ZÁÉÍÓÚÑ0-9\s\.&,\-]+)/i) ||
    get(/Raz[oó]n\s+Social\s*:\s*([^\n\r]+)/i);
  if (comprador) {
    const cut = comprador.split(/\s+Domicilio\b|\s+LIQUIDACI[ÓO]N\b|\s+COMPRADOR\b|\s+VENDEDOR\b/i)[0].trim();
    comprador = cut;
  }

  // ===== COE / COMPROBANTE =====
  const coe = get(/C\.?O\.?E\.?\s*: ?\s*([0-9]+)/i);
  let comprobante =
    // 1) Texto directo tras la etiqueta
    get(/N[º°]\s*de\s*Comprobante\s*[:\-]?\s*([0-9A-Z\-\/.]+)/i) ||
    // 2) Próxima secuencia larga de dígitos después de la etiqueta
    nextDigitsAfter(/N[º°]?\s*de\s*Comprobante/i, text, 600) ||
    // 3) Patrones típicos que empiezan con 33...
    get(/\b(33\d{8,12})\b/) ||
    // 4) Fallback: luego de "Peso Kg" suele venir el número de comprobante antes del grado (ventana amplia)
    nextDigitsAfter(/Peso\s*Kg/i, text, 800);

  // Si coincide con el COE o no se encontró, reintentar cerca de "Peso Kg" y elegir distinto al COE
  if (!comprobante || (coe && comprobante === coe)) {
    const fromPeso = nextDigitsAfter(/Peso\s*Kg/i, text, 800);
    if (fromPeso && fromPeso !== coe) {
      comprobante = fromPeso;
    } else {
      // barrido de todos los números que empiezan con 33 y no sean el COE
      const all33 = [...text.matchAll(/\b(33\d{8,12})\b/g)].map(m => m[1]);
      const candidate = all33.find(n => n !== coe);
      if (candidate) comprobante = candidate;
    }
  }

  // Fallback final: elegir el número largo más plausible distinto del COE
  if (!comprobante) {
    // Preferir números que empiecen con 33 (comprobantes comunes) y tengan 11–13 dígitos
    const prefer33 = [...text.matchAll(/\b(33\d{9,13})\b/g)]
      .map(m => m[1])
      .filter(n => n !== coe);
    if (prefer33.length > 0) {
      // tomar el más largo; si hay empate, el primero
      prefer33.sort((a, b) => b.length - a.length);
      comprobante = prefer33[0];
    } else {
      // Como último recurso, cualquier secuencia larga (>=10) distinta del COE
      const longNums = [...text.matchAll(/\b(\d{10,20})\b/g)]
        .map(m => m[1])
        .filter(n => n !== coe);
      if (longNums.length > 0) {
        longNums.sort((a, b) => b.length - a.length);
        comprobante = longNums[0];
      }
    }
  }

  // Normalizar/seleccionar Nº de Comprobante con prioridad por cercanía y patrón
  const pickComprobante = () => {
    // Candidatos por cercanía a etiquetas
    const fromLabel = nextDigitsAfter(/N[º°]?\s*de\s*Comprobante/i, text, 200);
    const fromPeso  = nextDigitsAfter(/Peso\s*Kg/i, text, 400);

    // Candidatos globales
    const all33 = [...text.matchAll(/\b(33\d{9,13})\b/g)].map(m => m[1]);
    const longNums = [...text.matchAll(/\b(\d{10,20})\b/g)].map(m => m[1]);

    const notCoe = (n) => n && (!coe || n !== coe);
    const preferLen = (n) => (n && n.length >= 11 && n.length <= 13);

    // 1) Prioridad: etiqueta directa
    if (notCoe(fromLabel) && preferLen(fromLabel)) return fromLabel;
    if (notCoe(fromLabel)) return fromLabel;

    // 2) Luego: después de "Peso Kg"
    if (notCoe(fromPeso) && preferLen(fromPeso)) return fromPeso;
    if (notCoe(fromPeso)) return fromPeso;

    // 3) Luego: números que empiecen con 33 (típicos de comprobantes)
    const c33 = all33.find((n) => notCoe(n) && preferLen(n)) || all33.find((n) => notCoe(n));
    if (c33) return c33;

    // 4) Último recurso: cualquier número largo distinto del COE, priorizando longitudes 11–13
    const goodLen = longNums.find((n) => notCoe(n) && preferLen(n));
    if (goodLen) return goodLen;
    const any = longNums.find((n) => notCoe(n));
    if (any) return any;

    return undefined;
  };

  // Si el comprobante no es confiable, re-seleccionarlo
  if (!comprobante || (coe && comprobante === coe) || comprobante.length < 10) {
    const picked = pickComprobante();
    if (picked) comprobante = picked;
  }
  // ===== CULTIVO =====
  let cultivo = get(/\b(Soja|Ma[ií]z|Trigo)\b/i);
  if (cultivo) {
    cultivo = cultivo.replace(/í|í/gi, "í").replace(/maíz|maiz/i, "Maíz");
    cultivo = cultivo[0].toUpperCase() + cultivo.slice(1).toLowerCase();
  }

  // ===== COSECHA =====
  let cosecha = get(/\b(\d{2}-\d{2}|Sin\s+informar)\b/i);
  if (!cosecha) {
    const cos = get(/COS\s*[:\-]?\s*(\d{4})/i);
    if (cos) cosecha = `${cos.slice(0, 2)}-${cos.slice(2)}`;
  }
  // Si no se detecta, dejar explícito "Sin informar" en lugar de guión
  if (!cosecha) cosecha = "Sin informar";

  // ===== KG / PRECIO =====
  const qp = text.match(/(\d[\d\.,]*)\s*Kg\b[^\d]*\$?\s*([\d\.,]+)/i);
  const cantidadKg = qp ? toNumber(qp[1]) : undefined;
  const precioKg   = qp ? toNumber(qp[2]) : undefined;

  // ===== BLOQUE DE TOTALES =====
  let totBlock;
  {
    const m = text.match(/IMPORTES\s+TOTALES\s+DE\s+LA\s+LIQUIDACI[ÓO]N[\s\S]*?(?=OPERACI[ÓO]N|DED|$)/i);
    totBlock = m ? m[0] : undefined;
  }

  let totalOperacion, importeNetoPagar, ivaRg4310, pagoSegunCondiciones;

  if (totBlock) {
    totalOperacion       = nextAmountAfter(/Total\s+Operaci[oó]n\s*:/i,           totBlock, 120);
    ivaRg4310            = nextAmountAfter(/IVA\s*RG\s*4310\/?2018\s*:/i,        totBlock, 120);
importeNetoPagar     = lastAmountAfter(/Importe\s+Neto\s+a\s+Pagar\s*:?/i,   totBlock, 300);    pagoSegunCondiciones = nextAmountAfter(/Pago\s+seg[uú]n\s+condiciones\s*:/i, totBlock, 120);
  }

  // Heurísticas globales si falta algo
  if (totalOperacion == null) {
    const opCIva = lastAmountAfter(/Operaci[oó]n\s*c\/?IVA/i, text, 300);
    if (opCIva) totalOperacion = opCIva;
  }
  if (ivaRg4310 == null) {
    ivaRg4310 = getLastMoneyAfter(/IVA\s*RG\s*4310\/?2018[^\d$]*\$?\s*([\d\.,]+)/i);
  }
  if (importeNetoPagar == null) {
    importeNetoPagar = getLastMoneyAfter(/Importe\s+Neto\s+a\s+Pagar[^\d$]*\$?\s*([\d\.,]+)/i);
  }
  if (pagoSegunCondiciones == null) {
    pagoSegunCondiciones = getLastMoneyAfter(/Pago\s+seg[uú]n\s+condiciones[^\d$]*\$?\s*([\d\.,]+)/i);
  }
// Fallback: si falta Importe Neto, estimarlo como Pago según condiciones + IVA
// (coincide con AGD: 17.825.664,66 + 980.628,27 = 18.806.292,93)
if (importeNetoPagar == null && pagoSegunCondiciones != null && ivaRg4310 != null) {
  importeNetoPagar = pagoSegunCondiciones + ivaRg4310;
}
  // ===== Heurísticas con SUBTOTAL estimado =====
  const subtotalEstimado = (cantidadKg && precioKg) ? (cantidadKg * precioKg) : undefined;

  // 1) Si total es sospechosamente chico vs. subtotal, corrige
  if (totalOperacion != null && subtotalEstimado != null && totalOperacion < subtotalEstimado * 0.5) {
    // Intentar tomar Operación c/IVA; si no existe, usar cálculo
    const opCIva2 = lastAmountAfter(/Operaci[oó]n\s*c\/?IVA/i, text, 300);
    if (opCIva2) totalOperacion = opCIva2;
    else totalOperacion = ivaRg4310 ? (subtotalEstimado + ivaRg4310) : (subtotalEstimado * 1.105);
  }

  // 2) Si no hay total todavía, calcularlo
  if (totalOperacion == null && subtotalEstimado != null) {
    totalOperacion = ivaRg4310 ? (subtotalEstimado + ivaRg4310) : (subtotalEstimado * 1.105);
  }

  // 3) Validar Importe Neto a Pagar: debe ser < total y razonable
  if (importeNetoPagar != null && totalOperacion != null) {
    if (importeNetoPagar > totalOperacion || importeNetoPagar < totalOperacion * 0.5) {
      importeNetoPagar = undefined; // descartar y reintentar abajo
    }
  }

  // ===== Reintento dentro del bloque si quedó alguno vacío =====
  if (totBlock) {
    if (importeNetoPagar == null) {
      const v = nextAmountAfter(/Importe\s+Neto\s+a\s+Pagar\s*:/i, totBlock, 200);
      if (v != null) importeNetoPagar = v;
    }
    if (totalOperacion == null) {
      const v = nextAmountAfter(/Total\s+Operaci[oó]n\s*:/i, totBlock, 200);
      if (v != null) totalOperacion = v;
    }
  }
  // Fallback defensivo: buscar "Total Operación" en todo el documento, ventana de 220
  if (totalOperacion == null) {
    const totWin = lastAmountAfter(/Total\s+Operaci[oó]n\s*:?/i, text, 220);
    if (totWin != null) totalOperacion = totWin;
  }

  // 4) Última salvaguarda para total usando subtotal e IVA
  if (totalOperacion != null && subtotalEstimado != null && totalOperacion < subtotalEstimado * 0.5) {
    const opCIva3 = lastAmountAfter(/Operaci[oó]n\s*c\/?IVA/i, text, 300);
    totalOperacion = opCIva3 ?? (ivaRg4310 ? (subtotalEstimado + ivaRg4310) : (subtotalEstimado * 1.105));
  }

  // === Regla simple solicitada:
  // Importe Neto a Pagar = Pago según condiciones + IVA RG 4310/2018
  if (pagoSegunCondiciones != null && ivaRg4310 != null) {
    importeNetoPagar = pagoSegunCondiciones + ivaRg4310;
  }
  const grano = cultivo;
  return {
    archivoNombre: undefined,
    fecha,
    grano,
    kg: cantidadKg,
    precio: precioKg,

    comprador,
    coe,
    comprobante,
    cultivo,
    cosecha,
    cantidadKg,
    precioKg,
    totalOperacion,
    importeNetoPagar,
    ivaRg4310,
    pagoSegunCondiciones,
  };
}

/* ====== Modal ====== */
export default function LiquidacionesReaderModal({ open, onClose, data = {}, onParsed, autoPickOnOpen = false, initialFile = null, onSaved }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);

  // Reset completo al abrir el modal (evita que queden datos del anterior)
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreviewUrl(null);
    setParsed(null);
    setEdit(null);
    setErr("");
    setZoom(1);
  }, [open]);

  // Si viene `data` (edición), precargar campos y preview
  useEffect(() => {
    if (!open) return;
    if (file) return; // si ya hay archivo elegido, no sobreescribir
    if (!data || !Object.keys(data || {}).length) return;
    const p = {
      archivoNombre: data.archivo_nombre || data.archivoNombre || null,
      archivoUrl: data.archivo_url || data.archivoUrl || null,
      fecha: data.fecha || null,
      comprador: data.razon_social || data.comprador || null,
      coe: data.coe || null,
      comprobante: data.nro_comprobante || data.comprobante || null,
      cultivo: data.grano || data.cultivo || null,
      grano: data.grano || data.cultivo || null,
      cosecha: data.cosecha || null,
      cantidadKg: data.cantidad_kg ?? data.kg ?? null,
      precioKg: data.precio_kg ?? data.precio ?? null,
      totalOperacion: data.total_operacion ?? null,
      importeNetoPagar: data.importe_neto_a_pagar ?? null,
      ivaRg4310: data.iva_rg_4310_2018 ?? null,
      pagoSegunCondiciones: data.pago_segun_condiciones ?? null,
    };
    setParsed(p);
    setEdit(p);
    if (p.archivoUrl) setPreviewUrl(p.archivoUrl);
  }, [open, data, file]);

  // Ventas con KG pendientes para asociar
  const [ventasEligibles, setVentasEligibles] = useState([]);
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState("");
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [ventasErr, setVentasErr] = useState("");

  const canvasHostRef = useRef(null);
  const previewRef = useRef(null);
  const pickerRef = useRef(null);

  // Memoized save handler (placed before any conditional returns to keep hook order stable)
  const handleSave = React.useCallback(async () => {
    if (!edit) return;
    setBusy(true);
    setErr("");

    // Validaciones mínimas de kg y precio
const normKg = edit?.cantidadKg ?? edit?.kg;
const normPrecio = edit?.precioKg ?? edit?.precio;
const kgNumTmp = typeof normKg === 'string' ? toNumber(normKg) : Number(normKg);
const precioNumTmp = typeof normPrecio === 'string' ? toNumber(normPrecio) : Number(normPrecio);
if (!kgNumTmp || !Number.isFinite(kgNumTmp) || kgNumTmp <= 0) {
  setBusy(false);
  setErr('Ingresá una cantidad (Kg) válida.');
  return;
}
if (!Number.isFinite(precioNumTmp) || precioNumTmp < 0) {
  setBusy(false);
  setErr('Ingresá un precio/kg válido.');
  return;
}

    // Actualizo UI local + callback de vista previa
    setParsed(edit);
    if (onParsed) onParsed(edit);

    // Normalizar fecha a YYYY-MM-DD (Postgres date)
    const normFecha = (() => {
      const f = edit?.fecha;
      if (!f) return null;
      if (typeof f === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(f)) return f;
        const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      }
      try {
        const d = new Date(f);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch {}
      return null;
    })();

    // Subir PDF a Storage si todavía no tiene URL y hay archivo en memoria
    let archivoUrl = edit?.archivoUrl || null;
    let archivoNombre = edit?.archivoNombre || null;
    try {
      if (!archivoUrl && file) {
        const path = safePathFromFile(file);
        const { error: upErr } = await supabase.storage
          .from("liquidaciones")
          .upload(path, file, { upsert: true, contentType: "application/pdf" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("liquidaciones").getPublicUrl(path);
        archivoUrl = pub?.publicUrl || null;
        archivoNombre = file.name || archivoNombre;
      }
    } catch (uErr) {
      console.warn("Error subiendo PDF:", uErr);
      // No bloqueamos el insert; mostramos aviso
      setErr("Tema PDF: se subió con problemas o no hay URL pública. Igual intento guardar la liquidación.");
    }

    // Sanitizar numéricos
    const n = (x) => {
      if (x === null || x === undefined || x === "") return null;
      const v = typeof x === "string" ? toNumber(x) : Number(x);
      return Number.isFinite(v) ? v : null;
    };

    // Mapear a columnas reales de liquidaciones_arca
    const row = {
      fecha: normFecha,
      coe: edit?.coe || null,
      razon_social: edit?.comprador || null,
      grano: edit?.cultivo || edit?.grano || null,
      nro_comprobante: edit?.comprobante || null,
      cantidad_kg: n(kgNumTmp),
      precio_kg: n(precioNumTmp),
      cosecha: edit?.cosecha || null,
      total_operacion: n(edit?.totalOperacion),
      total_retenciones_afip: n(null),
      importe_neto_a_pagar: n(edit?.importeNetoPagar),
      iva_rg_4310_2018: n(edit?.ivaRg4310),
      pago_segun_condiciones: n(edit?.pagoSegunCondiciones),
      venta_id: ventaSeleccionadaId ? String(ventaSeleccionadaId) : (data?.venta_id ?? null),
      archivo_url: archivoUrl || null,
      archivo_nombre: archivoNombre || null,
    };

    try {
      let saved;
      if (data && data.id) {
        // UPDATE existente
        const { data: updated, error } = await supabase
          .from('liquidaciones_arca')
          .update(row)
          .eq('id', data.id)
          .select('*')
          .single();
        if (error) throw error;
        saved = updated;
      } else {
        // INSERT nuevo
        const { data: inserted, error } = await supabase
          .from('liquidaciones_arca')
          .insert([row])
          .select('*')
          .single();
        if (error) throw error;
        saved = inserted;
      }

      setErr("");
      if (onSaved) onSaved(saved);
      if (ventaSeleccionadaId) setVentaSeleccionadaId("");
      await loadEligibleVentas?.();
      onClose?.();
    } catch (e) {
      console.error("Error insertando en liquidaciones_arca:", e);
      const msg = e?.message || e?.error_description || JSON.stringify(e);
      setErr(`No pude guardar en liquidaciones_arca. Detalle: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [edit, onParsed, onSaved, ventaSeleccionadaId, file, data]);
  // ===== Cargar ventas elegibles (con KG restantes) =====
  const loadEligibleVentas = React.useCallback(async () => {
    try {
      setLoadingVentas(true);
      setVentasErr("");

      // 1) Traer ventas base
      const { data: ventas, error: vErr } = await supabase
        .from("ventas")
        .select("id, fecha, acopio, cultivo, cosecha, kg")
        .order("fecha", { ascending: false });
      if (vErr) throw vErr;

      // 2) Traer sumatoria de KG ya asignados por venta en liquidaciones_arca
      const { data: liqs, error: lErr } = await supabase
        .from("liquidaciones_arca")
        .select("venta_id, cantidad_kg")
        .not("venta_id", "is", null);
      if (lErr) throw lErr;

      const sumByVenta = {};
      (liqs || []).forEach((l) => {
        if (!l.venta_id) return;
        const k = Number(l.cantidad_kg) || 0;
        sumByVenta[l.venta_id] = (sumByVenta[l.venta_id] || 0) + k;
      });

      const elegibles = (ventas || [])
        .map((v) => {
          const asignados = sumByVenta[v.id] || 0;
          const restantes = (Number(v.kg) || 0) - asignados;
          return { ...v, kg_asignados: asignados, kg_restantes: restantes };
        })
        .filter((v) => (v.kg_restantes || 0) > 0);

      setVentasEligibles(elegibles);
    } catch (e) {
      setVentasErr(e.message || String(e));
    } finally {
      setLoadingVentas(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadEligibleVentas();
  }, [open, loadEligibleVentas]);

  // Render PDF as canvases (clean, sin marco negro) cuando hay previewUrl o cambia el zoom
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!previewUrl || !canvasHostRef.current) return;
      const host = canvasHostRef.current;
      // limpiar canvases previos
      host.innerHTML = "";
      const parentEl = host.parentElement; // contenedor con scroll
      const availableH = Math.max(200, (parentEl ? parentEl.clientHeight - 24 : 700)); // alto útil para encajar

      const pdfjsLib = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      // @ts-ignore
      const loadingTask = pdfjsLib.getDocument({ url: previewUrl });
      const pdf = await loadingTask.promise;

      // width disponible del contenedor
      const containerWidth = host.clientWidth || 800;

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break;
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const baseScaleW = containerWidth / vp.width;
        const baseScaleH = availableH / vp.height;
        const baseScale = Math.min(baseScaleW, baseScaleH); // entra de alto y ancho
        const scale = Math.max(0.5, Math.min(3, baseScale * (zoom || 1)));
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        canvas.style.display = "block";
        canvas.style.background = "#fff"; // fondo blanco
        canvas.style.margin = "0 auto 16px auto";

        host.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();
    return () => { cancelled = true; };
  }, [previewUrl, zoom]);

  // Pinch/trackpad zoom handlers
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY / 400);
      setZoom((z) => Math.min(3, Math.max(0.5, z * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    let base = 1;
    const onGestureStart = (e) => { e.preventDefault(); base = zoom || 1; };
    const onGestureChange = (e) => { e.preventDefault(); setZoom(Math.min(3, Math.max(0.5, base * (e.scale || 1)))); };
    const onGestureEnd = (e) => { e.preventDefault(); };
    el.addEventListener('gesturestart', onGestureStart, { passive: false });
    el.addEventListener('gesturechange', onGestureChange, { passive: false });
    el.addEventListener('gestureend', onGestureEnd, { passive: false });
  // Keyboard shortcuts: ESC (close) y Ctrl/Cmd+S (save)
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      handleSave();
    }
  };
  window.addEventListener('keydown', onKey);
    return () => {
  window.removeEventListener('keydown', onKey);
  el.removeEventListener('wheel', onWheel);
  el.removeEventListener('gesturestart', onGestureStart);
  el.removeEventListener('gesturechange', onGestureChange);
  el.removeEventListener('gestureend', onGestureEnd);
};
  }, [zoom]);

  const view = useMemo(() => ({ ...data, ...parsed }), [data, parsed]);

  // Hooks must not be conditional: keep this effect before any early returns
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!open) return;
    if (initialFile && !file) {
      (async () => {
        setFile(initialFile);
        setBusy(true);
        setErr("");
        const url = URL.createObjectURL(initialFile);
        setPreviewUrl(url);
        try {
          const text = await readPdfText(initialFile);
          const p = parseFromText(text);
          p.archivoNombre = initialFile.name;
          try {
            const path = safePathFromFile(initialFile);
            const { error: upErr } = await supabase.storage
              .from("liquidaciones")
              .upload(path, initialFile, { upsert: true, contentType: "application/pdf" });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("liquidaciones").getPublicUrl(path);
              if (pub?.publicUrl) p.archivoUrl = pub.publicUrl;
            }
          } catch {}
          setParsed(p);
          setEdit(p);
        } catch (e) {
          console.error(e);
          setErr("No pude leer el PDF inicial");
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [open, initialFile]);

  useEffect(() => {
    if (!open) return;
    if (!autoPickOnOpen) return;
    if (file || previewUrl || busy) return;
    const t = setTimeout(() => {
      try { pickerRef.current?.click(); } catch {}
    }, 50);
    return () => clearTimeout(t);
  }, [open, autoPickOnOpen, file, previewUrl, busy]);

  // (Removed duplicate: if (!open) return null;)

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setBusy(true);
    setErr("");
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    try {
      const text = await readPdfText(f);
      const p = parseFromText(text);
      p.archivoNombre = f.name;
      // Subir PDF a Supabase Storage (bucket: "liquidaciones")
      try {
        const path = safePathFromFile(f);
        const { error: upErr } = await supabase.storage
          .from("liquidaciones")
          .upload(path, f, { upsert: true, contentType: "application/pdf" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("liquidaciones").getPublicUrl(path);
        if (pub?.publicUrl) {
          p.archivoUrl = pub.publicUrl;
        }
      } catch (uErr) {
        console.warn("No pude subir el PDF a Storage:", uErr?.message || uErr);
      }
      setParsed(p);
      setEdit(p);
      // if (onParsed) onParsed(p);
    } catch (error) {
      console.error(error);
      setErr("No pude leer el PDF. Probá con otro archivo o pasame el log.");
    } finally {
      setBusy(false);
    }
  };


  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-[95vw] ${previewUrl ? 'max-w-[1100px] max-h-[92vh]' : 'max-w-[560px]'} rounded-lg bg-white shadow-xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
<div className="flex items-center justify-between border-b px-5 py-4">
  <h2 className="text-lg font-semibold">Lector de Liquidación</h2>
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => { try { pickerRef.current?.click(); } catch {} }}
      className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
    >
      {previewUrl ? 'Reemplazar PDF' : 'Subir PDF'}
    </button>
  </div>
</div>

<input
  ref={pickerRef}
  type="file"
  accept="application/pdf"
  onChange={handleFileChange}
  className="hidden"
/>

        {/* Body (scrolls) */}
        <div className="flex-1 overflow-y-auto">
          {/* Contenido condicional: antes de subir -> compacto; después -> preview + formulario */}
          {!previewUrl ? (
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-md h-40 flex items-center justify-center text-gray-400 text-sm">
                Subí un PDF para continuar
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
              {/* Izquierda: PDF preview */}
              <div className="lg:col-span-6 border rounded-md overflow-hidden min-h-[82vh] flex flex-col">
                <div
                  ref={previewRef}
                  className="flex-1 overflow-auto bg-white"
                  style={{ touchAction: "none", overscrollBehavior: "contain" }}
                >
                  {previewUrl ? (
                    <div ref={canvasHostRef} className="min-w-full px-3 py-3" />
                  ) : (
                    <div className="h-[82vh] flex items-center justify-center text-gray-400">
                      Subí un PDF para previsualizar
                    </div>
                  )}
                </div>
              </div>

              {/* Derecha: Campos extraídos (editables) */}
              <form
                className="lg:col-span-6 space-y-3 max-h-[82vh] overflow-y-auto"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <EditableField label="Comprador (Razón Social)" value={edit?.comprador ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), comprador: v }))} />
                  <EditableField label="Fecha" value={formatDate(edit?.fecha)} onChange={(v) => setEdit((p) => ({ ...(p||{}), fecha: v.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1') }))} type="date" isDate />
                  <EditableField label="C.O.E." value={edit?.coe ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), coe: v }))} mono />
                  <EditableField label="Nº Comprobante" value={edit?.comprobante ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), comprobante: v }))} mono />
                  <EditableField label="Cultivo" value={edit?.cultivo ?? edit?.grano ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), cultivo: v, grano: v }))} />
                  <EditableField label="Cosecha" value={edit?.cosecha ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), cosecha: v }))} />
                  <EditableField label="Cantidad (Kg)" value={edit?.cantidadKg ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), cantidadKg: toNumber(v) }))} right />
                  <EditableField label="Precio / Kg" value={edit?.precioKg ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), precioKg: toNumber(v) }))} right />
                  <EditableField label="Total Operación" value={edit?.totalOperacion ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), totalOperacion: toNumber(v) }))} right />
                  <EditableField label="IVA RG 4310/2018" value={edit?.ivaRg4310 ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), ivaRg4310: toNumber(v) }))} right />
                  <EditableField label="Importe Neto a Pagar" value={edit?.importeNetoPagar ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), importeNetoPagar: toNumber(v) }))} right />
                  <EditableField label="Cobrado (IVA incluído)" value={edit?.pagoSegunCondiciones ?? ""} onChange={(v) => setEdit((p) => ({ ...(p||{}), pagoSegunCondiciones: toNumber(v) }))} right />
                </div>
                {edit?.archivoNombre && (
                  <div className="pt-1 text-xs text-gray-500">Archivo: {edit.archivoNombre}</div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Sticky footer de acciones */}
        <div className="border-t px-5 py-3 bg-white/90 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="text-xs text-gray-500 truncate mr-auto">
              {edit?.archivoNombre ? `Archivo: ${edit.archivoNombre}` : ''}
            </div>

            {/* Selector de ventas elegibles */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Asociar a venta:</span>
              <select
                value={ventaSeleccionadaId}
                onChange={(e) => setVentaSeleccionadaId(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">— Opcional —</option>
                {ventasEligibles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDate(v.fecha)} · {v.cultivo} {v.cosecha} · {v.acopio} · libres {formatNumber(v.kg_restantes)} / {formatNumber(v.kg)} kg
                  </option>
                ))}
              </select>
            </div>

            {loadingVentas && <span className="text-xs text-gray-500">Cargando ventas…</span>}
            {ventasErr && <span className="text-xs text-red-600">{ventasErr}</span>}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => onClose?.()}
                className="px-4 py-2 border rounded text-base"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded text-base"
              >
                {busy ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
            {err && (
              <div className="w-full text-sm text-red-600 mt-2">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, strong = false, mono = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={"text-sm " + (strong ? "font-semibold" : "") + (mono ? " font-mono tracking-tight" : "")}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function EditableField({ label, value, onChange, type = "text", mono = false, right = false, isDate = false }) {
  let v = value ?? "";
  if (isDate) {
    if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(v)) {
      const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) v = `${m[3]}-${m[2]}-${m[1]}`;
    }
    type = "date";
  }
  return (
    <label className="block text-sm">
      <span className="text-gray-500">{label}</span>
      <input
        type={type}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className={
          "mt-1 w-full border rounded px-3 py-2 text-sm " +
          (mono ? " font-mono tracking-tight" : "") +
          (right ? " text-right" : "")
        }
      />
    </label>
  );
}