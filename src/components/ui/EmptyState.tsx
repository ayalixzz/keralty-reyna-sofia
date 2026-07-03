import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  titulo: string
  descripcion?: string
  accion?: ReactNode
}

export function EmptyState({ icon, titulo, descripcion, accion }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)',
      }}
    >
      {icon && (
        <div style={{ marginBottom: '1rem', opacity: 0.4, display: 'flex' }}>
          {icon}
        </div>
      )}
      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: '0.375rem' }}>
        {titulo}
      </p>
      {descripcion && (
        <p style={{ fontSize: '0.875rem', maxWidth: 360, lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {descripcion}
        </p>
      )}
      {accion && <div>{accion}</div>}
    </div>
  )
}
