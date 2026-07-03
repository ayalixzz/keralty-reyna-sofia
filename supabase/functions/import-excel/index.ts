// @ts-nocheck — este archivo corre en el runtime Deno de Supabase Edge Functions,
// no en el proyecto Vite/Node (que usa `strict` + tipos de Node incompatibles con Deno).
import * as XLSX from 'npm:xlsx@0.18.5'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { procesarFilas } from '../_shared/mapeo-excel.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verifica que el JWT del que llama sea válido
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401)

    // Cliente con permisos de servicio para saltarse RLS en la escritura masiva
    const admin = createClient(supabaseUrl, serviceKey)

    // Solo admin/editor pueden importar inventario
    const { data: perfil } = await admin.from('usuarios').select('rol').eq('id', user.id).maybeSingle()
    if (!perfil || !['admin', 'editor'].includes(perfil.rol)) {
      return json({ error: 'No autorizado — se requiere rol admin o editor' }, 403)
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return json({ error: 'Falta el archivo Excel' }, 400)
    const sheetName = String(form.get('sheet') ?? 'Hoja 1')

    const buf = new Uint8Array(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[sheetName]
    if (!ws) {
      return json({ error: `No existe la hoja "${sheetName}". Hojas disponibles: ${wb.SheetNames.join(', ')}` }, 400)
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
    const dataRows = rows.slice(1)
    const { procesadas, omitidas, sedesUnicas, proveedoresUnicos, ciudadPorSede } = procesarFilas(dataRows)

    // Sedes
    const sedeIdPorNombre = new Map<string, string>()
    for (const nombre of sedesUnicas) {
      const { data, error } = await admin
        .from('sedes')
        .upsert({ nombre, ciudad: ciudadPorSede.get(nombre) ?? 'BOGOTA' }, { onConflict: 'nombre' })
        .select('id')
        .single()
      if (error) return json({ error: `Sede "${nombre}": ${error.message}` }, 500)
      sedeIdPorNombre.set(nombre, data.id)
    }

    // Proveedores
    const proveedorIdPorNombre = new Map<string, string>()
    for (const nombre of proveedoresUnicos) {
      const { data, error } = await admin
        .from('proveedores')
        .upsert({ nombre }, { onConflict: 'nombre' })
        .select('id')
        .single()
      if (error) return json({ error: `Proveedor "${nombre}": ${error.message}` }, 500)
      proveedorIdPorNombre.set(nombre, data.id)
    }

    // Equipos (en lotes)
    const CHUNK = 200
    const equipoIdPorSerie = new Map<string, string>()
    for (let i = 0; i < procesadas.length; i += CHUNK) {
      const lote = procesadas.slice(i, i + CHUNK).map((p) => ({
        ...p.equipo,
        sede_id: sedeIdPorNombre.get(p.sedeNombre),
        proveedor_id: p.proveedorNombre ? proveedorIdPorNombre.get(p.proveedorNombre) : null,
      }))
      const { data, error } = await admin.from('equipos').upsert(lote, { onConflict: 'serie' }).select('id, serie')
      if (error) return json({ error: `Lote de equipos [${i}-${i + CHUNK}]: ${error.message}` }, 500)
      for (const eq of data ?? []) equipoIdPorSerie.set(eq.serie, eq.id)
    }

    // Mantenimientos (calibración)
    const mantenimientos = procesadas
      .filter((p) => p.mantenimiento && equipoIdPorSerie.has(p.serie))
      .map((p) => ({ ...p.mantenimiento!, equipo_id: equipoIdPorSerie.get(p.serie) }))

    for (let i = 0; i < mantenimientos.length; i += CHUNK) {
      const lote = mantenimientos.slice(i, i + CHUNK)
      const { error } = await admin.from('mantenimientos').upsert(lote, { onConflict: 'equipo_id,tipo,fecha' })
      if (error) return json({ error: `Lote de mantenimientos [${i}-${i + CHUNK}]: ${error.message}` }, 500)
    }

    return json({
      ok: true,
      filasTotales: dataRows.length,
      equiposImportados: equipoIdPorSerie.size,
      sedes: sedeIdPorNombre.size,
      proveedores: proveedorIdPorNombre.size,
      mantenimientos: mantenimientos.length,
      omitidas: omitidas.length,
      detalleOmitidas: omitidas.slice(0, 50),
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error desconocido procesando el archivo' }, 500)
  }
})
