// src/components/invoices/InvoicesTable.jsx

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PaymentModal from './PaymentModal'

export default function InvoicesTable() {
  const [invoices, setInvoices] = useState([])
  const [totalRequired, setTotalRequired] = useState(0)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchInvoices = async () => {
    // Solo facturas pendientes
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'pending')
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching invoices:', error)
      return
    }

    // Generar signed URL para cada archivo
    const invoicesWithUrls = await Promise.all(
      data.map(async (inv) => {
        let signedUrl = null
        if (inv.file_url) {
          const { data: signedData, error: signErr } = await supabase
            .storage
            .from('invoices')
            .createSignedUrl(inv.file_url, 60)
          if (signErr) {
            console.error('Error generating signed URL for', inv.file_url, signErr)
          } else {
            signedUrl = signedData.signedUrl
          }
        }
        return { ...inv, signedUrl }
      })
    )

    setInvoices(invoicesWithUrls)
    setTotalRequired(
      invoicesWithUrls.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
    )
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const openModal = (invoice) => {
    setSelectedInvoice(invoice)
    setModalOpen(true)
  }

  const closeModal = (shouldRefresh = false) => {
    setModalOpen(false)
    setSelectedInvoice(null)
    if (shouldRefresh) fetchInvoices()
  }

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid_with_proof: 'bg-green-100 text-green-800',
    paid_without_proof: 'bg-teal-100 text-teal-800'
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="bg-white shadow rounded p-4 flex items-center justify-between">
        <div>
          <span className="block text-sm text-gray-500">Total requerido en caja</span>
          <span className="text-2xl font-bold">${totalRequired.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                'Vencimiento',
                'Razón Social',
                'Comp. Nro',
                'Importe',
                'Forma de pago',
                'Factura',
                'Estado',
                'Acción'
              ].map(header => (
                <th
                  key={header}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm">
                  {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-2 text-sm">{inv.business_name}</td>
                <td className="px-4 py-2 text-sm">{inv.comp_number}</td>
                <td className="px-4 py-2 text-sm">
                  ${Number(inv.total_amount).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm">{inv.payment_method}</td>
                <td className="px-4 py-2 text-sm">
                  {inv.signedUrl ? (
                    <a
                      href={inv.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Ver factura
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">No disponible</span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm">
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      statusColor[inv.status]
                    }`}
                  >
                    {inv.status ? inv.status.replace(/_/g, ' ') : '-'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  <button
                    onClick={() => openModal(inv)}
                    className="text-white bg-green-600 px-3 py-1 rounded hover:bg-green-700 transition"
                  >
                    Marcar pagada
                  </button>
                </td>
              </tr>
            ))}

            {invoices.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                  No hay facturas pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de pago */}
      {modalOpen && selectedInvoice && (
        <PaymentModal invoice={selectedInvoice} onClose={closeModal} />
      )}
    </div>
  )
}
