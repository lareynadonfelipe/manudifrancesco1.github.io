// src/features/invoices/utils/dateMoney.js

// ISO yyyy-mm-dd de hoy (00:00)
export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Diferencia de días (fecha objetivo - hoy)
export function daysUntil(iso) {
  if (!iso) return 0;
  const a = new Date(iso).getTime();
  const b = new Date(todayISO()).getTime();
  return Math.ceil((a - b) / 86400000);
}

// Formato de dinero AR con 2 decimales
export function fmtMoney(n, c = 2) {
  const x = Number(n ?? 0);
  return x.toLocaleString("es-AR", { minimumFractionDigits: c, maximumFractionDigits: c });
}

// Chequea si iso ∈ [from, to] (inclusive). Si from/to no vienen, ignora ese extremo.
export function inRangeISO(iso, from, to) {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

// Suma días a una fecha ISO
export function addDaysISO(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Regla de estado propuesta
export function computeState(inv) {
  const saldo = Number(inv.saldo ?? 0);
  const total = Number(inv.total ?? 0);
  if (saldo === 0) return "PAGADA";
  const hoy = new Date(todayISO());
  const venc = new Date(inv.vencimientoFecha);
  const vencida = hoy > venc && saldo > 0;
  if (vencida) return "VENCIDA";
  if (saldo > 0 && saldo < total) return "PARCIAL";
  return "POR_PAGAR";
}