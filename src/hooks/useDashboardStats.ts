import { useEffect, useState } from 'react'
import { getDashboardStats, type DashboardStatsRPC } from '@/api/equipos.api'

const MOCK_STATS: DashboardStatsRPC = {
  total: 3,
  activos: 2,
  en_mantenimiento: 1,
  dado_de_baja: 0,
  propio: 2,
  contrato: 1,
  proveedor: 0,
  sedes_total: 2,
  por_sede: [
    { sede: 'CLÍNICA REINA SOFÍA', total: 2 },
    { sede: 'CLÍNICA REINA SOFÍA PEDIÁTRICA Y MUJER', total: 1 },
  ],
}

export function useDashboardStats() {
  const [stats, setStats]       = useState<DashboardStatsRPC>(MOCK_STATS)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    getDashboardStats()
      .then((data) => { if (!cancelado) setStats(data) })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : 'Error al cargar estadísticas')
          setStats(MOCK_STATS)
        }
      })
      .finally(() => { if (!cancelado) setCargando(false) })

    return () => { cancelado = true }
  }, [])

  return { stats, cargando, error }
}
