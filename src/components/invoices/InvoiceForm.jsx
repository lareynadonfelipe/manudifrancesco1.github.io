// src/components/invoices/InvoiceForm.jsx

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function InvoiceForm() {
  const [file, setFile] = useState(null)
  const [type, setType] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [compNumber, setCompNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      alert('Por favor, seleccioná un archivo de factura.')
      return
    }
    setLoading(true)

    try {
      // 1) Obtener usuario autenticado
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) throw userError || new Error("No se pudo obtener el usuario autenticado.")
      const usuario_id = userData.user.id

      // 2) Subir archivo al bucket "invoices"
      const ext = file.name.split('.').pop()
      const fileName = `invoice_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('invoices')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf',
        })
      if (uploadError) throw uploadError

      // 3) Guardar los datos en la tabla
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          usuario_id,
          file_url: uploadData.path,
          type,
          business_name: businessName,
          comp_number: compNumber,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: Number(totalAmount),
          payment_method: paymentMethod,
          observations
        })
      if (insertError) throw insertError

      alert('✅ Factura registrada correctamente.')
      // Resetear formulario
      setFile(null)
      setType('')
      setBusinessName('')
      setCompNumber('')
      setIssueDate('')
      setDueDate('')
      setTotalAmount('')
      setPaymentMethod('')
      setObservations('')
    } catch (error) {
      console.error('❌ INSERT ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        status: error.status
      })
      alert(
        `Error al registrar la factura:\n` +
        `• message: ${error.message}\n` +
        `• details: ${error.details || '–'}\n` +
        `• hint: ${error.hint || '–'}\n` +
        `• code: ${error.code || '–'}\n` +
        `• status: ${error.status || '–'}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Archivo */}
      <div>
        <label className="block mb-1 font-medium">Factura (PDF o imagen)</label>
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={e => setFile(e.target.files[0])}
          className="w-full"
        />
      </div>

      {/* Tipo de factura */}
      <div>
        <label className="block mb-1 font-medium">Tipo de factura</label>
        <input
          type="text"
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {/* Razón Social */}
      <div>
        <label className="block mb-1 font-medium">Razón Social</label>
        <input
          type="text"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {/* Número de comprobante */}
      <div>
        <label className="block mb-1 font-medium">Comp. Nro</label>
        <input
          type="text"
          value={compNumber}
          onChange={e => setCompNumber(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Fecha de Emisión</label>
          <input
            type="date"
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Fecha de Vto.</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>

      {/* Importe y forma de pago */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Importe Total</label>
          <input
            type="number"
            step="0.01"
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Forma de Pago</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Cheque">Cheque</option>
            <option value="Efectivo">Efectivo</option>
          </select>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block mb-1 font-medium">Observaciones</label>
        <textarea
          value={observations}
          onChange={e => setObservations(e.target.value)}
          rows="3"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Botón de envío */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`px-5 py-2 bg-green-600 text-white rounded transition ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
          }`}
        >
          {loading ? 'Guardando...' : 'Guardar factura'}
        </button>
      </div>
    </form>
  )
}
