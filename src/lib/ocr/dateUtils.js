// src/lib/ocr/dateUtils.js

// ------------ Helpers internos ------------
export function normalizeDigits(s) {
  return (String(s || "")).trim()
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2")
    .replace(/[·.,]/g, "/")
    .replace(/-/g, "/")
    .replace(/\s+/g, "");
}

function _clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

export function fixYear(y) {
  const CURRENT_YEAR = new Date().getFullYear();
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  if (!Number.isFinite(y)) return null;
  if (y < 100) {
    const guess = 2000 + y;
    return guess > CURRENT_YEAR + 1 ? guess - 100 : guess;
  }
  const ys = String(y);
  const candidates = new Set([y]);
  candidates.add(Number(ys.replace(/0/g, '5')));
  candidates.add(Number(ys.replace(/5/g, '0')));
  if (/\d$/.test(ys)) {
    const last = ys.slice(-1);
    if (last === '0') candidates.add(Number(ys.slice(0, -1) + '5'));
    if (last === '5') candidates.add(Number(ys.slice(0, -1) + '0'));
  }
  let best = y;
  let bestScore = 1e9;
  for (const c of candidates) {
    if (!Number.isFinite(c)) continue;
    const c2 = clamp(c, 2018, CURRENT_YEAR + 2);
    const score = Math.abs(c2 - CURRENT_YEAR);
    if (score < bestScore) { bestScore = score; best = c2; }
  }
  return best;
}

// ------------ Parseos principales ------------
export function toISODate(value) {
  if (!value) return null;
  const s = normalizeDigits(value);

  // dd/mm/yyyy o dd/mm/yy
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let d = Number(m[1]), mo = Number(m[2]), y = fixYear(Number(m[3]));
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
      return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    // swap si venía MM/DD por error y día ≤ 12
    if (d <= 12) {
      const dt2 = new Date(y, d - 1, mo);
      if (dt2.getFullYear() === y && dt2.getMonth() === d - 1 && dt2.getDate() === mo) {
        return `${y}-${String(d).padStart(2,'0')}-${String(mo).padStart(2,'0')}`;
      }
    }
  }
  // yyyy/mm/dd
  m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    let y = fixYear(Number(m[1])), mo = Number(m[2]), d = Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) {
      return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }
  // ISO ya válido
  if (/^(\d{4})-(\d{2})-(\d{2})$/.test(String(value))) return String(value);
  return null;
}

export function parseISOParts(iso) {
  if (!iso) return null;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}
export function isoFromYMD(y, mo, d) {
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
export function swap05Year(y) {
  const ys = String(y);
  return Number(ys.replace(/0/g, 'x').replace(/5/g, '0').replace(/x/g, '5'));
}
export function daysBetween(aISO, bISO) {
  if (!aISO || !bISO) return null;
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** Reconciliar Emisión/Vencimiento corrigiendo 0↔5 y orden */
export function reconcileOcrDates(rawEmision, rawVenc, biasYear = null) {
  const CURRENT_YEAR = new Date().getFullYear();
  const em0 = toISODate(rawEmision);
  const ve0 = toISODate(rawVenc);
  if (!em0 && !ve0) return { emision: null, venc: null };
  if (em0 && !ve0) return { emision: em0, venc: null };
  if (!em0 && ve0) return { emision: null, venc: ve0 };

  const baseDelta = daysBetween(em0, ve0);
  const within180 = (n) => typeof n === 'number' && n >= 0 && n <= 180;
  const score = (iso) => {
    const p = parseISOParts(iso);
    let s = p ? Math.abs(p.y - CURRENT_YEAR) : 9999;
    if (biasYear != null && p) s += Math.abs(p.y - biasYear) * 0.5;
    return s;
  };

  const emP0 = parseISOParts(em0);
  const veP0 = parseISOParts(ve0);
  if (emP0 && veP0 && emP0.y === veP0.y && emP0.y <= CURRENT_YEAR - 2) {
    const upEm = isoFromYMD(fixYear(Number(String(emP0.y).replace(/0$/, '5'))), emP0.mo, emP0.d);
    const upVe = isoFromYMD(fixYear(Number(String(veP0.y).replace(/0$/, '5'))), veP0.mo, veP0.d);
    const dUp = daysBetween(upEm, upVe);
    if (upEm && upVe && within180(dUp)) return { emision: upEm, venc: upVe };
  }
  if (within180(baseDelta)) return { emision: em0, venc: ve0 };

  const emAlt = isoFromYMD(swap05Year(emP0.y), emP0.mo, emP0.d);
  const veAlt = isoFromYMD(swap05Year(veP0.y), veP0.mo, veP0.d);

  const candidates = [];
  if (veAlt) { const d = daysBetween(em0, veAlt); candidates.push({ em: em0, ve: veAlt, d, ok: within180(d), cost: score(em0)+score(veAlt) }); }
  if (emAlt) { const d = daysBetween(emAlt, ve0); candidates.push({ em: emAlt, ve: ve0, d, ok: within180(d), cost: score(emAlt)+score(ve0) }); }
  if (emAlt && veAlt) { const d = daysBetween(emAlt, veAlt); candidates.push({ em: emAlt, ve: veAlt, d, ok: within180(d), cost: score(emAlt)+score(veAlt) }); }

  const ok = candidates.filter(c => c.ok);
  if (ok.length) { ok.sort((a,b)=> (a.d-b.d) || (a.cost-b.cost)); return { emision: ok[0].em, venc: ok[0].ve }; }
  const nonNeg = candidates.filter(c => typeof c.d === 'number' && c.d >= 0);
  if (nonNeg.length) { nonNeg.sort((a,b)=> (a.d-b.d) || (a.cost-b.cost)); return { emision: nonNeg[0].em, venc: nonNeg[0].ve }; }
  return { emision: em0, venc: ve0 };
}

// ------------ Formatos/UI ------------
export function formatDateAR(iso) {
  if (!iso) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    return `${d}/${mo}/${y}`;
  }
  try {
    const d = new Date(iso);
    if (!isNaN(d.valueOf())) {
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }
  } catch {}
  return iso;
}

export function isOverdueISO(iso) {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  return d < today;
}
export function isWithinNextDays(iso, days) {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  return d >= today && d <= limit;
}