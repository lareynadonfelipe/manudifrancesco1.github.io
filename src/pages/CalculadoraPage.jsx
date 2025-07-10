// src/pages/CalculadoraPage.jsx
import React, { useState, useEffect } from 'react'
import { Loader2, RefreshCw, Info } from 'lucide-react'

export default function CalculadoraPage() {
  const [spotPrices, setSpotPrices]         = useState({})
  const [cultivo, setCultivo]               = useState('Soja')
  const [useCustomPrice, setUseCustomPrice] = useState(false)
  const [customPrice, setCustomPrice]       = useState('')
  const [kg, setKg]                         = useState('')
  const [ars, setArs]                       = useState('')
  const [timestamp, setTimestamp]           = useState(null)
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    fetch(import.meta.env.VITE_PIZARRA_URL, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(payload => {
        const { timestamp, ...prices } = payload
        setTimestamp(timestamp)
        const clean = Object.fromEntries(
          Object.entries(prices).filter(([k]) => k.toLowerCase() !== 'code')
        )
        setSpotPrices(clean)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCustomPrice('')
    setKg('')
    setArs('')
    setUseCustomPrice(false)
  }, [cultivo])

  const precioTon = useCustomPrice
    ? parseFloat(customPrice) || 0
    : spotPrices[cultivo] ?? 0
  const precioKg = precioTon / 1000

  const onKg  = v => { setKg(v); if (v) setArs('') }
  const onArs = v => { setArs(v); if (v) setKg('') }

  const ganancia   = kg   && precioKg ? parseFloat(kg)  * precioKg : 0
  const necesarios = ars  && precioKg ? parseFloat(ars) / precioKg : 0

  const onReset = () => {
    setCustomPrice('')
    setKg('')
    setArs('')
    setUseCustomPrice(false)
  }

  const fmtDate = ts => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('es-AR',{ day:'2-digit', month:'long', year:'numeric' })
      + ' • ' +
      d.toLocaleTimeString('es-AR',{ hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className="p-6 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CULTIVO & PRECIO */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-emerald-600 uppercase">
              Cultivo & Precio
            </h2>
            <button onClick={onReset} className="p-1 hover:bg-gray-100 rounded">
              <RefreshCw size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-emerald-600" size={32}/>
            </div>
          ) : (
            <>
              {/* Botones de cultivo */}
              <label className="block text-sm text-gray-700 mb-2">Cultivo</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Soja','Maíz','Trigo','Sorgo'].map(g => (
                  <button
                    key={g}
                    onClick={() => setCultivo(g)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      cultivo === g
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Selector precio */}
              <label className="block text-sm text-gray-700 mb-2">Precio</label>
              <div className="flex space-x-3 mb-4">
                <button
                  onClick={() => setUseCustomPrice(false)}
                  className={`flex-1 px-4 py-2 text-center rounded-lg border transition ${
                    !useCustomPrice
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >Pizarra</button>
                <button
                  onClick={() => setUseCustomPrice(true)}
                  className={`flex-1 px-4 py-2 text-center rounded-lg border transition ${
                    useCustomPrice
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >Personalizado</button>
              </div>

              {/* Valor */}
              {!useCustomPrice ? (
                <div className="mb-2">
                  <span className="text-xl font-semibold text-emerald-600">
                    {precioTon.toLocaleString('es-AR',{ style:'currency',currency:'ARS' })}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">/ ton</span>
                  <span className="ml-4 text-xs text-gray-500">
                    ({precioKg.toFixed(2)} $/kg)
                  </span>
                </div>
              ) : (
                <input
                  type="number"
                  className="w-full border border-gray-300 bg-gray-50 rounded px-3 py-2 focus:ring-emerald-500 transition mb-2"
                  placeholder="Ingrese $/ton"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                />
              )}

              {/* Timestamp */}
              {timestamp && (
                <p className="text-xs text-gray-400 pt-3 border-t border-gray-100">
                  {fmtDate(timestamp)}
                </p>
              )}
            </>
          )}
        </div>

        {/* TUS CÁLCULOS */}
        <div className="col-span-1 md:col-span-2 bg-white border border-gray-200 p-6 rounded-lg shadow-sm hover:shadow-md transition">
          <h2 className="text-base font-semibold text-emerald-600 uppercase mb-4">
            Tus Cálculos
          </h2>

          {/* Grid 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fila 1 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Kilos a vender</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-emerald-500 transition"
                placeholder="Ej. 1000"
                value={kg}
                onChange={e => onKg(e.target.value)}
              />
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Ganancia estimada</p>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {ganancia.toLocaleString('es-AR',{ style:'currency',currency:'ARS' })}
              </p>
            </div>

            {/* Fila 2 */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Objetivo en $</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-emerald-500 transition"
                placeholder="Ej. 500 000"
                value={ars}
                onChange={e => onArs(e.target.value)}
              />
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Kilos necesarios</p>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {necesarios.toLocaleString('es-AR',{ maximumFractionDigits:2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
