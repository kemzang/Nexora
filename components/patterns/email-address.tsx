'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * Une adresse de courriel qu'on peut toujours recuperer.
 *
 * Un lien `mailto:` seul suppose que la machine a un client mail
 * configure. Sur un poste qui n'en a pas — Linux sans Thunderbird, ou
 * Chrome sans gestionnaire de protocole — le clic ouvre « Aucune
 * application disponible » et l'utilisateur repart sans avoir pu nous
 * ecrire, en pensant que l'adresse est morte.
 *
 * Le lien reste, parce qu'il marche pour la majorite. Le bouton de copie
 * donne une issue aux autres : ils collent l'adresse dans leur webmail.
 */
export function EmailAddress({
  address,
  className = '',
}: {
  address: string
  className?: string
}) {
  const [copie, setCopie] = useState(false)

  async function copier() {
    try {
      await navigator.clipboard.writeText(address)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch {
      // Presse-papiers refuse (contexte non securise, permission): le lien
      // et le texte restent la, l'adresse est selectionnable a la main.
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={`mailto:${address}`}
        className="text-foreground underline underline-offset-4"
      >
        {address}
      </a>
      <button
        type="button"
        onClick={copier}
        aria-label={copie ? 'Address copied' : `Copy ${address}`}
        title={copie ? 'Copied' : 'Copy the address'}
        className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        {copie ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </span>
  )
}
