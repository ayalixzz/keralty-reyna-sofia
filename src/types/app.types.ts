/* ============================================================
   TIPOS DE BASE DE DATOS — mapeados desde el schema PostgreSQL
   ============================================================ */

export type RiesgoClasificacion = 'I' | 'IIA' | 'IIB' | 'III'
export type PropiedadTipo = 'propio' | 'contrato' | 'proveedor'
export type EstadoEquipo = 'activo' | 'en_mantenimiento' | 'dado_de_baja'
export type TipoDocumento =
  | 'documentacion'
  | 'mantenimiento'
  | 'correctivo'
  | 'calibracion'
  | 'manual'
  | 'registro_invima'
export type TipoMantenimiento = 'preventivo' | 'correctivo' | 'calibracion'
export type RolUsuario = 'admin' | 'editor' | 'lector'
export type EstadoAlerta = 'vencida' | 'por_vencer' | 'vigente'

export interface Sede {
  id: string
  nombre: string
  ciudad: string
  direccion: string | null
  created_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  nit: string | null
  contacto: string | null
  created_at: string
}

export interface Equipo {
  id: string
  serie: string
  codigo_institucional: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  registro_invima: string | null
  fecha_adquisicion: string | null
  fecha_entrada_servicio: string | null
  garantia_meses: number | null
  vida_util_anios: number | null
  modalidad_ingreso: string | null
  clasificacion_riesgo: RiesgoClasificacion | null
  clasificacion_biomedica: string | null
  propiedad: PropiedadTipo
  proveedor_id: string | null
  numero_contrato: string | null
  contrato_inicio: string | null
  contrato_fin: string | null
  sede_id: string
  area: string | null
  ubicacion_detalle: string | null
  responsable_biomedico: string | null
  estado: EstadoEquipo
  drive_folder_id: string | null
  novedades_calibracion: string | null
  novedades_doc: string | null
  checklist_mantenimiento: Record<string, boolean> | null
  created_at: string
  updated_at: string
  // Joins opcionales
  sede?: Sede
  proveedor?: Proveedor
}

export interface Documento {
  id: string
  equipo_id: string
  tipo: TipoDocumento
  nombre: string
  fecha_documento: string | null
  vence_el: string | null
  drive_file_id: string | null
  created_at: string
}

export interface Mantenimiento {
  id: string
  equipo_id: string
  tipo: TipoMantenimiento
  fecha: string
  responsable: string | null
  observaciones: string | null
  proximo_vencimiento: string | null
  created_at: string
}

export interface Usuario {
  id: string
  email: string
  nombre: string | null
  rol: RolUsuario
  notificaciones_email: boolean
  created_at: string
}

/* ── Vista pública (QR sin login): solo campos no sensibles ── */

export interface DocumentoPublico {
  id: string
  tipo: TipoDocumento
  nombre: string
  fecha_documento: string | null
  vence_el: string | null
  drive_file_id: string | null
}

export interface EquipoPublico {
  id: string
  serie: string
  codigo_institucional: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  registro_invima: string | null
  clasificacion_riesgo: RiesgoClasificacion | null
  estado: EstadoEquipo
  area: string | null
  ubicacion_detalle: string | null
  drive_folder_id: string | null
  sede?: Pick<Sede, 'nombre' | 'ciudad' | 'direccion'>
  documentos?: DocumentoPublico[]
}

export interface Alerta {
  id: string
  serie: string
  nombre: string
  codigo_institucional: string | null
  sede: string
  tipo: TipoMantenimiento
  proximo_vencimiento: string
  estado_calibracion: EstadoAlerta
}

/* ── DTOs para crear / actualizar ── */

export type EquipoInsert = Omit<Equipo, 'id' | 'created_at' | 'updated_at' | 'sede' | 'proveedor'>
export type EquipoUpdate = Partial<EquipoInsert>

export type MantenimientoInsert = Omit<Mantenimiento, 'id' | 'created_at'>
export type DocumentoInsert    = Omit<Documento, 'id' | 'created_at'>

/* ── Tipos de UI ── */

export interface Paginacion {
  pagina: number
  porPagina: number
  total: number
}

export interface FiltrosEquipo {
  busqueda?: string
  sede_id?: string
  propiedad?: PropiedadTipo
  estado?: EstadoEquipo
  clasificacion_riesgo?: RiesgoClasificacion
}

export interface DashboardStats {
  total: number
  por_propiedad: Record<PropiedadTipo, number>
  por_estado: Record<EstadoEquipo, number>
  por_sede: { sede: string; total: number }[]
  calibraciones: { vigente: number; por_vencer: number; vencida: number }
}
