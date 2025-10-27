// src/features/invoices/components/RegisterPaymentModal.jsx
import React, { useState } from "react";

export default function RegisterPaymentModal({ open, invoice, onClose, onSubmit }) {
  const [form, setForm] = useState({
    fechaPago: "",
    monto: "",
    metodo: "transferencia",
    referencia: "",
    notas: "",
    file: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open || !invoice) return null;

  function handleChange(e) {
    const { name, value, files } = e.target;
    setForm((f) => ({
      ...f,
      [name]: files ? files[0] : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.fechaPago || !form.monto) {
      setError("Fecha y monto son obligatorios.");
      return;
    }
    const monto = parseFloat(form.monto);
    if (monto <= 0 || monto > invoice.saldo) {
      setError("El monto debe ser mayor a 0 y menor o igual al saldo.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit?.({
        ...form,
        monto,
      });
    } catch (err) {
      console.error(err);
      setError("Error al registrar pago.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg space-y-3"
      >
        <h2 className="text-lg font-semibold mb-2">Registrar pago</h2>
        <div className="grid gap-2 text-sm">
          <label>
            Fecha de pago
            <input
              type="date"
              name="fechaPago"
              className="w-full border rounded p-1"
              value={form.fechaPago}
              onChange={handleChange}
            />
          </label>
          <label>
            Monto
            <input
              type="number"
              name="monto"
              className="w-full border rounded p-1"
              value={form.monto}
              onChange={handleChange}
            />
          </label>
          <label>
            Método
            <select
              name="metodo"
              className="w-full border rounded p-1"
              value={form.metodo}
              onChange={handleChange}
            >
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
              <option value="otros">Otros</option>
            </select>
          </label>
          <label>
            Referencia
            <input
              type="text"
              name="referencia"
              className="w-full border rounded p-1"
              value={form.referencia}
              onChange={handleChange}
            />
          </label>
          <label>
            Notas
            <textarea
              name="notas"
              className="w-full border rounded p-1"
              value={form.notas}
              onChange={handleChange}
            />
          </label>
          <label>
            Comprobante (PDF/JPG/PNG)
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleChange}
              className="w-full text-sm"
            />
          </label>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}