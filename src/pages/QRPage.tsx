import { useState } from 'react'
import { Printer, Search } from 'lucide-react'
import { useEquipos } from '@/hooks/useEquipos'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { buildQRContent, generarQRDataUrl } from '@/utils/qr.utils'

export function QRPage() {
  const { equipos, cargando } = useEquipos()
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])

  const filtered = equipos.filter(
    (e) =>
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.serie.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.codigo_institucional?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const toggleSeleccion = (serie: string) => {
    setSeleccionados((prev) =>
      prev.includes(serie) ? prev.filter((s) => s !== serie) : [...prev, serie]
    )
  }

  const toggleTodos = () => {
    if (seleccionados.length === filtered.length) {
      setSeleccionados([])
    } else {
      setSeleccionados(filtered.map((e) => e.serie))
    }
  }

  const handleImprimirLote = async () => {
    if (seleccionados.length === 0) return
    const eqList = equipos.filter((e) => seleccionados.includes(e.serie))

    const win = window.open('', '_blank')
    if (!win) return

    let html = `
      <html>
      <head>
        <title>Impresión de QRs en Lote</title>
        <style>
          body { font-family: system-ui; padding: 1rem; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
          .item { border: 1px dashed #ccc; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; }
          img { width: 180px; height: 180px; }
          h3 { margin: 0.5rem 0 0.25rem 0; font-size: 1rem; text-align: center; }
          p { margin: 0; font-size: 0.75rem; color: #666; }
        </style>
      </head>
      <body>
        <div class="grid">
    `

    for (const eq of eqList) {
      const content = buildQRContent(eq.serie)
      const qrDataUrl = await generarQRDataUrl(content, 200)
      html += `
        <div class="item">
          <img src="${qrDataUrl}" />
          <h3>${eq.nombre}</h3>
          <p>Serie: ${eq.serie}</p>
          ${eq.codigo_institucional ? `<p>Activo: ${eq.codigo_institucional}</p>` : ''}
          <p style="margin-top: 0.25rem; font-size: 0.65rem;">${eq.sede?.nombre ?? ''}</p>
        </div>
      `
    }

    html += `
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `

    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Generación de Códigos QR</h1>
          <p className="page-subtitle">Genera e imprime etiquetas QR individuales o en lote</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="secondary"
            icon={<Printer size={16} />}
            disabled={seleccionados.length === 0}
            onClick={() => void handleImprimirLote()}
          >
            Imprimir seleccionados ({seleccionados.length})
          </Button>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <Input
          id="buscar-qr"
          placeholder="Filtrar por nombre, serie o activo para lote..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          icon={<Search size={16} />}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '3rem' }}>
            <PageSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>No se encontraron equipos</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={seleccionados.length === filtered.length && filtered.length > 0}
                    onChange={toggleTodos}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Equipo</th>
                <th>Serie</th>
                <th>Activo</th>
                <th>Sede / Área</th>
                <th>Destino QR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq) => (
                <tr key={eq.id} onClick={() => toggleSeleccion(eq.serie)} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(eq.serie)}
                      onChange={() => toggleSeleccion(eq.serie)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{eq.nombre}</td>
                  <td><code>{eq.serie}</code></td>
                  <td>{eq.codigo_institucional ?? '—'}</td>
                  <td>
                    <div>{eq.sede?.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{eq.area}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Vista pública MedTrack
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
