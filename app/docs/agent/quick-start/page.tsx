import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mode Agent — Démarrage rapide | Nexora Docs',
  description: 'Déléguez des tâches de développement complètes à l\'IA avec le mode Agent de Nexora',
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

export default function AgentQuickStartPage() {
  return (
    <article className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8">
        <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
        <span>/</span>
        <span>Mode Agent</span>
        <span>/</span>
        <span className="text-foreground">Démarrage rapide</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-3">Mode Agent — Démarrage rapide</h1>
      <p className="text-muted-foreground text-base mb-8 leading-relaxed">
        Le mode Agent laisse l'IA travailler de façon autonome sur une tâche : lire vos fichiers, en créer ou en modifier plusieurs, exécuter des commandes, et vous demander votre accord avant toute action sensible.
      </p>

      <div className="h-px bg-border/50 mb-8" />

      <h2 className="text-xl font-bold mb-5">Activation</h2>

      <Step n={1} title="Choisir le mode Agent">
        <p>
          En bas du panneau Chat, à côté de la zone de saisie, cliquez sur le sélecteur de mode et choisissez <strong className="text-foreground">Agent</strong>. C'est le mode par défaut à l'ouverture de Nexora.
        </p>
        <p className="mt-2">
          Les deux autres modes : <strong className="text-foreground">Chat</strong> (conversation simple, aucune action sur vos fichiers) et <strong className="text-foreground">Plan</strong> (l'IA réfléchit et propose une marche à suivre sans encore l'exécuter).
        </p>
      </Step>

      <Step n={2} title="Décrire la tâche">
        <p>
          Donnez un objectif plutôt qu'une suite d'instructions précises — « ajoute la pagination à la liste des utilisateurs », « corrige le bug de connexion signalé dans l'issue #42 ». L'agent explore votre code, planifie les étapes et les exécute.
        </p>
      </Step>

      <Step n={3} title="Suivre la progression">
        <p>
          Pour une tâche à plusieurs étapes, une liste de tâches apparaît au-dessus de la zone de saisie et se met à jour au fil de l'exécution. Chaque modification de fichier s'affiche avec un aperçu des lignes ajoutées et supprimées, et le raisonnement de l'IA est consultable en dépliant le bandeau « Thinking ».
        </p>
      </Step>

      <Step n={4} title="Valider les actions sensibles">
        <p>
          Créer un fichier ou exécuter une commande dans le terminal déclenche toujours une demande d'autorisation, affichée juste au-dessus de la zone de saisie :
        </p>
        <div className="mt-3 space-y-1.5">
          {[
            ['Allow', 'Autorise cette action, une seule fois'],
            ['Always allow', 'Autorise ce type d’action pour le reste de la session, sans redemander'],
            ['Reject', 'Refuse et laisse l’agent proposer autre chose'],
          ].map(([action, desc]) => (
            <div key={action} className="flex items-start gap-3 text-sm">
              <span className="w-28 font-medium text-foreground/80 shrink-0">{action}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <Callout type="tip">
          Les lectures de fichiers et recherches dans le code n'ont jamais besoin d'autorisation — seules les actions qui modifient quelque chose (fichiers, terminal) en demandent une.
        </Callout>
      </Step>

      <div className="h-px bg-border/50 my-8" />

      <h2 className="text-xl font-bold mb-5">Choix du modèle</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Le modèle sélectionné en haut du Chat s'applique aussi au mode Agent — voir <Link href="/docs/chat/quick-start" className="text-foreground/70 hover:underline">le démarrage rapide du Chat</Link> pour la disponibilité par plan.
      </p>

      <Callout type="warning">
        Le mode Agent peut consommer davantage de tokens qu'une conversation Chat simple, car chaque lecture de fichier, recherche et action fait partie de l'échange avec le modèle. La consommation reste visible dans votre <a href="/dashboard" className="underline underline-offset-2">tableau de bord</a>.
      </Callout>

      <div className="h-px bg-border/50 my-8" />

      <div className="flex items-center justify-between text-sm">
        <Link href="/docs/autocomplete/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          ← Auto-complétion
        </Link>
        <Link href="/docs/edit/quick-start" className="text-foreground/70 hover:text-foreground transition-colors">
          Édition inline →
        </Link>
      </div>
    </article>
  )
}
