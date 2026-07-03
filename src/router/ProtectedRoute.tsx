import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { PageSpinner } from '@/components/ui/Spinner'
import type { RolUsuario } from '@/types/app.types'

interface ProtectedRouteProps {
  rolesPermitidos?: RolUsuario[]
}

export function ProtectedRoute({ rolesPermitidos }: ProtectedRouteProps) {
  const { usuario, inicializado, cargando } = useAuthStore()

  if (!inicializado || cargando) return <PageSpinner />
  if (!usuario) return <Navigate to="/login" replace />
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
