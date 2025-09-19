import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🚀 [supabase.js] URL:', supabaseUrl);
console.log('🔑 [supabase.js] ANONKEY prefix:', supabaseAnonKey?.slice(0,8), '…');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, detectSessionInUrl: true },
});
