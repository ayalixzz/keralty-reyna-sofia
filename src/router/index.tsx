import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { lazy, Suspense } from 'react'
import { PageSpinner } from '@/components/ui/Spinner'

/* Lazy loading de páginas para code splitting */
const LoginPage       = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage   = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const EquiposPage     = lazy(() => import('@/pages/EquiposPage').then((m) => ({ default: m.EquiposPage })))
const FichaEquipoPage = lazy(() => import('@/pages/FichaEquipoPage').then((m) => ({ default: m.FichaEquipoPage })))
const QRPage          = lazy(() => import('@/pages/QRPage').then((m) => ({ default: m.QRPage })))
const AdminPage       = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const PublicoEquipoPage = lazy(() => import('@/pages/PublicoEquipoPage').then((m) => ({ default: m.PublicoEquipoPage })))

const Fallback = () => <PageSpinner />

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<Fallback />}><LoginPage /></Suspense>,
  },
  {
    /* Vista pública sin autenticación — destino del QR pegado en el equipo */
    path: '/u/:serie',
    element: <Suspense fallback={<Fallback />}><PublicoEquipoPage /></Suspense>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: 'dashboard',
            element: <Suspense fallback={<Fallback />}><DashboardPage /></Suspense>,
          },
          {
            path: 'equipos',
            element: <Suspense fallback={<Fallback />}><EquiposPage /></Suspense>,
          },
          {
            path: 'equipos/:serie',
            element: <Suspense fallback={<Fallback />}><FichaEquipoPage /></Suspense>,
          },
          {
            path: 'qr',
            element: <Suspense fallback={<Fallback />}><QRPage /></Suspense>,
          },
          {
            element: <ProtectedRoute rolesPermitidos={['admin']} />,
            children: [
              {
                path: 'admin',
                element: <Suspense fallback={<Fallback />}><AdminPage /></Suspense>,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
