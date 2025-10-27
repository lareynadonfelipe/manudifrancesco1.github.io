// src/features/invoices/utils/schemas.js
import { z } from "zod";

export const PaymentMethodEnum = z.enum(["transferencia","cheque","efectivo","otros"]);

export const PaymentSchema = (saldoActual=Number.POSITIVE_INFINITY, moneda="ARS") => z.object({
  fechaPago: z.string().min(1, "Requerido"),
  monto: z.number().positive("Debe ser > 0").max(saldoActual, "No puede superar el saldo"),
  metodo: PaymentMethodEnum,
  referencia: z.string().max(120).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
  // el archivo se valida en el uploader (tipo/size) y acá solo presencia opcional
  file: z.any().optional().nullable(),
  moneda: z.string().default(moneda)
});

export const InvoiceSchema = z.object({
  id: z.string(),
  numero: z.string(),
  proveedor: z.string(),
  emisionFecha: z.string(),     // ISO
  vencimientoFecha: z.string(), // ISO
  moneda: z.string(),           // "ARS" | "USD"
  total: z.number(),
  saldo: z.number(),
  estado: z.enum(["POR_PAGAR","VENCIDA","PAGADA","PARCIAL"]),
  tags: z.array(z.string()).default([]),
  notas: z.string().optional().nullable(),
  facturaUrl: z.string().optional().nullable(),
  comprobantes: z.array(z.object({
    id: z.string(),
    fecha: z.string(),
    monto: z.number(),
    metodo: PaymentMethodEnum,
    referencia: z.string().optional().nullable(),
    archivoUrl: z.string().optional().nullable()
  })).default([]),
  timeline: z.array(z.object({
    ts: z.string(),
    tipo: z.enum(["CREADA","UPDATE","PAGO"]),
    descripcion: z.string()
  })).default([])
});