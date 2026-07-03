import { useState, useEffect } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { getUsuarios, actualizarRol, actualizarNotificaciones } from '@/api/auth.api'
import type { Usuario, RolUsuario } from '@/types/app.types'
import { PageSpinner } from '@/components/ui/Spinner'

export function AdminPage() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)

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
