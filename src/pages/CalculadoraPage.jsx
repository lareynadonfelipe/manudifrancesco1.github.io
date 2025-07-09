// src/pages/CalculadoraPage.jsx
import React, { useState, useEffect } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

export default function CalculadoraPage() {
  const [spotPrices, setSpotPrices]       = useState({})
  const [cultivo, setCultivo]             = useState('')
  const [overridePrice, setOverridePrice] = useState('')
  const [kg, setKg]                       = useState('')
  const [ars, setArs]                     = useState('')
  const [timestamp, setTimestamp]         = useState(null)
  const [loading, setLoading]             = useState(true)

  // 1) Carga de precios (/ton) y timestamp
  useEffect(() => {
    fetch(import.meta.env.VITE_PIZARRA_URL, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(payload => {
        // payload: { Soya: 315000, Trigo: 280000, timestamp: "2025-07-03T10:14:00Z" }
        const { timestamp, ...prices } = payload
        setTimestamp(timestamp)
        const cleaned = Object.fromEntries(
          Object.entries(prices).filter(([k]) => k.toLowerCase() !== 'code')
        )
        setSpotPrices(cleaned)
        setCultivo(Object.keys(cleaned)[0] || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // al cambiar cultivo reset
  useEffect(() => {
    setOverridePrice('')
    setKg('')
    setArs('')
  }, [cultivo])

  const precioTon = overridePrice
    ? parseFloat(overridePrice)
    : spotPrices[cultivo] ?? 0

  // Convertimos a $/kg
  const precioKg = precioTon / 1000

  // flujos: si ingreso kg limpio ars, y viceversa
  const onKg = v => { setKg(v); if (v) setArs('') }
  const onArs = v => { setArs(v); if (v) setKg('') }

  const ganancia   = kg   && precioKg ? parseFloat(kg)  * precioKg : 0
  const necesarios = ars  && precioKg ? parseFloat(ars) / precioKg : 0

  const onReset = () => { setOverridePrice(''); setKg(''); setArs('') }

  // formateo timestamp
  const fmtDate = ts => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric'
    }) + ' - Hora: ' +
      d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">
          Calculadora de Venta
        </h1>
        {timestamp && (
          <p className="text-sm text-gray-500">
            Rosario, {fmtDate(timestamp)}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cultivo + Precio */}
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Cultivo & Precio</h2>
            <button onClick={onReset} className="p-1 hover:bg-gray-100 rounded">
              <RefreshCw size={18} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : (
            <>
              <label className="block text-sm text-gray-700 mb-1">Cultivo</label>
              <select
                className="w-full mb-4 border-gray-300 rounded px-3 py-2 focus:ring-emerald-500"
                value={cultivo}
                onChange={e => setCultivo(e.target.value)}
              >
                {Object.keys(spotPrices).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <label className="block text-sm text-gray-700 mb-1">
                Precio de pizarra ($/ton)
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  className="flex-1 border-gray-300 rounded px-3 py-2 focus:ring-emerald-500"
                  placeholder={precioTon.toFixed(2)}
                  value={overridePrice}
                  onChange={e => setOverridePrice(e.target.value)}
                />
                <div className="text-right">
                  <p className="text-emerald-600 font-semibold">
                    {precioTon.toLocaleString('es-AR',{
                      style:'currency',currency:'ARS'
                    })} / ton
                  </p>
                  <p className="text-sm text-gray-500">
                    ({precioKg.toFixed(2)} $/kg)
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cálculos */}
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <h2 className="text-lg font-semibold mb-4">Tus Cálculos</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Kilos a vender</label>
              <input
                type="number"
                className="w-full border-gray-300 rounded px-3 py-2 focus:ring-emerald-500"
                placeholder="Ej. 1000"
                value={kg}
                onChange={e => onKg(e.target.value)}
              />
              <p className="mt-2 text-gray-600">
                Ganancia estimada:{' '}
                <span className="font-medium text-gray-800">
                  {ganancia.toLocaleString('es-AR',{
                    style:'currency',currency:'ARS'
                  })}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Objetivo en $</label>
              <input
                type="number"
                className="w-full border-gray-300 rounded px-3 py-2 focus:ring-emerald-500"
                placeholder="Ej. 500 000"
                value={ars}
                onChange={e => onArs(e.target.value)}
              />
              <p className="mt-2 text-gray-600">
                Kilos necesarios:{' '}
                <span className="font-medium text-gray-800">
                  {necesarios.toLocaleString('es-AR',{ maximumFractionDigits:2 })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
