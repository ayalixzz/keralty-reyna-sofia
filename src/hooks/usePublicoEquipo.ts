import { useEffect, useState } from 'react'
import { getEquipoPublicoPorSerie } from '@/api/equipos.api'
import { getDocumentosPublicoDeEquipo } from '@/api/documentos.api'
import { MOCK_EQUIPOS, MOCK_DOCUMENTOS } from './useEquipo'
import type { EquipoPublico } from '@/types/app.types'

interface UsePublicoEquipoResult {
  equipo: EquipoPublico | null
  cargando: boolean
  error: string | null
}

/** Construye la vista pública a partir de un mock, para demo sin conexión a Supabase. */
function mockAPublico(serie: string): EquipoPublico | null {
  const eq = MOCK_EQUIPOS.find((e) => e.serie === serie)
  if (!eq) return null
  return {
    id: eq.id,
    serie: eq.serie,
    codigo_institucional: eq.codigo_institucional,
    nombre: eq.nombre,
    marca: eq.marca,
    modelo: eq.modelo,
    registro_invima: eq.registro_invima,
    clasificacion_riesgo: eq.clasificacion_riesgo,
    estado: eq.estado,
    area: eq.area,
    ubicacion_detalle: eq.ubicacion_detalle,
    ubicacion_documentacion_fisica: eq.ubicacion_documentacion_fisica,
    drive_folder_id: eq.drive_folder_id,
    sede: eq.sede ? { nombre: eq.sede.nombre, ciudad: eq.sede.ciudad, direccion: eq.sede.direccion } : undefined,
    documentos: (MOCK_DOCUMENTOS[eq.id] ?? []).map((d) => ({
      id: d.id,
      tipo: d.tipo,
      nombre: d.nombre,
      fecha_documento: d.fecha_documento,
      vence_el: d.vence_el,
      drive_file_id: d.drive_file_id,
    })),
  }
}

/**
 * Hook de solo lectura para la vista pública que abre el QR del equipo.
 * No requiere sesión — solo expone ubicación e identificación no sensible.
 */
export function usePublicoEquipo(serie: string | undefined): UsePublicoEquipoResult {
  const [equipo, setEquipo]     = useState<EquipoPublico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!serie) return
    let cancelado = false
    setCargando(true)
    setError(null)

    const cargar = async () => {
      try {
        const eq = await getEquipoPublicoPorSerie(serie)
        if (cancelado) return
        if (!eq) {
          setEquipo(mockAPublico(serie))
        } else {
          const documentos = await getDocumentosPublicoDeEquipo(eq.id)
          if (cancelado) return
          setEquipo({ ...eq, documentos })
        }
      } catch (e) {
        if (!cancelado) {
          const mock = mockAPublico(serie)
          if (mock) setEquipo(mock)
          else setError(e instanceof Error ? e.message : 'Error cargando el equipo')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    void cargar()
    return () => { cancelado = true }
  }, [serie])

  return { equipo, cargando, error }
}
