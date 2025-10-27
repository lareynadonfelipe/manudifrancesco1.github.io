// src/lib/ocr/parseOcrText.js
// Puro parsing de texto OCR -> datos de factura

export function parseOcrText(text) {
  if (!text || typeof text !== 'string') {
    return {
      fecha_emision: null,
      fecha_vencimiento: null,
      razon_social: null,
      cuit: null,
      numero_factura: null,
      tipo_factura: null,
      neto: null,
      importe_total: 0,
      raw_text: text || ''
    };
  }

  // Tipo de factura
  let tipo_factura = null;
  const hasA = /\bFACTURA\s*A\b/i.test(text);
  const hasB = /\bFACTURA\s*B\b/i.test(text);
  const hasC = /\bFACTURA\s*C\b/i.test(text);
  if (hasA) tipo_factura = 'A';
  else if (hasB) tipo_factura = 'B';
  else if (hasC) tipo_factura = 'C';

  // CUIT
  const cuit = (text.match(/\bCUIT\s*:?\s*([0-9]{11})/i)?.[1]) || null;

  // Razón social (refinado: corta antes de otros labels como Fecha, CUIT, etc.)
  let razon_social = null;
  const rsMatch = text.match(/Raz[oó]n\s+Social\s*:?\s*([^\n]+)/i);
  if (rsMatch) {
    let line = rsMatch[1].trim();
    // Si en la misma línea el OCR pegó otros campos, los removemos
    line = line
      .replace(/\b(Fecha\s*de\s*Emisi[oó]n|Fecha\s*de\s*(?:Vencimiento|Vto\.?)|CUIT|Condici[oó]n|Domicilio|Comprobante|Comp\.?\s*Nro|N[°º]|N[uú]mero|Tipo\s*de\s*Factura)\b.*$/i, '')
      .trim()
      .replace(/\s{2,}/g, ' ')
      .replace(/[,:;\-]\s*$/, '');
    razon_social = line || null;
  }

  // Número de factura
  const numero_factura =
    text.match(/Comp\.?\s*Nro\s*:?\s*0*([0-9]+)/i)?.[1] || null;

  // Fechas
  const fecha_emision =
    text.match(/Fecha\s*de\s*Emisi[oó]n\s*:?\s*([0-3]?\d[\/-][01]?\d[\/-]\d{2,4})/i)?.[1] || null;
  const fecha_vencimiento =
    text.match(/Fecha\s*de\s*Vto.*?\s*([0-3]?\d[\/-][01]?\d[\/-]\d{2,4})/i)?.[1] || null;

  // Importes
  const netoMatch = text.match(/Importe\s+Neto\s+Gravado\s*:?\s*\$?\s*([\d\.,]+)/i);
  const neto = netoMatch
    ? parseFloat(netoMatch[1].replace(/\.(?=\d{3})/g, '').replace(',', '.'))
    : null;

  const totalMatch =
    text.match(/Importe\s+Total\s*:?\s*\$?\s*([\d\.,]+)/i) ||
    text.match(/\bTotal\b[^\d]*([\d\.,]+)/i);
  const importe_total = totalMatch
    ? parseFloat(totalMatch[1].replace(/\.(?=\d{3})/g, '').replace(',', '.'))
    : 0;

  return {
    fecha_emision,
    fecha_vencimiento,
    razon_social,
    cuit,
    numero_factura,
    tipo_factura,
    neto,
    importe_total,
    raw_text: text,
  };
}