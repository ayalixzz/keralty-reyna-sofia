import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/types/app.types'
import { getMiPerfil, logout as apiLogout } from '@/api/auth.api'
import { supabase } from '@/api/supabase'

interface AuthState {
  usuario: Usuario | null
  cargando: boolean
  inicializado: boolean
  setUsuario: (u: Usuario | null) => void
  cargarPerfil: () => Promise<void>
  logout: () => Promise<void>
}

// Perfil local por defecto para que funcione el prototipo
const MOCK_USUARIO: Usuario = {
  id: 'user-mock-id',
  email: 'ingeniero.biomedico@colsanitas.com',
  nombre: 'Ing. Administrador Keralty',
  rol: 'admin',
  notificaciones_email: true,
  created_at: new Date().toISOString(),
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      cargando: false,
      inicializado: false,

      setUsuario: (u) => set({ usuario: u }),

      cargarPerfil: async () => {
        set({ cargando: true })
        try {
          const perfil = await getMiPerfil()
          if (perfil) {
            set({ usuario: perfil, inicializado: true })
          } else {
            // Fallback mock para pruebas
            set({ usuario: MOCK_USUARIO, inicializado: true })
          }
        } catch {
          // Fallback en caso de desconexión
          set({ usuario: MOCK_USUARIO, inicializado: true })
        } finally {
          set({ cargando: false })
        }
      },

      logout: async () => {
        try {
          await apiLogout()
        } catch {
          // Ignorar si no hay conexión
        }
        set({ usuario: null })
      },
    }),
    {
      name: 'keralty-auth',
      partialize: (state) => ({ usuario: state.usuario }),
    },
  ),
)

/* Escuchar cambios de sesión de Supabase Auth */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' || session) {
    await useAuthStore.getState().cargarPerfil()
  } else {
    // Si no hay sesión, inicializado debe ser true para permitir redirección a /login
    useAuthStore.setState({ usuario: null, inicializado: true })
  }
})

