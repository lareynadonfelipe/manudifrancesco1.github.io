// src/features/invoices/api/mockApi.js
import { computeState, inRangeISO, todayISO, addDaysISO } from "../utiles/dateMoney";

// ------- Semillas -------
let ID = 1000;
const genId = () => String(ID++);

const SEED = [
  {
    id: "inv-1",
    numero: "A-0001-00001234",
    proveedor: "Proveedor Norte SA",
    emisionFecha: "2025-09-15",
    vencimientoFecha: "2025-10-10",
    moneda: "ARS",
    total: 125000,
    saldo: 125000,
    tags: ["insumos", "agro"],
    notas: "",
    facturaUrl: null,
    comprobantes: [],
    timeline: [{ ts: "2025-09-15", tipo: "CREADA", descripcion: "Cargada por usuario" }],
  },
  {
    id: "inv-2",
    numero: "B-0003-00000456",
    proveedor: "Laboratorio Pampeano",
    emisionFecha: "2025-09-01",
    vencimientoFecha: "2025-09-25",
    moneda: "ARS",
    total: 80000,
    saldo: 20000,
    tags: ["salud"],
    notas: "Pago parcial 60k el 2025-09-10",
    facturaUrl: null,
    comprobantes: [
      { id: "cmp-1", fecha: "2025-09-10", monto: 60000, metodo: "transferencia", referencia: "TRX-123", archivoUrl: null },
    ],
    timeline: [
      { ts: "2025-09-01", tipo: "CREADA", descripcion: "Cargada por usuario" },
      { ts: "2025-09-10", tipo: "PAGO", descripcion: "Pago parcial 60.000 ARS" },
    ],
  },
  {
    id: "inv-3",
    numero: "C-0002-00000777",
    proveedor: "Servicios Rurales SRL",
    emisionFecha: "2025-08-10",
    vencimientoFecha: "2025-09-10",
    moneda: "ARS",
    total: 50000,
    saldo: 0,
    tags: [],
    notas: "",
    facturaUrl: null,
    comprobantes: [
      { id: "cmp-2", fecha: "2025-09-08", monto: 50000, metodo: "cheque", referencia: "CH-889", archivoUrl: null },
    ],
    timeline: [
      { ts: "2025-08-10", tipo: "CREADA", descripcion: "Cargada por usuario" },
      { ts: "2025-09-08", tipo: "PAGO", descripcion: "Pago total 50.000 ARS" },
    ],
  },
];

SEED.forEach((inv) => (inv.estado = computeState(inv)));
let _invoices = [...SEED];

// ------- Util -------
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ------- API Mock -------

/**
 * Lista con filtros y paginación básica.
 * params: { estado, q, proveedor, moneda, emisionDesde, emisionHasta, vencDesde, vencHasta, montoMin, montoMax, tags, page, pageSize, sort }
 */
export async function listInvoices(params = {}) {
  await delay(200);
  const {
    estado,
    q,
    proveedor,
    moneda,
    emisionDesde,
    emisionHasta,
    vencDesde,
    vencHasta,
    montoMin,
    montoMax,
    tags,
    page = 1,
    pageSize = 10,
    sort = "vencimientoFecha:asc",
  } = params;

  let rows = _invoices.slice();

  if (estado && estado !== "TODAS") rows = rows.filter((r) => r.estado === estado);
  if (q) {
    const v = q.toLowerCase();
    rows = rows.filter((r) => r.numero.toLowerCase().includes(v) || r.proveedor.toLowerCase().includes(v));
  }
  if (proveedor) rows = rows.filter((r) => r.proveedor.toLowerCase().includes(proveedor.toLowerCase()));
  if (moneda) rows = rows.filter((r) => r.moneda === moneda);
  if (emisionDesde || emisionHasta) rows = rows.filter((r) => inRangeISO(r.emisionFecha, emisionDesde, emisionHasta));
  if (vencDesde || vencHasta) rows = rows.filter((r) => inRangeISO(r.vencimientoFecha, vencDesde, vencHasta));
  if (montoMin) rows = rows.filter((r) => r.total >= Number(montoMin));
  if (montoMax) rows = rows.filter((r) => r.total <= Number(montoMax));
  if (tags && tags.length) rows = rows.filter((r) => (r.tags || []).some((t) => tags.includes(t)));

  // sort
  if (sort) {
    const [field, dir] = sort.split(":");
    rows.sort((a, b) => {
      const aa = a[field];
      const bb = b[field];
      if (aa < bb) return dir === "asc" ? -1 : 1;
      if (aa > bb) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);

  return { data, page, pageSize, total };
}

export async function getInvoice(id) {
  await delay(150);
  const inv = _invoices.find((x) => x.id === id);
  if (!inv) throw new Error("No encontrada");
  return inv;
}

/**
 * Registra un pago y retorna la invoice actualizada.
 * payload: { fechaPago, monto, metodo, referencia, notas, file, moneda }
 */
export async function registerPayment(id, payload) {
  await delay(350);
  const idx = _invoices.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error("Factura no encontrada");

  const inv = _invoices[idx];
  const monto = Number(payload.monto);
  if (!(monto > 0) || monto > inv.saldo) throw new Error("Monto inválido");

  // (mock) “subida” de archivo: si viene file, simulamos una URL
  let archivoUrl = null;
  if (payload.file) {
    archivoUrl = `/mock/comprobantes/${genId()}-${sanitize(payload.file.name || "comprobante")}`;
  }

  const comp = {
    id: genId(),
    fecha: payload.fechaPago,
    monto,
    metodo: payload.metodo || "transferencia",
    referencia: payload.referencia || null,
    archivoUrl,
  };

  const nuevoSaldo = Math.max(0, Number(inv.saldo) - monto);

  const updated = {
    ...inv,
    saldo: nuevoSaldo,
    estado: computeState({ ...inv, saldo: nuevoSaldo }),
    comprobantes: [...inv.comprobantes, comp],
    timeline: [
      ...inv.timeline,
      { ts: payload.fechaPago, tipo: "PAGO", descripcion: `Pago ${monto} ${inv.moneda}` },
    ],
  };

  _invoices[idx] = updated;
  return updated;
}

// ------- Helpers -------
function sanitize(name) {
  return String(name).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
}