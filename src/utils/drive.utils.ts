/**
 * Extrae el folder ID de una URL de Google Drive.
 * Soporta formatos:
 *   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
 *   https://drive.google.com/drive/u/0/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
 */
export function extraerDriveFolderId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}

/**
 * Construye la URL de Google Drive a partir del folder ID
 */
export function buildDriveUrl(folderId: string | null | undefined): string | null {
  if (!folderId) return null
  return `https://drive.google.com/drive/folders/${folderId}`
}

/**
 * Extrae file ID de URL de archivo en Drive
 */
export function extraerDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  return match?.[1] ?? null
}
