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

    try {
      // 🔐 Iniciar sesión
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setErrorMsg('Correo o contraseña inválidos');
        } else {
          setErrorMsg(authError.message);
        }
        return;
      }

      const user = data.user;
      if (!user) {
        setErrorMsg('No se pudo obtener información del usuario');
        return;
      }

      // 📄 Obtener perfil desde Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setErrorMsg('No se encontró perfil de usuario o hubo un error');
        return;
      }

      // 💾 Guardar usuario en sessionStorage
      const usuario = {
        id: user.id,
        email: user.email,
        role: profile.role,
        permissions: profile.permissions,
      };
      sessionStorage.setItem('usuario', JSON.stringify(usuario));

      // ➡️ Redirigir a inicio
      navigate('/inicio');
    } catch (error) {
      setErrorMsg('Error inesperado al iniciar sesión');
      console.error(error);
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
            La Reina Don Felipe – Login
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
