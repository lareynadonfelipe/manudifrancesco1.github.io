import React from 'react'
import InvoiceForm from '../components/invoices/InvoiceForm'

export default function NuevaFacturaPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Registrar nueva factura</h1>
      <InvoiceForm />
    </div>
  )
}
