/**
 * Importación idempotente del inventario real de equipos médicos desde Excel.
 *
 * Uso:
 *   node scripts/import-excel.ts "<ruta al .xlsx>" --dry-run   (valida sin escribir en Supabase)
 *   node scripts/import-excel.ts "<ruta al .xlsx>"             (escribe de verdad, upsert por serie)
 *   node scripts/import-excel.ts "<ruta al .xlsx>" --sheet="Hoja 1"
 *
 * Mapeo de columnas basado en "BASES ZONA NORTE UNIFICADAS.xlsx" (hoja "Hoja 1").
 * No se importan (fuera de alcance de la v1, no existen en el esquema actual):
 * vigencia INVIMA, costo de adquisición, specs técnicas (voltaje/corriente/peso/etc.),
 * datos de contacto de proveedor/contratista, ni los 2 certificados de calibración
 * adicionales (solo se toma el más reciente como registro de mantenimiento).
 */
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs'

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

/* ── índices de columnas (0-based) de "Hoja 1" ── */

const COL = {
  SEDE_A: 2, SEDE_B: 8, CIUDAD: 7,
  SERVICIO: 10, UBICACION: 11,
  EQUIPO: 12, MARCA: 13, MODELO: 14, SERIE: 15, ACTIVO: 16,
  ESTADO: 18, PROVEEDOR: 21, RIESGO: 22, INVIMA: 23,
  FECHA_ADQUISICION: 30, FECHA_INSTALACION: 31, VENCIMIENTO_GARANTIA: 32, VIDA_UTIL: 33,
  FRECUENCIA_METROLOGICA: 41,
  FORMA_ADQUISICION: 44, MODALIDAD_MTTO: 45,
  BIOMEDICA: 50, RESPONSABLE: 78, DRIVE: 79,
  ENE: 82, // ...DIC = 93
  EJECUTOR: 97, FECHA_CALIBRACION: 99,
  OBSERVACIONES_1: 107, OBSERVACIONES_2: 108,
} as const

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

/** Placeholders de "sin dato" usados en el Excel — nunca son un número de serie real. */
const SERIE_PLACEHOLDER = /^(NO REGISTRA|N\/?A|SIN SERIE|NO APLICA|S\/?N|#N\/A)$/i

type Riesgo = 'I' | 'IIA' | 'IIB' | 'III'
type Estado = 'activo' | 'en_mantenimiento' | 'dado_de_baja'
type Propiedad = 'propio' | 'contrato' | 'proveedor'

/* ── helpers ── */

function clean(v: unknown): string {
  return String(v ?? '').trim()
}

function toISODate(v: unknown): string | null {
  return v instanceof Date && !isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : null
}

function mesesEntre(inicio: Date, fin: Date): number | null {
  const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth())
  return meses >= 0 ? meses : null
}

function sumarPorFrecuencia(fecha: Date, frecuencia: string): string | null {
  const f = frecuencia.toUpperCase()
  const d = new Date(fecha)
  if (f.includes('SEMESTRAL')) d.setMonth(d.getMonth() + 6)
  else if (f.includes('ANUAL')) d.setFullYear(d.getFullYear() + 1)
  else if (f.includes('TRIMESTRAL')) d.setMonth(d.getMonth() + 3)
  else if (f.includes('MENSUAL')) d.setMonth(d.getMonth() + 1)
  else return null
  return d.toISOString().slice(0, 10)
}

function mapEstado(raw: string): Estado {
  const v = raw.toUpperCase()
  if (v === 'BAJA') return 'dado_de_baja'
  if (v === 'FUERA DE SERVICIO' || v === 'EN BODEGA') return 'en_mantenimiento'
  return 'activo'
}

function mapRiesgo(raw: string): Riesgo | null {
  const v = raw.toUpperCase().trim()
  return v === 'I' || v === 'IIA' || v === 'IIB' || v === 'III' ? v : null
}

function mapPropiedad(formaAdquisicion: string, modalidadMtto: string): Propiedad {
  const a = formaAdquisicion.toUpperCase()
  const b = modalidadMtto.toUpperCase()
  if (a === 'COMODATO' || b === 'COMODATO' || b === 'CONTRATO') return 'contrato'
  return 'propio'
}

