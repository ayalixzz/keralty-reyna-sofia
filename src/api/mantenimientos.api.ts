import { supabase } from './supabase'
import type { Mantenimiento, MantenimientoInsert } from '@/types/app.types'

const TABLE = 'mantenimientos'

export async function getMantenimientosDeEquipo(equipoId: string): Promise<Mantenimiento[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('equipo_id', equipoId)
    .order('fecha', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Mantenimiento[]
}

export async function registrarMantenimiento(payload: MantenimientoInsert): Promise<Mantenimiento> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Mantenimiento
}

export async function getAlertas(diasAnticipacion = 30) {
  const { data, error } = await supabase
    .from('v_alertas')
    .select('*')
    .lte('proximo_vencimiento',
      new Date(Date.now() + diasAnticipacion * 86400000).toISOString().split('T')[0]
    )
    .order('proximo_vencimiento')

  if (error) throw new Error(error.message)
  return data ?? []
}
