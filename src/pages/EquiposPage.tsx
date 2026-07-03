import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, QrCode, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEquipos } from '@/hooks/useEquipos'
import { useSedes } from '@/hooks/useSedes'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import {
  BadgeEstadoEquipo, BadgePropiedad, BadgeRiesgo,
} from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import type { FiltrosEquipo } from '@/types/app.types'

export function EquiposPage() {
  const navigate = useNavigate()
  const { sedes } = useSedes()
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<FiltrosEquipo>({})

  const { equipos, cargando, paginacion, cambiarFiltros, cambiarPagina } = useEquipos()

  const handleBusqueda = () => {
    cambiarFiltros({ ...filtros, busqueda: busqueda || undefined })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBusqueda()
  }

  const totalPaginas = Math.ceil(paginacion.total / paginacion.porPagina)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipos médicos</h1>
          <p className="page-subtitle">
            {paginacion.total.toLocaleString('es-CO')} equipos registrados
          </p>
        </div>
      </div>

      {/* Barra de búsqueda + filtros */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <Input
              id="busqueda-equipo"
              placeholder="Buscar por serie, código institucional o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKeyDown}
              icon={<Search size={16} />}
            />
          </div>

          <Select
            id="filtro-sede"
            placeholder="Todas las sedes"
            options={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            value={filtros.sede_id ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setFiltros((f) => ({ ...f, sede_id: val || undefined }))
            }}
            style={{ width: 200 }}
          />

          <Select
            id="filtro-propiedad"
            placeholder="Tipo de propiedad"
            options={[
              { value: 'propio', label: 'Propio' },
              { value: 'contrato', label: 'Contrato / Comodato' },
              { value: 'proveedor', label: 'Proveedor' },
            ]}
            value={filtros.propiedad ?? ''}
            onChange={(e) => {
              const val = e.target.value as FiltrosEquipo['propiedad']
              setFiltros((f) => ({ ...f, propiedad: val || undefined }))
            }}
            style={{ width: 180 }}
          />

          <Select
            id="filtro-estado"
            placeholder="Estado"
            options={[
              { value: 'activo', label: 'Activo' },
              { value: 'en_mantenimiento', label: 'En mantenimiento' },
              { value: 'dado_de_baja', label: 'Dado de baja' },
            ]}
            value={filtros.estado ?? ''}
            onChange={(e) => {
              const val = e.target.value as FiltrosEquipo['estado']
              setFiltros((f) => ({ ...f, estado: val || undefined }))
            }}
            style={{ width: 160 }}
          />

          <Button
            onClick={() => cambiarFiltros({ ...filtros, busqueda: busqueda || undefined })}
            icon={<Filter size={16} />}
          >
            Filtrar
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setBusqueda('')
              setFiltros({})
              cambiarFiltros({})
            }}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '3rem' }}>
            <PageSpinner />
          </div>
        ) : equipos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Search size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p>No se encontraron equipos con los filtros seleccionados</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th># Serie</th>
                <th>Código</th>
                <th>Equipo</th>
                <th>Marca / Modelo</th>
                <th>Sede</th>
                <th>Propiedad</th>
                <th>Riesgo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((eq) => (
                <tr
                  key={eq.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/equipos/${encodeURIComponent(eq.serie)}`)}
                >
                  <td>
                    <span className="data-mono">{eq.serie}</span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    {eq.codigo_institucional ?? '—'}
                  </td>
                  <td style={{ fontWeight: 600, maxWidth: 220 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {eq.nombre}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    <div>{eq.marca ?? '—'}</div>
                    <div>{eq.modelo ?? ''}</div>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <div>{eq.sede?.nombre ?? '—'}</div>
                    {eq.area && (
                      <div style={{ color: 'var(--color-text-muted)' }}>{eq.area}</div>
                    )}
                  </td>
                  <td><BadgePropiedad propiedad={eq.propiedad} /></td>
                  <td><BadgeRiesgo riesgo={eq.clasificacion_riesgo} /></td>
                  <td><BadgeEstadoEquipo estado={eq.estado} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<QrCode size={14} />}
                      onClick={() => navigate(`/qr?serie=${encodeURIComponent(eq.serie)}`)}
                    >
                      QR
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--color-surface-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Página {paginacion.pagina} de {totalPaginas} ·{' '}
              {paginacion.total.toLocaleString('es-CO')} equipos
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="secondary" size="sm"
                disabled={paginacion.pagina <= 1}
                onClick={() => cambiarPagina(paginacion.pagina - 1)}
                icon={<ChevronLeft size={14} />}
              >
                Anterior
              </Button>
              <Button
                variant="secondary" size="sm"
                disabled={paginacion.pagina >= totalPaginas}
                onClick={() => cambiarPagina(paginacion.pagina + 1)}
              >
                Siguiente <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
