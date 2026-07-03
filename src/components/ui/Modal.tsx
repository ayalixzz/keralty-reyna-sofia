import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAX: Record<ModalSize, number> = {
  sm:  420,
  md:  560,
  lg:  720,
  xl:  960,
}

interface ModalProps {
  abierto: boolean
  titulo: string
  subtitulo?: string
  onCerrar: () => void
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Obsoleto — usar size. Se mantiene para compatibilidad. */
  maxWidth?: number
}

export function Modal({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children,
  footer,
  size = 'md',
  maxWidth,
}: ModalProps) {
  const resolvedMax = maxWidth ?? SIZE_MAX[size]

  useEffect(() => {
    if (!abierto) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [abierto, onCerrar])

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [abierto])

  if (!abierto) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div
        className="modal-panel"
        style={{ maxWidth: resolvedMax }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: '1.25rem', gap: '1rem',
          }}
        >
          <div>
            <h2 id="modal-title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>{titulo}</h2>
            {subtitulo && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {subtitulo}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar">
            <X size={16} />
          </Button>
        </div>

        {/* Body */}
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              marginTop: '1.5rem', paddingTop: '1rem',
              borderTop: '1px solid var(--color-surface-600)',
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
