import { useParams } from 'react-router-dom'
import {
  Stethoscope, MapPin, Building2, FileText, ExternalLink,
  AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { usePublicoEquipo } from '@/hooks/usePublicoEquipo'
import { PageSpinner } from '@/components/ui/Spinner'
import { BadgeEstadoEquipo, BadgeRiesgo } from '@/components/ui/Badge'
import { formatFecha, calcularEstadoAlerta } from '@/utils/date.utils'
import { BadgeEstadoAlerta } from '@/components/ui/Badge'

export function PublicoEquipoPage() {
  const { serie } = useParams<{ serie: string }>()
  const { equipo, cargando, error } = usePublicoEquipo(serie)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-900)', display: 'flex', flexDirection: 'column' }}>
      {/* Encabezado de marca */}
      <header
        style={{
          background: 'var(--color-sidebar-bg)',
          padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-keralty-600), var(--color-keralty-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Stethoscope size={18} color="#fff" />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-sidebar-text)' }}>MedTrack</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-sidebar-text-muted)' }}>Keralty · Colsanitas — Vista pública</div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '1.5rem 1rem 3rem' }}>
        <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {cargando && <PageSpinner />}

          {!cargando && (error || !equipo) && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <AlertTriangle size={40} style={{ margin: '0 auto 1rem', color: 'var(--color-warning-500)', opacity: 0.8 }} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Equipo no encontrado
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No existe un equipo registrado con la serie <strong>{serie}</strong>.
                Verifica la etiqueta física o comunícate con Ingeniería Biomédica.
              </p>
            </div>
          )}

          {!cargando && equipo && (
            <>
              {/* Identificación */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{equipo.nombre}</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      {[equipo.marca, equipo.modelo].filter(Boolean).join(' · ') || 'Sin marca/modelo registrado'}
                    </p>
                  </div>
                  <BadgeEstadoEquipo estado={equipo.estado} />
                </div>

                <div
                  style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem',
                    borderTop: '1px solid var(--color-surface-700)',
                  }}
                >
                  <MiniField label="# de Serie" value={equipo.serie} mono />
                  <MiniField label="# de Activo" value={equipo.codigo_institucional} mono />
                  <MiniField label="Registro INVIMA" value={equipo.registro_invima} />
                </div>

                {equipo.clasificacion_riesgo && (
                  <div style={{ marginTop: '1rem' }}>
                    <BadgeRiesgo riesgo={equipo.clasificacion_riesgo} />
                  </div>
                )}
              </div>

              {/* Ubicación — el destino principal del QR */}
              <div
                className="card"
                style={{
                  background: 'linear-gradient(135deg, var(--color-keralty-600), var(--color-keralty-700))',
                  border: 'none', color: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', opacity: 0.9 }}>
                  <MapPin size={18} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ubicación actual del equipo
                  </span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {equipo.ubicacion_detalle || equipo.area || 'Ubicación no especificada'}
                </div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <Building2 size={15} />
                  {equipo.sede?.nombre ?? 'Sede no registrada'}
                  {equipo.area && ` · ${equipo.area}`}
                  {equipo.sede?.ciudad && ` · ${equipo.sede.ciudad}`}
                </div>
              </div>

              {/* Documentación */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <FileText size={16} style={{ color: 'var(--color-keralty-600)' }} />
                  <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Documentación del equipo</h3>
                </div>

                {!equipo.documentos || equipo.documentos.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Aún no hay documentos indexados para este equipo.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {equipo.documentos.map((doc) => {
                      const estado = calcularEstadoAlerta(doc.vence_el)
                      return (
                        <div
                          key={doc.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                            padding: '0.625rem 0.75rem', borderRadius: 8,
                            border: '1px solid var(--color-surface-700)', flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.nombre}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                              {doc.tipo.replace('_', ' ')}
                              {doc.fecha_documento && ` · ${formatFecha(doc.fecha_documento)}`}
                              {doc.vence_el && ` · Vence ${formatFecha(doc.vence_el)}`}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {doc.vence_el && <BadgeEstadoAlerta estado={estado} />}
                            {doc.drive_file_id && (
                              <a
                                href={`https://drive.google.com/file/d/${doc.drive_file_id}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  fontSize: '0.8125rem', color: 'var(--color-keralty-700)', fontWeight: 500,
                                }}
                              >
                                Abrir <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Nota de cumplimiento */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0 0.25rem' }}>
                <ShieldCheck size={14} style={{ color: 'var(--color-text-soft)', marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-soft)', lineHeight: 1.5 }}>
                  Vista pública de solo lectura conforme a la Resolución 3100 de 2019 y la Ley 1581 de 2012 (Habeas Data).
                  No se muestran datos de contratos, proveedores ni información del personal responsable.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function MiniField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '0.875rem', fontWeight: 600,
          fontFamily: mono ? 'var(--font-mono)' : undefined,
          color: mono ? 'var(--color-keralty-700)' : 'var(--color-text)',
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  )
}
