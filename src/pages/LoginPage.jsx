// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Sprout } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Traduce el mensaje de "Invalid login credentials"
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('Correo o contraseña inválidos');
      } else {
        setErrorMsg(error.message);
      }
    } else {
      navigate('/inicio');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white shadow-lg rounded-lg p-6 space-y-4"
      >
        <div className="flex flex-col items-center">
          <Sprout size={48} className="text-green-600" />
          <h1 className="mt-4 text-2xl font-semibold text-gray-800">
            La Reina – Login
          </h1>
        </div>

        {errorMsg && (
          <div className="text-red-600 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border rounded p-2 w-full"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="border rounded p-2 w-full"
        />

        <button
          type="submit"
          className="w-full bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
