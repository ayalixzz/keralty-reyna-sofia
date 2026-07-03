import { supabase } from './supabase'
import type { Usuario, RolUsuario } from '@/types/app.types'

/* ── Autenticación ── */

export async function loginConEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* ── Perfil de usuario ── */

export async function getMiPerfil(): Promise<Usuario | null> {
  const session = await getSession()
  if (!session) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Usuario | null
}

/* ── Admin: gestión de usuarios ── */

export async function getUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return (data ?? []) as Usuario[]
}

export async function actualizarRol(userId: string, rol: RolUsuario): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ rol })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

export async function actualizarNotificaciones(userId: string, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ notificaciones_email: activo })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}
