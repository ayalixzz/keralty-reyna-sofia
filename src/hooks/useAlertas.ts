import { useState, useEffect } from 'react'
import { getAlertas } from '@/api/mantenimientos.api'
import type { Alerta } from '@/types/app.types'

const MOCK_ALERTAS: Alerta[] = [
  {
    id: 'a1',
    serie: '2089715',
    nombre: 'AGITADOR DE PLAQUETAS',
    codigo_institucional: 'CL.153849',
    sede: 'CLÍNICA REINA SOFÍA',
    tipo: 'calibracion',
    proximo_vencimiento: '2024-08-20', // ya vencida
    estado_calibracion: 'vencida'
  },
  {
    id: 'a2',
    serie: '1010814100279',
    nombre: 'AGITADOR DE MAZZINI',
    codigo_institucional: 'CL.139441',
    sede: 'CLÍNICA REINA SOFÍA PEDIÁTRICA Y MUJER',
    tipo: 'preventivo',
    proximo_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // por vencer en 15 días
    estado_calibracion: 'por_vencer'
  }
]

export function useAlertas(diasAnticipacion = 30) {
  const [alertas, setAlertas]   = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    getAlertas(diasAnticipacion)
      .then((data) => {
        if (!cancelado) setAlertas((data ?? []) as Alerta[])
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'Error al cargar alertas')
          setAlertas(MOCK_ALERTAS)
        }
      })
      .finally(() => { if (!cancelado) setCargando(false) })

    return () => { cancelado = true }
  }, [diasAnticipacion])

  const vencidas    = alertas.filter((a) => a.estado_calibracion === 'vencida')
  const porVencer   = alertas.filter((a) => a.estado_calibracion === 'por_vencer')

  return { alertas, vencidas, porVencer, cargando, error }
}
