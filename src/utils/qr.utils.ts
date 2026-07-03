import QRCode from 'qrcode'

const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://medtrack.colsanitas.com'

/**
 * Genera el contenido del QR físico del equipo.
 * Apunta siempre a la vista pública (/u/:serie): no requiere sesión y
 * muestra de inmediato la ubicación exacta y la documentación del equipo.
 * La carpeta de Drive completa y la ficha con historial siguen disponibles
 * dentro de la app para el personal autenticado.
 */
export function buildQRContent(serie: string): string {
  return `${BASE_URL}/u/${encodeURIComponent(serie)}`
}

/** Genera el QR como Data URL PNG */
export async function generarQRDataUrl(
  content: string,
  size = 256,
): Promise<string> {
  return QRCode.toDataURL(content, {
    width: size,
    margin: 2,
    color: { dark: '#0d1117', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

/** Genera el QR como canvas (útil para impresión) */
export async function generarQRCanvas(
  content: string,
  canvas: HTMLCanvasElement,
  size = 256,
): Promise<void> {
  await QRCode.toCanvas(canvas, content, {
    width: size,
    margin: 2,
    color: { dark: '#0d1117', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}
