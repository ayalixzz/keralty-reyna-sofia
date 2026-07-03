import { useState, useEffect } from 'react'
import { getSedes } from '@/api/sedes.api'
import type { Sede } from '@/types/app.types'

const MOCK_SEDES: Sede[] = [
  { id: 'sede-1', nombre: 'CLÍNICA REINA SOFÍA', ciudad: 'Bogotá', direccion: 'Calle 127', created_at: '' },
  { id: 'sede-2', nombre: 'CLÍNICA REINA SOFÍA PEDIÁTRICA Y MUJER', ciudad: 'Bogotá', direccion: 'Carrera 15', created_at: '' }
]

export function useSedes() {
  const [sedes, setSedes]       = useState<Sede[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    setCargando(true)
    getSedes()
      .then((data) => {
        if (data && data.length > 0) {
          setSedes(data)
        } else {
          setSedes(MOCK_SEDES)
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar sedes')
        setSedes(MOCK_SEDES)
      })
      .finally(() => setCargando(false))
  }, [])

  return { sedes, cargando, error }
}