function extraerDriveFolderId(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

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

interface FilaProcesada {
  serie: string
  sedeNombre: string
  ciudad: string
  equipo: Record<string, unknown>
  proveedorNombre: string | null
  mantenimiento: Record<string, unknown> | null
}

const procesadas: FilaProcesada[] = []
const omitidas: { fila: number; motivo: string; serie?: string; equipo?: string }[] = []
const seriesVistas = new Set<string>()
const ciudadPorSede = new Map<string, string>()

dataRows.forEach((row, i) => {
  const numFila = i + 2
  if (!row || row.length === 0) return

  const serie  = clean(row[COL.SERIE])
  const nombre = clean(row[COL.EQUIPO])
  const sedeNombre = clean(row[COL.SEDE_A]) || clean(row[COL.SEDE_B])

  if (!serie)  { omitidas.push({ fila: numFila, motivo: 'serie vacía', equipo: nombre }); return }
  if (SERIE_PLACEHOLDER.test(serie)) {
    omitidas.push({ fila: numFila, motivo: `serie es un placeholder ("${serie}"), no un número real`, equipo: nombre })
    return
  }
  if (!nombre) { omitidas.push({ fila: numFila, motivo: 'nombre de equipo vacío', serie }); return }
  if (!sedeNombre || sedeNombre.length < 4 || /^(true|false)$/i.test(sedeNombre)) {
    omitidas.push({ fila: numFila, motivo: `sede inválida ("${sedeNombre}")`, serie, equipo: nombre })
    return
  }

  if (seriesVistas.has(serie)) {
    omitidas.push({ fila: numFila, motivo: 'serie duplicada (se conserva la última aparición)', serie, equipo: nombre })
  }
  seriesVistas.add(serie)

  const ciudad = clean(row[COL.CIUDAD]) || 'BOGOTA'
  if (!ciudadPorSede.has(sedeNombre)) ciudadPorSede.set(sedeNombre, ciudad)

  const fechaAdquisicion = toISODate(row[COL.FECHA_ADQUISICION])
  const fechaInstalacion = toISODate(row[COL.FECHA_INSTALACION])
  const fechaGarantia    = row[COL.VENCIMIENTO_GARANTIA] instanceof Date ? row[COL.VENCIMIENTO_GARANTIA] as Date : null
  const garantiaMeses    = fechaInstalacion && fechaGarantia ? mesesEntre(new Date(fechaInstalacion), fechaGarantia) : null

  const checklist: Record<string, boolean> = {}
  MESES.forEach((mes, idx) => {
    const val = clean(row[COL.ENE + idx])
    if (val) checklist[mes.toLowerCase()] = /^(si|sí|ok|x|1|true)$/i.test(val)
  })

  const observaciones = [clean(row[COL.OBSERVACIONES_1]), clean(row[COL.OBSERVACIONES_2])]
    .filter(Boolean).join(' · ') || null

  const equipo = {
    serie,
    nombre,
    codigo_institucional: clean(row[COL.ACTIVO]) || null,
    marca: clean(row[COL.MARCA]) || null,
    modelo: clean(row[COL.MODELO]) || null,
    registro_invima: clean(row[COL.INVIMA]) || null,
    fecha_adquisicion: fechaAdquisicion,
    fecha_entrada_servicio: fechaInstalacion,
    garantia_meses: garantiaMeses,
    vida_util_anios: Number(row[COL.VIDA_UTIL]) || null,
    modalidad_ingreso: clean(row[COL.FORMA_ADQUISICION]).toLowerCase() || null,
    clasificacion_riesgo: mapRiesgo(clean(row[COL.RIESGO])),
    clasificacion_biomedica: clean(row[COL.BIOMEDICA]) || null,
    propiedad: mapPropiedad(clean(row[COL.FORMA_ADQUISICION]), clean(row[COL.MODALIDAD_MTTO])),
    area: clean(row[COL.SERVICIO]) || null,
    ubicacion_detalle: clean(row[COL.UBICACION]) || null,
    responsable_biomedico: clean(row[COL.RESPONSABLE]) || null,
    estado: mapEstado(clean(row[COL.ESTADO])),
    drive_folder_id: extraerDriveFolderId(clean(row[COL.DRIVE])),
    novedades_doc: observaciones,
    checklist_mantenimiento: checklist,
  }

  const fechaCalibracion = toISODate(row[COL.FECHA_CALIBRACION])
  const mantenimiento = fechaCalibracion ? {
    tipo: 'calibracion' as const,
    fecha: fechaCalibracion,
    responsable: clean(row[COL.EJECUTOR]) || null,
    proximo_vencimiento: sumarPorFrecuencia(new Date(fechaCalibracion), clean(row[41])),
  } : null

  procesadas.push({
    serie, sedeNombre, ciudad,
    equipo,
    proveedorNombre: clean(row[COL.PROVEEDOR]) || null,
    mantenimiento,
  })
})

/* ── resumen ── */

const sedesUnicas = new Set(procesadas.map((p) => p.sedeNombre))
const proveedoresUnicos = new Set(procesadas.map((p) => p.proveedorNombre).filter((v): v is string => !!v))

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
