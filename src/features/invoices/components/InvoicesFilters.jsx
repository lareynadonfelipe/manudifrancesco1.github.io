// src/features/invoices/components/InvoicesFilters.jsx
import React, { useState } from "react";

export default function InvoicesFilters({ value = {}, onChange, onClear }) {
  const [local, setLocal] = useState(value);

  function updateField(field, val) {
    const next = { ...local, [field]: val };
    setLocal(next);
    onChange?.(next);
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <input
          type="text"
          className="rounded border p-2 text-sm"
          placeholder="Proveedor"
          value={local.proveedor || ""}
          onChange={(e) => updateField("proveedor", e.target.value)}
        />
        <input
          type="text"
          className="rounded border p-2 text-sm"
          placeholder="Nº factura"
          value={local.numero || ""}
          onChange={(e) => updateField("numero", e.target.value)}
        />
        <input
          type="date"
          className="rounded border p-2 text-sm"
          value={local.desde || ""}
          onChange={(e) => updateField("desde", e.target.value)}
        />
        <input
          type="date"
          className="rounded border p-2 text-sm"
          value={local.hasta || ""}
          onChange={(e) => updateField("hasta", e.target.value)}
        />
        <input
          type="number"
          className="rounded border p-2 text-sm"
          placeholder="Monto mín."
          value={local.min || ""}
          onChange={(e) => updateField("min", e.target.value)}
        />
        <input
          type="number"
          className="rounded border p-2 text-sm"
          placeholder="Monto máx."
          value={local.max || ""}
          onChange={(e) => updateField("max", e.target.value)}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => {
            setLocal({});
            onClear?.();
          }}
          className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}