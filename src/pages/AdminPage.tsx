import { useState, useEffect, useRef } from 'react'
import { Check, AlertTriangle, Upload, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { getUsuarios, actualizarRol, actualizarNotificaciones } from '@/api/auth.api'
import { importarExcel, type ResultadoImportacion } from '@/api/importacion.api'
import type { Usuario, RolUsuario } from '@/types/app.types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'

export function AdminPage() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)

  const [archivo, setArchivo]         = useState<File | null>(null)
  const [hoja, setHoja]               = useState('Hoja 1')
  const [importando, setImportando]   = useState(false)
  const [errorImport, setErrorImport] = useState<string | null>(null)
  const [resultado, setResultado]     = useState<ResultadoImportacion | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportar = async () => {
    if (!archivo) return
    setImportando(true)
    setErrorImport(null)
    setResultado(null)
    try {
      const res = await importarExcel(archivo, hoja)
      setResultado(res)
      setArchivo(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErrorImport(e instanceof Error ? e.message : 'Error importando el archivo')
    } finally {
      setImportando(false)
    }
  }

  useEffect(() => {
    let cancelado = false
    getUsuarios()
      .then((data) => { if (!cancelado) setUsuarios(data) })
      .catch((e) => { if (!cancelado) setError(e.message) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [])

  const handleCambiarRol = async (userId: string, nuevoRol: RolUsuario) => {
    setGuardando(userId)
    try {
      await actualizarRol(userId, nuevoRol)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: nuevoRol } : u))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error actualizando rol')
    } finally {
      setGuardando(null)
    }
  };

  const handleToggleNotif = async (userId: string, actual: boolean) => {
    setGuardando(userId)
    try {
      await actualizarNotificaciones(userId, !actual)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, notificaciones_email: !actual } : u))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error actualizando notificaciones')
    } finally {
      setGuardando(null)
    }
  }

  if (cargando) return <PageSpinner />

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administración de Usuarios</h1>
          <p className="page-subtitle">Gestiona los permisos y notificaciones del personal asistencial y técnico</p>
        </div>
      </div>

      {error && (
        <div className="alert-item alert-vencida">
          <AlertTriangle size={20} />
          <div>
            <strong>Error de conexión</strong>
            <p style={{ fontSize: '0.875rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Importación de inventario desde Excel */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <FileSpreadsheet size={16} style={{ color: 'var(--color-keralty-600)' }} />
          <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Importar inventario desde Excel</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Sube el archivo actualizado y el sistema agrega los equipos nuevos y actualiza los existentes (por número de serie). No borra nada.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 260px' }}>
            <label className="input-label" htmlFor="excel-file">Archivo (.xlsx)</label>
            <input
              id="excel-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input"
              style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </div>
          <div style={{ width: 160 }}>
            <Input
              id="excel-sheet"
              label="Hoja"
              value={hoja}
              onChange={(e) => setHoja(e.target.value)}
            />
          </div>
          <Button
            icon={<Upload size={16} />}
            disabled={!archivo}
            loading={importando}
            onClick={() => void handleImportar()}
          >
            Importar
          </Button>
        </div>

        {errorImport && (
          <div className="alert-item alert-vencida" style={{ marginTop: '1rem' }}>
            <AlertTriangle size={18} />
            <p style={{ fontSize: '0.875rem' }}>{errorImport}</p>
          </div>
        )}

        {resultado && (
          <div className="alert-item alert-vigente" style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} />
              <strong style={{ fontSize: '0.875rem' }}>Importación completada</strong>
            </div>
            <p style={{ fontSize: '0.8125rem' }}>
              {resultado.equiposImportados} equipos · {resultado.sedes} sedes · {resultado.proveedores} proveedores · {resultado.mantenimientos} registros de calibración
              {resultado.omitidas > 0 && ` · ${resultado.omitidas} filas omitidas (serie/nombre/sede inválidos)`}
            </p>
            {resultado.detalleOmitidas.length > 0 && (
              <details style={{ fontSize: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  Ver primeras {resultado.detalleOmitidas.length} filas omitidas
                </summary>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                  {resultado.detalleOmitidas.map((o, i) => (
                    <li key={i}>Fila {o.fila} — {o.equipo || o.serie || 's/n'}: {o.motivo}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre de Usuario</th>
              <th>Correo Electrónico</th>
              <th>Rol / Permisos</th>
              <th>Alertas por Correo</th>
              <th>Estado Guardado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nombre ?? 'Sin nombre asignado'}</td>
                <td><code style={{ fontSize: '0.8125rem' }}>{u.email}</code></td>
                <td>
                  <select
                    className="input"
                    style={{ width: 140, cursor: 'pointer' }}
                    value={u.rol}
                    disabled={guardando === u.id}
                    onChange={(e) => void handleCambiarRol(u.id, e.target.value as RolUsuario)}
                  >
                    <option value="lector">Lector (Consulta)</option>
                    <option value="editor">Editor (Técnico)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={u.notificaciones_email}
                      disabled={guardando === u.id}
                      onChange={() => void handleToggleNotif(u.id, u.notificaciones_email)}
                    />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {u.notificaciones_email ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                </td>
                <td>
                  {guardando === u.id ? (
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <span style={{ color: 'var(--color-success-400)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                      <Check size={12} /> Guardado
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  No hay usuarios registrados en la base de datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
