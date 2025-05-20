import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '/vite.svg';

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const navigate                = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    sessionStorage.setItem(
      "usuario",
      JSON.stringify({ email, role: "admin" })
    );
    navigate("/inicio");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50 p-4 w-full">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <img src={logo} alt="Logo" className="mx-auto w-16 h-16" />
          <h1 className="text-3xl font-bold mt-4">La Reina – Don Felipe</h1>
          <p className="text-gray-600 mt-1">
            Gestión agropecuaria técnica y comercial
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@dominio.com"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
