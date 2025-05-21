import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '/vite.svg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de autenticación...
    navigate('/inicio');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white shadow-lg rounded-lg p-6"
      >
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-12 w-auto" />
        </div>

        <label className="block mb-4">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="
              mt-1 block w-full
              rounded-lg border border-gray-300
              px-4 py-3 text-base
              focus:outline-none focus:ring-2 focus:ring-green-500
              bg-white
            "
            placeholder="tucorreo@ejemplo.com"
            required
          />
        </label>

        <label className="block mb-6">
          <span className="text-gray-700">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="
              mt-1 block w-full
              rounded-lg border border-gray-300
              px-4 py-3 text-base
              focus:outline-none focus:ring-2 focus:ring-green-500
              bg-white
            "
            placeholder="••••••••"
            required
          />
        </label>

        <button
          type="submit"
          className="
            w-full text-base
            bg-green-600 text-white
            rounded-lg py-3
            hover:bg-green-700
            focus:outline-none focus:ring-2 focus:ring-green-500
          "
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
