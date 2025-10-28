// src/lib/ocr/runOcr.js
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import Tesseract from 'tesseract.js';
import { parseOcrText } from './parseOcrText';

/**
 * Ejecuta OCR sobre la primera página de un PDF y retorna
 * un objeto de datos ya parseado (fechas, cuit, total, etc).
 * Asume que pdfjsLib.GlobalWorkerOptions.workerSrc ya fue configurado
 * por el caller (página) para no duplicar bundles.
 */
export async function runOcr(file) {
  if (!file) return null;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) throw new Error('El archivo debe ser PDF.');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  const imageDataURL = canvas.toDataURL('image/png');

  const { data: { text } } = await Tesseract.recognize(imageDataURL, 'spa+eng');

  return parseOcrText(text || '');
}

export default runOcr;

