import { forwardRef } from 'react'

function safeId(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/* ── Input ── */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, className = '', id, ...rest }, ref) => {
    const inputId = id ?? (label ? safeId(label) : undefined)
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <span
              style={{
                position: 'absolute', left: '0.625rem', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--color-text-muted)',
                pointerEvents: 'none', display: 'flex', alignItems: 'center',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`input ${error ? 'input-error' : ''} ${className}`}
            style={icon ? { paddingLeft: '2.25rem' } : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
        </div>
        {hint && !error && (
          <span id={`${inputId}-hint`} className="input-hint">{hint}</span>
        )}
        {error && (
          <span id={`${inputId}-error`} style={{ fontSize: '0.75rem', color: 'var(--color-danger-400)' }}>
            {error}
          </span>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

/* ── Select ── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, hint, error, options, placeholder, id, className = '', ...rest }: SelectProps) {
  const selectId = id ?? (label ? safeId(label) : undefined)
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="input-label">{label}</label>}
      <select
        id={selectId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        style={{ cursor: 'pointer' }}
        aria-invalid={!!error}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && !error && <span className="input-hint">{hint}</span>}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger-400)' }}>{error}</span>}
    </div>
  )
}

/* ── Textarea ── */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, id, className = '', ...rest }: TextareaProps) {
  const taId = id ?? (label ? safeId(label) : undefined)
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={taId} className="input-label">{label}</label>}
      <textarea
        id={taId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        style={{ resize: 'vertical', minHeight: '80px' }}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error && <span className="input-hint">{hint}</span>}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger-400)' }}>{error}</span>}
    </div>
  )
}
