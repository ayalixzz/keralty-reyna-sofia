import { supabase } from './supabase'

export interface ResultadoImportacion {
  ok: true
  filasTotales: number
  equiposImportados: number
  sedes: number
  proveedores: number
  mantenimientos: number
  omitidas: number
  detalleOmitidas: { fila: number; motivo: string; serie?: string; equipo?: string }[]
}

export async function importarExcel(archivo: File, sheet = 'Hoja 1'): Promise<ResultadoImportacion> {
  const form = new FormData()
  form.append('file', archivo)
  form.append('sheet', sheet)

  const { data, error } = await supabase.functions.invoke<ResultadoImportacion | { error: string }>('import-excel', {
    body: form,
  })

  if (error) throw new Error(error.message)
  if (!data || 'error' in data) throw new Error(data?.error ?? 'Error desconocido importando el archivo')
  return data
}
