import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log de control (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('🚀 [supabase.js] URL:', supabaseUrl);
  console.log('🔑 [supabase.js] ANONKEY prefix:', supabaseAnonKey?.slice(0, 8), '…');
}

// Validación: evita CORS fantasma por env vacíos
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
}

// Crear cliente Supabase (autenticado y persistente)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});