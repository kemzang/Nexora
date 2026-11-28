import { AlertTriangle, Info, Lightbulb } from 'lucide-react'

/**
 * Un encart d'avertissement, d'information ou d'astuce.
 *
 * Ce composant etait recopie a l'identique dans cinq pages de
 * documentation — octet pour octet, verifie. Deux copies de la meme
 * chose finissent toujours par diverger : la premiere retouche de
 * style n'aurait ete appliquee qu'a une page sur cinq.
 *
 * Les icones etaient des emojis (ℹ️ ⚠️ 💡). Trois raisons de les
 * remplacer par des traces vectoriels :
 *
 *  - un emoji se dessine differemment sur chaque systeme — gros et
 *    colore sous Windows, plat sous Linux, autre dessin sous macOS ;
 *  - il ne suit ni la couleur du texte ni le theme sombre, alors
 *    qu'ici l'encart EST colore par son type ;
 *  - il ne s'aligne pas sur la ligne de base, d'ou le decalage visible
 *    sur la premiere ligne de chaque encart.
 *
 * Le site utilise deja `lucide-react` dans plus de cinquante fichiers :
 * ces emojis n'etaient pas un choix, mais un oubli.
 */
const STYLES = {
  info: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
  warning: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  tip: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
} as const

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
} as const

export type CalloutType = keyof typeof STYLES

export function Callout({
  type = 'info',
  children,
}: {
  type?: CalloutType
  children: React.ReactNode
}) {
  const Icon = ICONS[type]
  return (
    <div
      className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${STYLES[type]}`}
    >
      {/*
        `mt-0.5` cale l'icone sur la premiere ligne de texte : sans lui
        elle flotte au-dessus des majuscules. `shrink-0` l'empeche de
        s'ecraser quand le texte passe a la ligne.
      */}
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
