/**
 * Importación idempotente del inventario real de equipos médicos desde Excel.
 *
 * Uso:
 *   node scripts/import-excel.ts "<ruta al .xlsx>" --dry-run   (valida sin escribir en Supabase)
 *   node scripts/import-excel.ts "<ruta al .xlsx>"             (escribe de verdad, upsert por serie)
 *   node scripts/import-excel.ts "<ruta al .xlsx>" --sheet="Hoja 1"
 *
 * El mapeo de columnas vive en supabase/functions/_shared/mapeo-excel.ts,
 * compartido con la Edge Function `import-excel` (subida desde Administración).
 */
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs'
import { procesarFilas } from '../supabase/functions/_shared/mapeo-excel.ts'

/* ── CLI ── */

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const sheetArg = args.find((a) => a.startsWith('--sheet='))
const sheetName = sheetArg ? sheetArg.split('=')[1] : 'Hoja 1'
const excelPath = args.find((a) => !a.startsWith('--'))

if (!excelPath) {
  console.error('Uso: node scripts/import-excel.ts <ruta-al-excel.xlsx> [--dry-run] [--sheet="Hoja 1"]')
  process.exit(1)
}

try { process.loadEnvFile() } catch { /* variables ya exportadas en el entorno */ }

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const credencialesOk = !!SUPABASE_URL && !!SERVICE_KEY
  && !SUPABASE_URL.includes('placeholder') && !SERVICE_KEY.startsWith('tu-')

if (!dryRun && !credencialesOk) {
  console.error('Faltan credenciales reales de Supabase (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env).')
  console.error('Ejecuta primero con --dry-run para validar el archivo sin conectarte a la base de datos.')
  process.exit(1)
}

const supabase = dryRun ? null : createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } })

/* ── leer y procesar el excel ── */

console.log(`Leyendo "${excelPath}" (hoja "${sheetName}")...`)
const wb = XLSX.readFile(excelPath, { cellDates: true })
const ws = wb.Sheets[sheetName]
if (!ws) {
  console.error(`No existe la hoja "${sheetName}". Hojas disponibles: ${wb.SheetNames.join(', ')}`)
  process.exit(1)
}

const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
const dataRows = rows.slice(1)

const { procesadas, omitidas, sedesUnicas, proveedoresUnicos, ciudadPorSede } = procesarFilas(dataRows)

/* ── resumen ── */

console.log('\n── Resumen del archivo ──')
console.log(`Filas totales en la hoja: ${dataRows.length}`)
console.log(`Equipos válidos para importar: ${procesadas.length}`)
console.log(`Filas omitidas: ${omitidas.length}`)
console.log(`Sedes distintas: ${sedesUnicas.size} → ${[...sedesUnicas].join(', ')}`)
console.log(`Proveedores distintos: ${proveedoresUnicos.size}`)
console.log(`Equipos con carpeta de Drive detectada: ${procesadas.filter((p) => p.equipo.drive_folder_id).length}`)
console.log(`Registros de calibración a crear: ${procesadas.filter((p) => p.mantenimiento).length}`)

if (omitidas.length > 0) {
  const reportePath = path.join(process.cwd(), 'import-excel-omitidas.csv')
  const csv = ['fila,serie,equipo,motivo', ...omitidas.map((o) => `${o.fila},"${o.serie ?? ''}","${o.equipo ?? ''}","${o.motivo}"`)].join('\n')
  fs.writeFileSync(reportePath, csv, 'utf-8')
  console.log(`Detalle de filas omitidas: ${reportePath}`)
}

if (dryRun) {
  console.log('\n(--dry-run) No se escribió nada en Supabase.')
  process.exit(0)
}

/* ── escritura real (idempotente por serie / nombre / equipo_id+tipo+fecha) ── */

async function main() {
  console.log('\nSincronizando sedes...')
  const sedeIdPorNombre = new Map<string, string>()
  for (const nombre of sedesUnicas) {
    const { data, error } = await supabase!
      .from('sedes')
      .upsert({ nombre, ciudad: ciudadPorSede.get(nombre) ?? 'BOGOTA' }, { onConflict: 'nombre' })
      .select('id')
      .single()
    if (error) throw new Error(`Sede "${nombre}": ${error.message}`)
    sedeIdPorNombre.set(nombre, data.id)
  }

  console.log('Sincronizando proveedores...')
  const proveedorIdPorNombre = new Map<string, string>()
  for (const nombre of proveedoresUnicos) {
    const { data, error } = await supabase!
      .from('proveedores')
      .upsert({ nombre }, { onConflict: 'nombre' })
      .select('id')
      .single()
    if (error) throw new Error(`Proveedor "${nombre}": ${error.message}`)
    proveedorIdPorNombre.set(nombre, data.id)
  }

  console.log(`Sincronizando ${procesadas.length} equipos...`)
  const CHUNK = 200
  const equipoIdPorSerie = new Map<string, string>()
  for (let i = 0; i < procesadas.length; i += CHUNK) {
    const lote = procesadas.slice(i, i + CHUNK).map((p) => ({
      ...p.equipo,
      sede_id: sedeIdPorNombre.get(p.sedeNombre),
      proveedor_id: p.proveedorNombre ? proveedorIdPorNombre.get(p.proveedorNombre) : null,
    }))
    const { data, error } = await supabase!
      .from('equipos')
      .upsert(lote, { onConflict: 'serie' })
      .select('id, serie')
    if (error) throw new Error(`Lote de equipos [${i}-${i + CHUNK}]: ${error.message}`)
    for (const eq of data ?? []) equipoIdPorSerie.set(eq.serie, eq.id)
    console.log(`  ${Math.min(i + CHUNK, procesadas.length)}/${procesadas.length}`)
  }

  console.log('Sincronizando registros de calibración...')
  const mantenimientos = procesadas
    .filter((p) => p.mantenimiento && equipoIdPorSerie.has(p.serie))
    .map((p) => ({ ...p.mantenimiento!, equipo_id: equipoIdPorSerie.get(p.serie) }))

  for (let i = 0; i < mantenimientos.length; i += CHUNK) {
    const lote = mantenimientos.slice(i, i + CHUNK)
    const { error } = await supabase!.from('mantenimientos').upsert(lote, { onConflict: 'equipo_id,tipo,fecha' })
    if (error) throw new Error(`Lote de mantenimientos [${i}-${i + CHUNK}]: ${error.message}`)
  }

  console.log(`\nListo. ${equipoIdPorSerie.size} equipos, ${sedeIdPorNombre.size} sedes, ${proveedorIdPorNombre.size} proveedores, ${mantenimientos.length} registros de calibración.`)
}

main().catch((e) => {
  console.error('\nError durante la importación:', e instanceof Error ? e.message : e)
  process.exit(1)
})
