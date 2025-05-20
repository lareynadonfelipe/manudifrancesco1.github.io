// src/pages/LoginPage.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    // —— AQUI VA TU LÓGICA DE AUTENTICACIÓN ——  
    // Por ejemplo, llamas a tu API o a Supabase:
    // const { data, error } = await supabase.auth.signIn({ email, password })
    // if (error) { /* mostrar mensaje */; return }
    // si todo fue bien:
    navigate('/inicio')  
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h1>

        <label className="block mb-2">
          <span className="text-gray-700">Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded"
            required
          />
        </label>

        <label className="block mb-4">
          <span className="text-gray-700">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded"
            required
          />
        </label>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Ingresar
        </button>
      </form>
    </div>
  )
}
