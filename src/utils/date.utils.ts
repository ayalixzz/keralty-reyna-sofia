import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { EstadoAlerta } from '@/types/app.types'

export function formatFecha(fecha: string | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!fecha) return '—'
  try {
    return format(parseISO(fecha), pattern, { locale: es })
  } catch {
    return fecha
  }
}

export function formatFechaLarga(fecha: string | null | undefined): string {
  return formatFecha(fecha, "d 'de' MMMM 'de' yyyy")
}

export function diasHastaVencimiento(fecha: string | null | undefined): number | null {
  if (!fecha) return null
  try {
    return differenceInDays(parseISO(fecha), new Date())
  } catch {
    return null
  }
}

export function calcularEstadoAlerta(
  proximo_vencimiento: string | null | undefined,
  umbral = 30,
): EstadoAlerta {
  const dias = diasHastaVencimiento(proximo_vencimiento)
  if (dias === null) return 'vigente'
  if (dias < 0) return 'vencida'
  if (dias <= umbral) return 'por_vencer'
  return 'vigente'
}

export function labelEstado(estado: EstadoAlerta): string {
  const map: Record<EstadoAlerta, string> = {
    vigente: 'Vigente',
    por_vencer: 'Por vencer',
    vencida: 'Vencida',
  }
  return map[estado]
}
