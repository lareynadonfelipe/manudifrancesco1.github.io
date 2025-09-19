// src/pages/TestFacturaUpload.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestFacturaUpload() {
  const [file, setFile] = useState(null);
  const [user, setUser] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setMensaje('⚠️ Usuario no autenticado');
      } else {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  const handleUpload = async () => {
    if (!file) return alert('Seleccioná un archivo');

    setCargando(true);
    setMensaje('');

    try {
      const nombre = `${user.id}/${file.name}`;

      // 1. Subir al bucket
      const { error: uploadError } = await supabase.storage
        .from('facturastest')
        .upload(nombre, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Insertar en tabla
      // const { error: insertError } = await supabase.from('facturas').insert([
      //   {
      //     file_path: nombre,
      //     creado_por: user.id,
      //   },
      // ]);

      // if (insertError) throw insertError;

      setMensaje('✅ Subida e inserción exitosas');
    } catch (err) {
      console.error(err);
      setMensaje(`❌ Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Test Subida de Factura</h1>

      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button
        onClick={handleUpload}
        disabled={!user || cargando}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {cargando ? 'Subiendo...' : 'Subir'}
      </button>

      {mensaje && <p className="mt-4">{mensaje}</p>}
    </div>
  );
}