import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, QrCode, Plus, FileText,
  Wrench, Calendar, MapPin, Tag, AlertTriangle, Printer,
} from 'lucide-react'
import { useEquipo } from '@/hooks/useEquipo'
import { useAuthStore } from '@/stores/auth.store'
import { registrarMantenimiento } from '@/api/mantenimientos.api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import {
  BadgeEstadoEquipo, BadgePropiedad, BadgeRiesgo, BadgeEstadoAlerta,
} from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatFecha, formatFechaLarga, calcularEstadoAlerta, diasHastaVencimiento } from '@/utils/date.utils'
import { buildDriveUrl } from '@/utils/drive.utils'
import { buildQRContent, generarQRDataUrl } from '@/utils/qr.utils'
import type { MantenimientoInsert, TipoMantenimiento } from '@/types/app.types'

export function FichaEquipoPage() {
  const { serie } = useParams<{ serie: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const { equipo, mantenimientos, documentos, cargando, error, recargar } = useEquipo(serie)

  const [modalMant, setModalMant] = useState(false)
  const [qrUrl, setQrUrl]         = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [formMant, setFormMant]   = useState<Partial<MantenimientoInsert>>({
    tipo: 'preventivo',
  })

  const puedeEditar = usuario?.rol === 'admin' || usuario?.rol === 'editor'
  const driveUrl    = buildDriveUrl(equipo?.drive_folder_id)

  const handleGenerarQR = async () => {
    if (!equipo) return
    const content  = buildQRContent(equipo.serie)
    const dataUrl  = await generarQRDataUrl(content, 300)
    setQrUrl(dataUrl)
  }

  const handleImprimirQR = () => {
    if (!qrUrl || !equipo) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR - ${equipo.serie}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;padding:2rem;font-family:system-ui">
        <h2 style="margin-bottom:0.5rem">${equipo.nombre}</h2>
        <p style="color:#666;margin-bottom:1rem">Serie: ${equipo.serie}${equipo.codigo_institucional ? ` · Activo: ${equipo.codigo_institucional}` : ''}</p>
        <img src="${qrUrl}" style="width:250px;height:250px" />
        <p style="margin-top:1rem;font-size:0.875rem;color:#888">${equipo.sede?.nombre ?? ''} · ${equipo.area ?? ''}</p>
        <script>window.print();window.close()</script>
      </body></html>
    `)
  }

  const handleGuardarMant = async () => {
    if (!equipo || !formMant.fecha || !formMant.tipo) return
    setGuardando(true)
    try {
      await registrarMantenimiento({
        equipo_id: equipo.id,
        tipo: formMant.tipo as TipoMantenimiento,
        fecha: formMant.fecha,
        responsable: formMant.responsable ?? null,
        observaciones: formMant.observaciones ?? null,
        proximo_vencimiento: formMant.proximo_vencimiento ?? null,
      })
      setModalMant(false)
      setFormMant({ tipo: 'preventivo' })
      recargar()
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <PageSpinner />

  if (error || !equipo) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Equipo no encontrado</h2>
          <p>{error ?? `No existe un equipo con serie "${serie}"`}</p>
          <Button style={{ marginTop: '1.5rem' }} onClick={() => navigate('/equipos')}>
            Volver a equipos
          </Button>
        </div>
      </div>
    )
  }

  const ultimaCalib = mantenimientos.find((m) => m.tipo === 'calibracion')
  const estadoCalib = calcularEstadoAlerta(ultimaCalib?.proximo_vencimiento)
  const diasCalib   = diasHastaVencimiento(ultimaCalib?.proximo_vencimiento)

  return (
    <div className="page-container">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--color-text-muted)', fontSize: '0.875rem', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 className="page-title">{equipo.nombre}</h1>
              <BadgeEstadoEquipo estado={equipo.estado} />
            </div>
            <p className="page-subtitle">
              Serie: <strong>{equipo.serie}</strong>
              {equipo.codigo_institucional && ` · Activo: ${equipo.codigo_institucional}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {driveUrl && (
              <a href={driveUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" icon={<ExternalLink size={16} />}>
                  Abrir en Drive
                </Button>
              </a>
            )}
            <Button variant="secondary" icon={<QrCode size={16} />} onClick={() => void handleGenerarQR()}>
              Generar QR
            </Button>
            {puedeEditar && (
              <Button icon={<Plus size={16} />} onClick={() => setModalMant(true)}>
                Registrar mantenimiento
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QR generado */}
      {qrUrl && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <img src={qrUrl} alt={`QR equipo ${equipo.serie}`} style={{ width: 140, height: 140, borderRadius: 8 }} />
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Código QR generado</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem', maxWidth: 360 }}>
              Al escanear, cualquier persona ve de inmediato la ubicación exacta y la documentación del equipo, sin necesidad de iniciar sesión.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" icon={<Printer size={16} />} onClick={handleImprimirQR}>
                Imprimir
              </Button>
              <a href={qrUrl} download={`QR_${equipo.serie}.png`}>
                <Button variant="secondary">Descargar PNG</Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Alerta calibración */}
      {ultimaCalib && estadoCalib !== 'vigente' && (
        <div className={`alert-item alert-${estadoCalib}`} style={{ padding: '1rem' }}>
          <AlertTriangle size={20} />
          <div>
            <strong>
              Calibración {estadoCalib === 'vencida' ? 'VENCIDA' : 'próxima a vencer'}
            </strong>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Vencimiento: {formatFechaLarga(ultimaCalib.proximo_vencimiento)}
              {diasCalib !== null && ` · ${Math.abs(diasCalib)} días ${diasCalib < 0 ? 'de atraso' : 'restantes'}`}
            </p>
          </div>
          <BadgeEstadoAlerta estado={estadoCalib} />
        </div>
      )}

      {/* Grid de datos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>

        {/* Identificación */}
        <div className="card">
          <SectionHeader icon={<Tag size={16} />} title="Identificación del activo" />
          <Fields>
            <Field label="Nombre"            value={equipo.nombre} />
            <Field label="Marca"             value={equipo.marca} />
            <Field label="Modelo"            value={equipo.modelo} />
            <Field label="# de Serie"        value={equipo.serie} mono />
            <Field label="# de Activo"       value={equipo.codigo_institucional} mono />
            <Field label="Registro INVIMA"   value={equipo.registro_invima} />
            <Field label="Modalidad ingreso" value={equipo.modalidad_ingreso} />
          </Fields>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <BadgePropiedad propiedad={equipo.propiedad} />
            <BadgeRiesgo riesgo={equipo.clasificacion_riesgo} />
          </div>
        </div>

        {/* Ubicación */}
        <div className="card">
          <SectionHeader icon={<MapPin size={16} />} title="Ubicación" />
          <Fields>
            <Field label="Sede"      value={equipo.sede?.nombre} />
            <Field label="Ciudad"    value={equipo.sede?.ciudad} />
            <Field label="Área"      value={equipo.area} />
            <Field label="Ubicación" value={equipo.ubicacion_detalle} />
            <Field label="Responsable biomédico" value={equipo.responsable_biomedico} />
            <Field label="Documentación física (archivo)" value={equipo.ubicacion_documentacion_fisica} mostrarVacio />
          </Fields>
        </div>

        {/* Ciclo de vida */}
        <div className="card">
          <SectionHeader icon={<Calendar size={16} />} title="Ciclo de vida" />
          <Fields>
            <Field label="Fecha adquisición"       value={formatFecha(equipo.fecha_adquisicion)} />
            <Field label="Fecha entrada en servicio" value={formatFecha(equipo.fecha_entrada_servicio)} />
            <Field label="Garantía (meses)"        value={equipo.garantia_meses?.toString()} />
            <Field label="Vida útil (años)"        value={equipo.vida_util_anios?.toString()} />
            {equipo.propiedad !== 'propio' && (
              <>
                <Field label="N° Contrato"     value={equipo.numero_contrato} />
                <Field label="Inicio contrato" value={formatFecha(equipo.contrato_inicio)} />
                <Field label="Fin contrato"    value={formatFecha(equipo.contrato_fin)} />
              </>
            )}
          </Fields>
        </div>

        {/* Calibración vigente */}
        {ultimaCalib && (
          <div className="card">
            <SectionHeader icon={<Calendar size={16} />} title="Estado de calibración" />
            <Fields>
              <Field label="Tipo"             value={ultimaCalib.tipo} />
              <Field label="Fecha"            value={formatFecha(ultimaCalib.fecha)} />
              <Field label="Próximo vencimiento" value={formatFecha(ultimaCalib.proximo_vencimiento)} />
              <Field label="Responsable"      value={ultimaCalib.responsable} />
            </Fields>
            <div style={{ marginTop: '0.75rem' }}>
              <BadgeEstadoAlerta estado={estadoCalib} />
            </div>
          </div>
        )}
      </div>

      {/* Documentos */}
      <div className="card">
        <SectionHeader icon={<FileText size={16} />} title="Documentos en Google Drive" />
        {documentos.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
            No hay documentos indexados. {driveUrl ? (
              <Link to={driveUrl} target="_blank" style={{ color: 'var(--color-keralty-700)' }}>
                Abrir carpeta en Drive
              </Link>
            ) : 'Agrega el ID de carpeta de Drive al equipo.'}
          </p>
        ) : (
          <table className="data-table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Vence</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                const estado = calcularEstadoAlerta(doc.vence_el)
                return (
                  <tr key={doc.id}>
                    <td><span style={{ textTransform: 'capitalize' }}>{doc.tipo.replace('_', ' ')}</span></td>
                    <td style={{ fontWeight: 500 }}>{doc.nombre}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{formatFecha(doc.fecha_documento)}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{formatFecha(doc.vence_el)}</td>
                    <td>{doc.vence_el ? <BadgeEstadoAlerta estado={estado} /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                    <td>
                      {doc.drive_file_id && (
                        <a
                          href={`https://drive.google.com/file/d/${doc.drive_file_id}`}
                          target="_blank" rel="noopener noreferrer"
                        >
                          <Button variant="secondary" size="sm" icon={<ExternalLink size={12} />}>
                            Abrir
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Historial de mantenimientos */}
      <div className="card">
        <SectionHeader icon={<Wrench size={16} />} title="Historial cronológico de mantenimientos" />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Resolución 3100 de 2019 — Art. 16, numeral 6
        </p>
        {mantenimientos.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Sin registros de mantenimiento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mantenimientos.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', gap: '1rem',
                  paddingLeft: '1rem',
                  borderLeft: '2px solid var(--color-surface-600)',
                  position: 'relative',
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: 'absolute', left: -5, top: 4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: i === 0 ? 'var(--color-keralty-500)' : 'var(--color-surface-500)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{m.tipo}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                      · {formatFechaLarga(m.fecha)}
                    </span>
                    {m.responsable && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                        · {m.responsable}
                      </span>
                    )}
                  </div>
                  {m.observaciones && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      {m.observaciones}
                    </p>
                  )}
                  {m.proximo_vencimiento && (
                    <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                      Próximo vencimiento: <strong>{formatFecha(m.proximo_vencimiento)}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nuevo mantenimiento */}
      <Modal
        abierto={modalMant}
        titulo="Registrar mantenimiento / calibración"
        onCerrar={() => setModalMant(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalMant(false)}>Cancelar</Button>
            <Button
              loading={guardando}
              onClick={() => void handleGuardarMant()}
              disabled={!formMant.fecha || !formMant.tipo}
            >
              Guardar registro
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            id="mant-tipo"
            label="Tipo de mantenimiento"
            options={[
              { value: 'preventivo', label: 'Preventivo' },
              { value: 'correctivo', label: 'Correctivo' },
              { value: 'calibracion', label: 'Calibración' },
            ]}
            value={formMant.tipo ?? 'preventivo'}
            onChange={(e) => setFormMant((f) => ({ ...f, tipo: e.target.value as TipoMantenimiento }))}
          />
          <Input
            id="mant-fecha"
            label="Fecha de realización"
            type="date"
            value={formMant.fecha ?? ''}
            onChange={(e) => setFormMant((f) => ({ ...f, fecha: e.target.value }))}
          />
          <Input
            id="mant-responsable"
            label="Responsable"
            placeholder="Nombre del técnico o empresa"
            value={formMant.responsable ?? ''}
            onChange={(e) => setFormMant((f) => ({ ...f, responsable: e.target.value }))}
          />
          <Input
            id="mant-proximo"
            label="Próximo vencimiento (opcional)"
            type="date"
            value={formMant.proximo_vencimiento ?? ''}
            onChange={(e) => setFormMant((f) => ({ ...f, proximo_vencimiento: e.target.value || undefined }))}
          />
          <Textarea
            id="mant-obs"
            label="Observaciones"
            placeholder="Descripción del trabajo realizado..."
            value={formMant.observaciones ?? ''}
            onChange={(e) => setFormMant((f) => ({ ...f, observaciones: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  )
}

/* Helpers de presentación */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1rem', paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--color-surface-700)',
      }}
    >
      <span style={{ color: 'var(--color-keralty-600)' }}>{icon}</span>
      <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{title}</h3>
    </div>
  )
}

function Fields({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>{children}</div>
}

function Field({
  label, value, mono = false, mostrarVacio = false,
}: { label: string; value?: string | null; mono?: boolean; mostrarVacio?: boolean }) {
  if (!value && !mostrarVacio) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      <span
        style={{
          fontSize: '0.875rem', fontWeight: 500, textAlign: 'right',
          fontFamily: mono ? 'monospace' : undefined,
          color: !value ? 'var(--color-text-soft)' : mono ? 'var(--color-keralty-700)' : undefined,
          fontStyle: !value ? 'italic' : undefined,
        }}
      >
        {value || 'Sin registrar'}
      </span>
    </div>
  )
}
