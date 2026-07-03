import { supabase } from './supabase'
import type { Documento, DocumentoInsert, DocumentoPublico } from '@/types/app.types'

const TABLE = 'documentos'

export async function getDocumentosDeEquipo(equipoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('equipo_id', equipoId)
    .order('fecha_documento', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Documento[]
}

/** Vista pública sin login — ver nota de seguridad en equipos.api.ts. */
export async function getDocumentosPublicoDeEquipo(equipoId: string): Promise<DocumentoPublico[]> {
  const { data, error } = await supabase
    .from('v_documento_publico')
    .select('*')
    .eq('equipo_id', equipoId)
    .order('fecha_documento', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as DocumentoPublico[]
}

export async function registrarDocumento(payload: DocumentoInsert): Promise<Documento> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Documento
}

export async function eliminarDocumento(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw new Error(error.message)
}
