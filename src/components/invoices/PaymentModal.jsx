// src/components/invoices/PaymentModal.jsx

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'   // ← named import corregido

export default function PaymentModal({ invoice, onClose }) {
  const [mode, setMode] = useState('with_proof')
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let proof_url = null
      let proof_note = null
      let newStatus = 'paid_with_proof'

      if (mode === 'with_proof') {
        if (!file) throw new Error('Subí un comprobante.')
        // 1) Subir el comprobante
        const ext = file.name.split('.').pop()
        const name = `proof_${invoice.id}_${Date.now()}.${ext}`
        const { data: up, error: upErr } = await supabase
          .storage
          .from('invoices')
          .upload(name, file)
        if (upErr) throw upErr

        // 2) Obtener URL pública
        const { data: urlData } = supabase
          .storage
          .from('invoices')
          .getPublicUrl(up.path)
        proof_url = urlData.publicUrl
      } else {
        newStatus = 'paid_without_proof'
        proof_note = note
      }

      // 3) Actualizar la factura
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          proof_url,
          proof_note,
          paid_at: new Date().toISOString()
        })
        .eq('id', invoice.id)

      if (updateErr) throw updateErr

      onClose(true)
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Marcar factura como pagada</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="with_proof"
                checked={mode === 'with_proof'}
                onChange={() => setMode('with_proof')}
                className="form-radio"
              />
              <span className="ml-2">Adjuntar comprobante</span>
            </label>
            <label className="inline-flex items-center ml-6">
              <input
                type="radio"
                value="without_proof"
                checked={mode === 'without_proof'}
                onChange={() => setMode('without_proof')}
                className="form-radio"
              />
              <span className="ml-2">Sin comprobante</span>
            </label>
          </div>

          {mode === 'with_proof' ? (
            <div>
              <label className="block mb-1 font-medium">Comprobante (PDF o imagen)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={e => setFile(e.target.files[0])}
                className="w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block mb-1 font-medium">Describir forma de pago</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows="3"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 border rounded hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-green-600 text-white rounded transition ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              {loading ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
