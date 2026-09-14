import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Édition inline — Démarrage rapide | Nexora Docs',
  description: 'Modifiez du code directement dans votre éditeur à partir d\'instructions en langage naturel avec Nexora',
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-8">
      <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-foreground/70 text-sm font-bold">{n}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-base mb-2">{title}</h3>
        <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info:    'bg-sky-500/10 border-sky-500/25 text-sky-300',
    warning: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    tip:     'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  }
  const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' }
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm mb-4 leading-relaxed ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>{children}
    </div>
  )
}

export default function EditQuickStartPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Édition inline</span>
        <span>/</span>
        <span className="text-foreground">Démarrage rapide</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Édition inline — Démarrage rapide</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        L'édition inline modifie une sélection de code directement dans votre fichier, sans ouvrir le panneau Chat — pratique pour un renommage, une correction ou une petite réécriture localisée.
      </p>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Utilisation</h2>

      <Step n={1} title="Sélectionner le code à modifier">
        <p>
          Sélectionnez les lignes concernées dans votre éditeur. Vous pouvez aussi lancer l'édition sans sélection : Nexora prend alors la ligne courante comme point de départ.
        </p>
      </Step>

      <Step n={2} title="Ouvrir l'édition inline">
        <p>Avec la sélection active, appuyez sur :</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-3 text-sm">
            <kbd className="px-2 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono text-foreground min-w-fit">Ctrl+I</kbd>
            <span className="text-muted-foreground">Windows / Linux</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <kbd className="px-2 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs font-mono text-foreground min-w-fit">Cmd+I</kbd>
            <span className="text-muted-foreground">macOS</span>
          </div>
        </div>
        <p className="mt-2">Un champ de saisie apparaît directement dans l'éditeur, au-dessus du code sélectionné.</p>
      </Step>

      <Step n={3} title="Décrire la modification">
        <p>
          Tapez l'instruction en langage naturel — « extrait cette logique dans une fonction », « ajoute la gestion d'erreur », « traduis les commentaires en français » — puis validez avec <kbd className="px-1.5 py-0.5 bg-white/[0.08] border border-border/60 rounded text-xs text-foreground font-mono">Entrée</kbd>.
        </p>
      </Step>

      <Step n={4} title="Accepter ou rejeter le résultat">
        <p>
          Le code proposé s'affiche directement dans l'éditeur, en surbrillance (ajouts en vert, suppressions en rouge). Utilisez les boutons qui apparaissent pour accepter ou rejeter — bloc par bloc si plusieurs changements sont proposés, ou globalement.
        </p>
        <Callout type="tip">
          Rien n'est appliqué à votre fichier tant que vous n'avez pas accepté : vous pouvez toujours fermer la suggestion sans conséquence.
        </Callout>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-4">Édition inline ou mode Agent ?</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        L'édition inline reste dans un seul fichier et un seul échange — idéale pour une modification ciblée et rapide. Pour une tâche qui touche plusieurs fichiers, exécute des commandes, ou demande d'explorer le projet, utilisez plutôt le <Link href="/docs/agent/quick-start" className="text-foreground/70 hover:underline">mode Agent</Link>.
      </p>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/agent/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Mode Agent
        </Link>
        <Link href="/docs/guides/codebase-documentation-awareness" className="text-foreground/70 hover:text-foreground transition-colors">
          Guide : Documentation projet →
        </Link>
      </div>
    </article>
  )
}
