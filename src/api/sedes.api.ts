import { supabase } from './supabase'
import type { Sede } from '@/types/app.types'

export async function getSedes(): Promise<Sede[]> {
  const { data, error } = await supabase
    .from('sedes')
    .select('*')
    .order('nombre')

  if (error) throw new Error(error.message)
  return (data ?? []) as Sede[]
}

export async function crearSede(payload: Omit<Sede, 'id' | 'created_at'>): Promise<Sede> {
  const { data, error } = await supabase
    .from('sedes')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Sede
}
