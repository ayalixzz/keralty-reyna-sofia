import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, QrCode, Settings,
  Stethoscope, LogOut, ChevronLeft, ChevronRight,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { useAlertas } from '@/hooks/useAlertas'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  soloAdmin?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Tablero',   icon: <LayoutDashboard size={18} /> },
  { to: '/equipos',   label: 'Equipos',   icon: <Search size={18} /> },
  { to: '/qr',        label: 'Códigos QR', icon: <QrCode size={18} /> },
  { to: '/admin',     label: 'Administración', icon: <Settings size={18} />, soloAdmin: true },
]

export function Sidebar() {
  const { usuario, logout } = useAuthStore()
  const { sidebarAbierto, toggleSidebar } = useUIStore()
  const { vencidas, porVencer } = useAlertas(30)
  const totalAlertas = vencidas.length + porVencer.length

  return (
    <aside
      className="sidebar"
      style={{
        width: sidebarAbierto ? 240 : 64,
        transition: 'width 250ms ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--color-sidebar-border)',
          minHeight: 64,
        }}
      >
        <span
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-keralty-600), var(--color-keralty-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Stethoscope size={18} color="#fff" />
        </span>
        {sidebarAbierto && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', whiteSpace: 'nowrap' }}>
              MedTrack
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-sidebar-text-muted)', whiteSpace: 'nowrap' }}>
              Keralty · Colsanitas
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {sidebarAbierto && (
          <p className="section-title" style={{ marginBottom: '0.5rem' }}>Menú</p>
        )}
        {NAV_ITEMS.map((item) => {
          if (item.soloAdmin && usuario?.rol !== 'admin') return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={!sidebarAbierto ? item.label : undefined}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {sidebarAbierto && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
              {item.to === '/dashboard' && totalAlertas > 0 && sidebarAbierto && (
                <span
                  style={{
                    marginLeft: 'auto', background: 'var(--color-danger-500)',
                    color: '#fff', fontSize: '0.6875rem', fontWeight: 700,
                    padding: '1px 6px', borderRadius: 9999,
                  }}
                >
                  {totalAlertas}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User + toggle */}
      <div style={{ borderTop: '1px solid var(--color-sidebar-border)', padding: '0.75rem 0.5rem' }}>
        {/* Alertas rápidas */}
        {sidebarAbierto && totalAlertas > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: '0.5rem',
              background: 'rgba(248,81,73,0.1)',
            }}
          >
            <Bell size={14} color="var(--color-danger-400)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger-400)' }}>
              {vencidas.length} vencidas, {porVencer.length} por vencer
            </span>
          </div>
        )}

        {/* Perfil */}
        {sidebarAbierto && usuario && (
          <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-sidebar-text)' }}>
              {usuario.nombre ?? usuario.email}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-sidebar-text-muted)', textTransform: 'capitalize' }}>
              {usuario.rol}
            </div>
          </div>
        )}

        <button className="nav-item" onClick={() => void logout()} title="Cerrar sesión">
          <LogOut size={18} />
          {sidebarAbierto && 'Cerrar sesión'}
        </button>

        {/* Toggle */}
        <button
          className="nav-item"
          onClick={toggleSidebar}
          style={{ marginTop: '0.25rem' }}
          title={sidebarAbierto ? 'Colapsar' : 'Expandir'}
        >
          {sidebarAbierto ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          {sidebarAbierto && 'Colapsar menú'}
        </button>
      </div>
    </aside>
  )
}
