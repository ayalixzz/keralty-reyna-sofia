import {
  Activity, AlertTriangle, CheckCircle, Clock,
  Package, Building2, TrendingUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAlertas } from '@/hooks/useAlertas'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { BadgeEstadoAlerta } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatFecha, diasHastaVencimiento } from '@/utils/date.utils'
import { useNavigate } from 'react-router-dom'

const COLORES_PROPIEDAD = {
  propio:    'var(--color-keralty-500)',
  contrato:  'var(--color-warning-400)',
  proveedor: 'var(--color-surface-400)',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { stats, cargando: cargandoStats } = useDashboardStats()
  const { alertas, vencidas, porVencer, cargando: cargandoAl } = useAlertas(60)

  if (cargandoStats || cargandoAl) return <PageSpinner />

  const porSedeGrafica = stats.por_sede.map((s) => ({
    sede: s.sede.replace('CLÍNICA ', '').replace('CLINICA ', '').slice(0, 20),
    total: s.total,
  }))

  const pieData = [
    { name: 'Propio', value: stats.propio,    fill: COLORES_PROPIEDAD.propio },
    { name: 'Contrato', value: stats.contrato, fill: COLORES_PROPIEDAD.contrato },
    { name: 'Proveedor', value: stats.proveedor, fill: COLORES_PROPIEDAD.proveedor },
  ].filter((d) => d.value > 0)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tablero de control</h1>
          <p className="page-subtitle">Resumen de equipos médicos · Keralty / Colsanitas</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard
          label="Total equipos"
          value={stats.total}
          icon={<Package size={22} />}
          color="var(--color-keralty-600)"
        />
        <StatCard
          label="Activos"
          value={stats.activos}
          icon={<Activity size={22} />}
          color="var(--color-success-400)"
        />
        <StatCard
          label="En mantenimiento"
          value={stats.en_mantenimiento}
          icon={<Clock size={22} />}
          color="var(--color-warning-400)"
        />
        <StatCard
          label="Calibraciones vencidas"
          value={vencidas.length}
          icon={<AlertTriangle size={22} />}
          color="var(--color-danger-400)"
          alerta={vencidas.length > 0}
        />
        <StatCard
          label="Por vencer (60 días)"
          value={porVencer.length}
          icon={<TrendingUp size={22} />}
          color="var(--color-warning-400)"
        />
        <StatCard
          label="Sedes"
          value={stats.sedes_total}
          icon={<Building2 size={22} />}
          color="var(--color-keralty-600)"
        />
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
        {/* Pie propiedad */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>
            Por tipo de propiedad
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-700)', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: 'var(--color-text)' }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar por sede */}
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>
            Equipos por sede (top 8)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porSedeGrafica} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="sede"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-700)', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: 'var(--color-text)' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar
                dataKey="total"
                fill="var(--color-keralty-600)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
            Alertas de calibración / mantenimiento
          </h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Próximos 60 días
          </span>
        </div>

        {alertas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p>No hay alertas pendientes</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alertas.slice(0, 20).map((alerta, idx) => {
              const dias = diasHastaVencimiento(alerta.proximo_vencimiento)
              return (
                <div
                  key={alerta.id}
                  className={`alert-item alert-${alerta.estado_calibracion} stagger-item`}
                  style={{ cursor: 'pointer', animationDelay: `${idx * 35}ms` }}
                  onClick={() => navigate(`/equipos/${encodeURIComponent(alerta.serie)}`)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {alerta.nombre}
                      <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.8125rem' }}>
                        · Serie: {alerta.serie}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                      {alerta.sede} · {alerta.tipo} · Vence: {formatFecha(alerta.proximo_vencimiento)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <BadgeEstadoAlerta estado={alerta.estado_calibracion} />
                    {dias !== null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {dias < 0
                          ? `Vencida hace ${Math.abs(dias)} días`
                          : `${dias} días restantes`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* Componente local */
function StatCard({
  label, value, icon, color, alerta = false,
}: { label: string; value: number; icon: React.ReactNode; color: string; alerta?: boolean }) {
  return (
    <div
      className="stat-card"
      style={alerta && value > 0 ? { borderColor: 'var(--color-danger-500)' } : {}}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="stat-value" style={alerta && value > 0 ? { color: 'var(--color-danger-400)' } : {}}>
          {value.toLocaleString('es-CO')}
        </span>
        <span style={{ color, opacity: 0.8 }}>{icon}</span>
      </div>
      <span className="stat-label">{label}</span>
    </div>
  )
}
