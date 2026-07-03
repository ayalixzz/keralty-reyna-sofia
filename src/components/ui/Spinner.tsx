interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const SIZES = { sm: 16, md: 24, lg: 40 }

export function Spinner({ size = 'md', label = 'Cargando...' }: SpinnerProps) {
  const px = SIZES[size]
  return (
    <div
      role="status"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
    >
      <span className="spinner" style={{ width: px, height: px }} />
      {label && (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{label}</span>
      )}
    </div>
  )
}

export function PageSpinner() {
  return (
    <div
      style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', minHeight: 300,
      }}
    >
      <Spinner size="lg" />
    </div>
  )
}

/** Cubre toda la pantalla — usar durante la carga inicial de sesión. */
export function FullPageSpinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="fullpage-spinner">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
    </div>
  )
}
