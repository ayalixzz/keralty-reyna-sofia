/**
 * Mapeo y validación del inventario de equipos médicos desde Excel.
 * Módulo puro (sin Node ni Deno específicos) para poder importarse tanto desde
 * scripts/import-excel.ts (CLI, Node) como desde supabase/functions/import-excel
 * (Edge Function, Deno) sin duplicar las reglas de negocio.
 *
 * Basado en "BASES ZONA NORTE UNIFICADAS.xlsx", hoja "Hoja 1". No se importan
 * (fuera de alcance de la v1, no existen en el esquema actual): vigencia INVIMA,
 * costo de adquisición, specs técnicas, datos de contacto de proveedor/contratista,
 * ni los 2 certificados de calibración adicionales (solo el más reciente).
 */

/* ── índices de columnas (0-based) de "Hoja 1" ── */

export const COL = {
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

export const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

/** Placeholders de "sin dato" usados en el Excel — nunca son un número de serie real. */
export const SERIE_PLACEHOLDER = /^(NO REGISTRA|N\/?A|SIN SERIE|NO APLICA|S\/?N|#N\/A)$/i

export type Riesgo = 'I' | 'IIA' | 'IIB' | 'III'
export type Estado = 'activo' | 'en_mantenimiento' | 'dado_de_baja'
export type Propiedad = 'propio' | 'contrato' | 'proveedor'

/* ── helpers ── */

export function clean(v: unknown): string {
  return String(v ?? '').trim()
}

export function toISODate(v: unknown): string | null {
  return v instanceof Date && !isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : null
}

export function mesesEntre(inicio: Date, fin: Date): number | null {
  const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth())
  return meses >= 0 ? meses : null
}

export function sumarPorFrecuencia(fecha: Date, frecuencia: string): string | null {
  const f = frecuencia.toUpperCase()
  const d = new Date(fecha)
  if (f.includes('SEMESTRAL')) d.setMonth(d.getMonth() + 6)
  else if (f.includes('ANUAL')) d.setFullYear(d.getFullYear() + 1)
  else if (f.includes('TRIMESTRAL')) d.setMonth(d.getMonth() + 3)
  else if (f.includes('MENSUAL')) d.setMonth(d.getMonth() + 1)
  else return null
  return d.toISOString().slice(0, 10)
}

export function mapEstado(raw: string): Estado {
  const v = raw.toUpperCase()
  if (v === 'BAJA') return 'dado_de_baja'
  if (v === 'FUERA DE SERVICIO' || v === 'EN BODEGA') return 'en_mantenimiento'
  return 'activo'
}

export function mapRiesgo(raw: string): Riesgo | null {
  const v = raw.toUpperCase().trim()
  return v === 'I' || v === 'IIA' || v === 'IIB' || v === 'III' ? v : null
}

export function mapPropiedad(formaAdquisicion: string, modalidadMtto: string): Propiedad {
  const a = formaAdquisicion.toUpperCase()
  const b = modalidadMtto.toUpperCase()
  if (a === 'COMODATO' || b === 'COMODATO' || b === 'CONTRATO') return 'contrato'
  return 'propio'
}

export function extraerDriveFolderId(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

/* ── procesamiento de filas ── */

export interface FilaProcesada {
  serie: string
  sedeNombre: string
  ciudad: string
  equipo: Record<string, unknown>
  proveedorNombre: string | null
  mantenimiento: Record<string, unknown> | null
}

export interface FilaOmitida {
  fila: number
  motivo: string
  serie?: string
  equipo?: string
}

export interface ResultadoProcesamiento {
  procesadas: FilaProcesada[]
  omitidas: FilaOmitida[]
  sedesUnicas: Set<string>
  proveedoresUnicos: Set<string>
  ciudadPorSede: Map<string, string>
}

/** Recibe las filas del Excel ya leídas como array-of-arrays (sin la fila de encabezado). */
export function procesarFilas(dataRows: unknown[][]): ResultadoProcesamiento {
  const procesadas: FilaProcesada[] = []
  const omitidas: FilaOmitida[] = []
  const seriesVistas = new Set<string>()
  const ciudadPorSede = new Map<string, string>()

  dataRows.forEach((row, i) => {
    const numFila = i + 2
    if (!row || row.length === 0) return

    const serie  = clean(row[COL.SERIE])
    const nombre = clean(row[COL.EQUIPO])
    const sedeNombre = clean(row[COL.SEDE_A]) || clean(row[COL.SEDE_B])

    if (!serie) { omitidas.push({ fila: numFila, motivo: 'serie vacía', equipo: nombre }); return }
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
      proximo_vencimiento: sumarPorFrecuencia(new Date(fechaCalibracion), clean(row[COL.FRECUENCIA_METROLOGICA])),
    } : null

    procesadas.push({
      serie, sedeNombre, ciudad,
      equipo,
      proveedorNombre: clean(row[COL.PROVEEDOR]) || null,
      mantenimiento,
    })
  })

  const sedesUnicas = new Set(procesadas.map((p) => p.sedeNombre))
  const proveedoresUnicos = new Set(procesadas.map((p) => p.proveedorNombre).filter((v): v is string => !!v))

  return { procesadas, omitidas, sedesUnicas, proveedoresUnicos, ciudadPorSede }
}
