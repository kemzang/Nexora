'use client'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

/**
 * Confirmation d'une action, a la place de `window.confirm`.
 *
 * La boite du navigateur est hors de notre maitrise : elle affiche le nom de
 * domaine en en-tete (« nexoracoding.com indique »), ne suit ni la police ni
 * le theme du site, et melange les langues — « Annuler » a cote de « OK »
 * selon la langue de l'ordinateur, quand notre interface est en anglais.
 * Elle bloque aussi tout le fil d'execution, et certains navigateurs la
 * suppriment purement et simplement quand l'utilisateur en a refuse une.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Colore l'action en rouge. A reserver a ce qui se repare mal. */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} description={description}>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          size="sm"
          // autoFocus sur l'action : on arrive ici en ayant deja decide, et
          // Entree doit confirmer. Echap et le clic exterieur annulent.
          autoFocus
          onClick={onConfirm}
          className={destructive ? 'bg-red-500 hover:bg-red-600 text-white' : undefined}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
