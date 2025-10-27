// src/features/invoices/components/KpiCards.jsx
import React from "react";
import { fmtMoney } from "../utiles/dateMoney";

export default function KpiCards({ metrics }) {
  const { totalPorPagar30d = 0, vencidas = 0, pagadasMes = 0, saldoTotal = 0 } = metrics || {};
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 w-full">
      <Kpi title="Total por pagar (30d)" value={`$ ${fmtMoney(totalPorPagar30d)}`} tone="blue" />
      <Kpi title="Vencidas" value={`$ ${fmtMoney(vencidas)}`} tone="red" />
      <Kpi title="Pagadas este mes" value={`$ ${fmtMoney(pagadasMes)}`} tone="green" />
      <Kpi title="Saldo total" value={`$ ${fmtMoney(saldoTotal)}`} tone="slate" />
    </div>
  );
}

function Kpi({ title, value, tone }) {
  return (
    <div className={`flex w-full min-w-0 flex-col justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm`}>
      <div className="text-[11px] tracking-wide uppercase text-gray-500">{title}</div>
      <div
        className={`text-2xl font-semibold ${
          tone === "red" ? "text-red-600" :
          tone === "green" ? "text-emerald-700" :
          "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}