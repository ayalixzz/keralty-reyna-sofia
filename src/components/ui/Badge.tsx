import type { EstadoAlerta, PropiedadTipo, EstadoEquipo, RiesgoClasificacion } from '@/types/app.types'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ children, variant = 'gray', dot = false }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: 'currentColor', display: 'inline-block',
          }}
        />
      )}
      {children}
    </span>
  )
}

/* ── Badges semánticos ── */

export function BadgeEstadoAlerta({ estado }: { estado: EstadoAlerta }) {
  const map: Record<EstadoAlerta, { variant: BadgeVariant; label: string }> = {
    vigente:    { variant: 'green',  label: 'Vigente' },
    por_vencer: { variant: 'yellow', label: 'Por vencer' },
    vencida:    { variant: 'red',    label: 'Vencida' },
  }
  const { variant, label } = map[estado]
  return <Badge variant={variant} dot>{label}</Badge>
}

export function BadgePropiedad({ propiedad }: { propiedad: PropiedadTipo }) {
  const map: Record<PropiedadTipo, { variant: BadgeVariant; label: string }> = {
    propio:    { variant: 'blue',  label: 'Propio' },
    contrato:  { variant: 'yellow', label: 'Contrato / Comodato' },
    proveedor: { variant: 'gray',   label: 'Proveedor' },
  }
  const { variant, label } = map[propiedad]
  return <Badge variant={variant}>{label}</Badge>
}

export function BadgeEstadoEquipo({ estado }: { estado: EstadoEquipo }) {
  const map: Record<EstadoEquipo, { variant: BadgeVariant; label: string }> = {
    activo:           { variant: 'green',  label: 'Activo' },
    en_mantenimiento: { variant: 'yellow', label: 'En mantenimiento' },
    dado_de_baja:     { variant: 'red',    label: 'Dado de baja' },
  }
  const { variant, label } = map[estado]
  return <Badge variant={variant} dot>{label}</Badge>
}

export function BadgeRiesgo({ riesgo }: { riesgo: RiesgoClasificacion | null }) {
  if (!riesgo) return <Badge variant="gray">Sin clasificar</Badge>
  const map: Record<RiesgoClasificacion, BadgeVariant> = {
    I: 'green', IIA: 'blue', IIB: 'yellow', III: 'red',
  }
  return <Badge variant={map[riesgo]}>{riesgo}</Badge>
}
