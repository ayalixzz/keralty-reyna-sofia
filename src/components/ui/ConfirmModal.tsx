import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmModalProps {
  abierto: boolean
  titulo: string
  mensaje: string
  onConfirmar: () => void | Promise<void>
  onCancelar: () => void
  variante?: 'danger' | 'primary'
  cargando?: boolean
  textoConfirmar?: string
  textoCancelar?: string
}

export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  onConfirmar,
  onCancelar,
  variante = 'danger',
  cargando = false,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
}: ConfirmModalProps) {
  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      onCerrar={onCancelar}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancelar} disabled={cargando}>
            {textoCancelar}
          </Button>
          <Button
            variant={variante}
            onClick={() => void onConfirmar()}
            loading={cargando}
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
        {mensaje}
      </p>
    </Modal>
  )
}
