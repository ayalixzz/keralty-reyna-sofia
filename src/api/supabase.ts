import { createClient } from '@supabase/supabase-js'

// Intentar leer las variables de entorno, o usar fallbacks seguros de prueba para el prototipo
const supabaseUrl  = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder-url.supabase.co'
const supabaseKey  = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key'

/** Cliente singleton de Supabase — usar en toda la app */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

