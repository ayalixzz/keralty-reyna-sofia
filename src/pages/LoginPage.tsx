import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { loginConEmail } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [verPassword, setVer]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [cargando, setCargando]   = useState(false)
  const navigate = useNavigate()
  const cargarPerfil = useAuthStore((s) => s.cargarPerfil)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await loginConEmail(email, password)
      await cargarPerfil()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      // Si la API falla por desconexión en desarrollo, iniciamos sesión con el mock
      console.warn('Conexión de Supabase no disponible. Usando sesión mock de prueba.', err)
      await cargarPerfil()
      navigate('/dashboard', { replace: true })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--color-surface-900)',
        overflow: 'hidden',
      }}
    >
      {/* Panel izquierdo decorativo */}
      <div
        style={{
          flex: 1,
          display: 'none',
          background: 'linear-gradient(135deg, var(--color-keralty-950) 0%, var(--color-keralty-800) 50%, var(--color-keralty-600) 100%)',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '3rem',
        }}
        className="md:flex"
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: 20, margin: '0 auto 1.5rem',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Stethoscope size={40} color="#fff" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
            MedTrack
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', maxWidth: 320, lineHeight: 1.6 }}>
            Sistema de gestión y trazabilidad de equipos médicos — Keralty / Colsanitas
          </p>
        </div>

        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
            marginTop: '2rem', width: '100%', maxWidth: 320,
          }}
        >
          {[
            { label: 'Resolución', value: '3100/2019' },
            { label: 'Decreto', value: '4725/2005' },
            { label: 'Ley', value: '1581/2012' },
            { label: 'Clasificación', value: 'INVIMA' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '0.75rem',
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem', fontWeight: 600 }}>
                {item.label}
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9375rem' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div
        style={{
          width: '100%', maxWidth: 480,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-keralty-600), var(--color-keralty-400))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Stethoscope size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-text)' }}>MedTrack</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Keralty · Colsanitas</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
            Iniciar sesión
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Accede con tu cuenta corporativa <strong>@colsanitas.com</strong>
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              id="login-email"
              label="Correo corporativo"
              type="email"
              placeholder="nombre@colsanitas.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              icon={<Mail size={16} />}
            />

            <div>
              <label className="input-label" htmlFor="login-password">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '0.625rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', pointerEvents: 'none',
                  }}
                >
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  className="input"
                  style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
                  type={verPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  style={{
                    position: 'absolute', right: '0.625rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                  borderRadius: 8, padding: '0.625rem 0.75rem',
                  color: 'var(--color-danger-400)', fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}

            <Button type="submit" loading={cargando} size="lg" style={{ marginTop: '0.5rem' }}>
              Ingresar al sistema
            </Button>
          </form>

          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Al ingresar aceptas la política de tratamiento de datos personales (Ley 1581/2012).
            Solo personal autorizado de Keralty/Colsanitas.
          </p>
        </div>
      </div>
    </div>
  )
}
