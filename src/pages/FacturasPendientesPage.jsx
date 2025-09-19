import React from 'react'
import InvoicesTable from '../components/invoices/InvoicesTable'

export default function FacturasPendientesPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Facturas pendientes de pago</h1>
      <InvoicesTable />
    </div>
  )
}
