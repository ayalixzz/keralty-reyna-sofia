import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const variantClass: Record<Variant, string> = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    danger:    'btn-danger',
    ghost:     'btn-ghost',
  }
  const sizeClass: Record<Size, string> = {
    sm:   'btn-sm',
    md:   '',
    lg:   'btn-lg',
    icon: 'btn-icon',
  }

  return (
    <button
      className={[
        'btn',
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'btn-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading
        ? <span className="spinner" style={{ width: 16, height: 16 }} />
        : icon ?? null}
      {children}
    </button>
  )
}
