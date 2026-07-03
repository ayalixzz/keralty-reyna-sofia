import { supabase } from './supabase'
import type {
  Equipo,
  EquipoInsert,
  EquipoUpdate,
  EquipoPublico,
  FiltrosEquipo,
  Paginacion,
} from '@/types/app.types'

const TABLE = 'equipos'
const SELECT_BASE = `
  *,
  sede:sedes(id, nombre, ciudad),
  proveedor:proveedores(id, nombre)
`

/**
 * Vista pública del QR (sin login): `v_equipo_publico` expone solo columnas
 * no sensibles y corre con permisos del owner, así "anon" puede leerla aunque
 * no tenga acceso a la tabla `equipos` (ver supabase/migrations/0001_init.sql).
 * Nunca reemplazar esto por un `select` con lista de columnas sobre `equipos`:
 * con la anon key el cliente podría pedir cualquier columna igual, la única
 * barrera real es RLS/objetos a nivel de base de datos.
 */
const VISTA_PUBLICA = 'v_equipo_publico'

/* ── Búsqueda y listado ── */

export async function buscarEquipos(
  filtros: FiltrosEquipo,
  paginacion: Pick<Paginacion, 'pagina' | 'porPagina'>,
): Promise<{ data: Equipo[]; total: number }> {
  const { pagina, porPagina } = paginacion
  const from = (pagina - 1) * porPagina
  const to   = from + porPagina - 1

  let query = supabase
    .from(TABLE)
    .select(SELECT_BASE, { count: 'exact' })

  if (filtros.busqueda) {
    const term = filtros.busqueda.trim()
    query = query.or(`serie.ilike.%${term}%,codigo_institucional.ilike.%${term}%,nombre.ilike.%${term}%`)
  }
  if (filtros.sede_id)            query = query.eq('sede_id', filtros.sede_id)
  if (filtros.propiedad)          query = query.eq('propiedad', filtros.propiedad)
  if (filtros.estado)             query = query.eq('estado', filtros.estado)
  if (filtros.clasificacion_riesgo) query = query.eq('clasificacion_riesgo', filtros.clasificacion_riesgo)

  query = query.range(from, to).order('nombre')

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as Equipo[], total: count ?? 0 }
}

/* ── Obtener por serie (para la ficha y el QR) ── */

export async function getEquipoPorSerie(serie: string): Promise<Equipo | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_BASE)
    .eq('serie', serie)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Equipo | null
}

/* ── Obtener por serie para la vista pública del QR (sin login) ── */

interface FilaVistaPublica {
  id: string
  serie: string
  codigo_institucional: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  registro_invima: string | null
  clasificacion_riesgo: EquipoPublico['clasificacion_riesgo']
  estado: EquipoPublico['estado']
  area: string | null
  ubicacion_detalle: string | null
  sede_nombre: string | null
  sede_ciudad: string | null
  sede_direccion: string | null
  drive_folder_id: string | null
  ubicacion_documentacion_fisica: string | null
}

export async function getEquipoPublicoPorSerie(serie: string): Promise<EquipoPublico | null> {
  const { data, error } = await supabase
    .from(VISTA_PUBLICA)
    .select('*')
    .eq('serie', serie)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const fila = data as FilaVistaPublica
  const { sede_nombre, sede_ciudad, sede_direccion, ...resto } = fila
  return {
    ...resto,
    sede: sede_nombre ? { nombre: sede_nombre, ciudad: sede_ciudad ?? '', direccion: sede_direccion } : undefined,
  }
}

/* ── Obtener por ID ── */

export async function getEquipoPorId(id: string): Promise<Equipo | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_BASE)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Equipo | null
}

/* ── Crear ── */

export async function crearEquipo(payload: EquipoInsert): Promise<Equipo> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(SELECT_BASE)
    .single()

  if (error) throw new Error(error.message)
  return data as Equipo
}

/* ── Actualizar ── */

export async function actualizarEquipo(id: string, payload: EquipoUpdate): Promise<Equipo> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_BASE)
    .single()

  if (error) throw new Error(error.message)
  return data as Equipo
}

/* ── Estadísticas para el dashboard ──
 * Agregado en el servidor (función get_dashboard_stats) para no traer todo
 * el inventario al cliente solo para contarlo — ver supabase/migrations/0003.
 */

export interface DashboardStatsRPC {
  total: number
  activos: number
  en_mantenimiento: number
  dado_de_baja: number
  propio: number
  contrato: number
  proveedor: number
  sedes_total: number
  por_sede: { sede: string; total: number }[]
}

export async function getDashboardStats(): Promise<DashboardStatsRPC> {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw new Error(error.message)
  return data as DashboardStatsRPC
}
