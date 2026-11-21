'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Check, Copy, ArrowRight, Terminal } from 'lucide-react'
import { GlassCard } from './ui/glass-card'
import { Badge } from './ui/badge'
import { SectionLayout } from './patterns/section-layout'

type Lang = 'fr' | 'en' | 'es' | 'pt'

function VSCodeLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M75.5 11.5 50 35 28 18.5 18 23l18 18-18 18 10 4.5L50 47l25.5 23.5L88 65V18z"
        fill="#0098FF"
      />
      <path d="M75.5 11.5 50 35 28 18.5 18 23l18 18-18 18 10 4.5L50 47l25.5 23.5L88 65V18z" fill="url(#vsc)" />
      <defs>
        <linearGradient id="vsc" x1="53" y1="11" x2="53" y2="71" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0098FF" />
          <stop offset="1" stopColor="#0067C0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * Le vrai logo JetBrains.
 *
 * Le precedent etait un dessin approximatif : un carre aux couleurs de la
 * marque avec une lettre qui se lisait « P ». Celui-ci est le trace
 * officiel (carre degrade, « JET BRAINS » en reserve, barre basse). Le
 * rectangle blanc est dessine DERRIERE le trace : les lettres sont des
 * ajours, sans lui elles prendraient la couleur de la carte.
 */
function JetBrainsLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="#fff" />
      <path fill="url(#jb)" d="M7.529 8.753h-.705v.941h.706c.376 0 .565-.188.565-.471-.001-.329-.236-.47-.566-.47zm-3.2.282c0-.235-.188-.329-.471-.329h-.705v.706h.659c.329-.047.517-.141.517-.377zm6.212 1.13h.847l-.423-1.083zm-6.588 0h-.847v.706h.847c.329 0 .518-.141.518-.376s-.189-.33-.518-.33zM0 0v24h24V0H0zm8.424 3.012h3.435v.941h-1.176v2.965H9.6V3.953H8.424v-.941zm-.236 0v.894h-2.07v.612H8v.847H6.118v.612h2.118v.941H5.082l-.047-3.906h3.153zm-2.635 7.623c0 .659-.565 1.082-1.459 1.082H2.071V7.812h2.023c.471 0 .847.141 1.082.329.142.141.236.377.236.659 0 .471-.235.706-.612.894.471.141.753.424.753.941zM2.682 5.647c.188.235.376.376.612.376.282 0 .424-.188.424-.565V2.965H4.8v2.494c0 .471-.141.847-.376 1.082s-.612.377-1.083.377c-.706.047-1.082-.236-1.364-.612l.705-.659zm8.377 15.341H2.071v-1.506h8.988v1.506zm.894-9.223l-.282-.706h-1.506l-.282.706h-1.13l.02-.047h-.679l-.8-1.176h-.47v1.176H5.741V7.812h1.835c.612 0 .988.141 1.271.424.235.235.329.518.329.894 0 .612-.329.988-.8 1.224l.605.878 1.465-3.419h1.035l1.647 3.953h-1.175zm2.4-.047h-1.082V7.812h1.082v3.906zm3.953 0h-.941L15.718 9.6v2.165h-1.082V7.812h.988l1.6 2.071V7.812h1.082v3.906zm1.929.047a2.488 2.488 0 0 1-1.835-.612l.612-.706c.376.329.8.471 1.271.471.282 0 .471-.094.471-.282s-.141-.235-.659-.376c-.847-.188-1.459-.424-1.459-1.224 0-.706.565-1.271 1.506-1.271.659 0 1.176.188 1.6.518l-.565.753c-.377-.236-.753-.377-1.083-.377-.282 0-.376.094-.376.235 0 .188.141.235.659.376.894.188 1.459.471 1.459 1.224-.001.8-.612 1.271-1.601 1.271z" />
      <defs>
        <linearGradient id="jb" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FE2857" />
          <stop offset="0.5" stopColor="#B24EFF" />
          <stop offset="1" stopColor="#21D789" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function NexoraMark({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-primary flex items-center justify-center ${className}`}>
      <span className="text-primary-foreground font-bold tracking-tight select-none" style={{ fontSize: '1.4em' }}>N</span>
    </div>
  )
}

const DICT: Record<Lang, {
  badge: string
  title: string
  subtitle: string
  vscodeDesc: string
  vscodeCta: string
  jetbrainsDesc: string
  jetbrainsCta: string
  jetbrainsSub: string
  cliSub: string
  comingSoon: string
  cliDesc: string
  cliHint: string
  copied: string
}> = {
  fr: {
    badge: 'Disponible partout',
    title: 'Une seule IA, dans tous tes outils',
    subtitle: 'Installe Nexora là où tu codes — VS Code, toute la suite JetBrains, ou directement en ligne de commande.',
    vscodeDesc: 'Chat IA, autocomplétion, mode agent et édition multi-fichiers, intégrés à ton éditeur préféré.',
    vscodeCta: 'Installer sur VS Code',
    jetbrainsDesc: 'Un seul plugin pour IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, GoLand, Rider, CLion et plus.',
    jetbrainsCta: 'JetBrains Marketplace',
    jetbrainsSub: 'Toute la suite',
    cliSub: 'Ligne de commande',
    comingSoon: 'Bientôt disponible',
    cliDesc: 'L\'agent Nexora directement dans ton terminal — idéal pour les scripts, le CI/CD et les serveurs distants.',
    cliHint: 'Installe en une commande',
    copied: 'Copié !',
  },
  en: {
    badge: 'Available everywhere',
    title: 'One AI, across all your tools',
    subtitle: 'Install Nexora wherever you code — VS Code, the entire JetBrains suite, or right in your terminal.',
    vscodeDesc: 'AI chat, autocomplete, agent mode and multi-file editing, built into your favorite editor.',
    vscodeCta: 'Install on VS Code',
    jetbrainsDesc: 'One plugin for IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, GoLand, Rider, CLion and more.',
    jetbrainsCta: 'JetBrains Marketplace',
    jetbrainsSub: 'The whole suite',
    cliSub: 'Command line',
    comingSoon: 'Coming soon',
    cliDesc: 'The Nexora agent right in your terminal — perfect for scripts, CI/CD and remote servers.',
    cliHint: 'Install in one command',
    copied: 'Copied!',
  },
  es: {
    badge: 'Disponible en todas partes',
    title: 'Una sola IA, en todas tus herramientas',
    subtitle: 'Instala Nexora donde programes — VS Code, toda la suite JetBrains, o directamente en tu terminal.',
    vscodeDesc: 'Chat IA, autocompletado, modo agente y edición multiarchivo, integrados en tu editor favorito.',
    vscodeCta: 'Instalar en VS Code',
    jetbrainsDesc: 'Un solo plugin para IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, GoLand, Rider, CLion y más.',
    jetbrainsCta: 'JetBrains Marketplace',
    jetbrainsSub: 'Toda la suite',
    cliSub: 'Línea de comandos',
    comingSoon: 'Próximamente',
    cliDesc: 'El agente Nexora en tu terminal — ideal para scripts, CI/CD y servidores remotos.',
    cliHint: 'Instala con un comando',
    copied: '¡Copiado!',
  },
  pt: {
    badge: 'Disponível em todo lugar',
    title: 'Uma IA, em todas as suas ferramentas',
    subtitle: 'Instale o Nexora onde você programa — VS Code, toda a suíte JetBrains, ou direto no terminal.',
    vscodeDesc: 'Chat IA, autocompletar, modo agente e edição multiarquivo, integrados ao seu editor favorito.',
    vscodeCta: 'Instalar no VS Code',
    jetbrainsDesc: 'Um único plugin para IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, GoLand, Rider, CLion e mais.',
    jetbrainsCta: 'JetBrains Marketplace',
    jetbrainsSub: 'Toda a suíte',
    cliSub: 'Linha de comandos',
    comingSoon: 'Em breve',
    cliDesc: 'O agente Nexora no seu terminal — ideal para scripts, CI/CD e servidores remotos.',
    cliHint: 'Instale com um comando',
    copied: 'Copiado!',
  },
}

const JETBRAINS_IDES = [
  'IntelliJ IDEA', 'PyCharm', 'WebStorm', 'PhpStorm',
  'GoLand', 'Rider', 'CLion', 'RubyMine', 'DataGrip', 'Android Studio',
]

const VSCODE_URL = 'https://marketplace.visualstudio.com/items?itemName=nexoracoding.nexora-ai'
const JETBRAINS_URL = 'https://plugins.jetbrains.com/plugin/34609-nexora'

// Promettre une installation qui mene a une page d'erreur est pire que de
// l'annoncer « bientot » : ces drapeaux ne passent a `true` que lorsque la
// place de marche sert reellement le client.
//
// Attention pour JetBrains : « approuve » ne veut pas dire « visible ». Un
// plugin approuve reste masque tant qu'il n'a pas ete publie depuis la
// fiche, et la page repond alors 404 aux visiteurs. Le plugin a ete publie
// le 22 octobre 2026, apres approbation de la 1.0.75-253.
const VSCODE_PUBLISHED = true
const JETBRAINS_PUBLISHED = true
const CLI_INSTALL = 'npm install -g @nexoracoding/cli'

export function PlatformsSection({ lang }: { lang: Lang }) {
  const t = DICT[lang] ?? DICT.fr
  const [copied, setCopied] = useState(false)

  const copyCli = () => {
    navigator.clipboard.writeText(CLI_INSTALL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <SectionLayout id="platforms">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <Badge variant="primary" className="mb-5">
          <NexoraMark className="w-3.5 h-3.5" />
          {t.badge}
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">{t.title}</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.a
          {...(VSCODE_PUBLISHED
            ? { href: VSCODE_URL, target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="group relative glass rounded-2xl border-border hover:border-[#0098FF]/40 p-7 flex flex-col transition-colors"
        >
          <div className="flex items-center gap-3 mb-5">
            <VSCodeLogo className="w-11 h-11" />
            <div>
              <h3 className="font-semibold text-foreground text-xl leading-tight">VS Code</h3>
              <p className="text-sm text-muted-foreground">Visual Studio Code</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed flex-1">{t.vscodeDesc}</p>
          <div className="mt-6 inline-flex items-center gap-1.5 text-base font-medium text-foreground/70 group-hover:gap-2.5 transition-all">
            {VSCODE_PUBLISHED ? (
              <>
                {t.vscodeCta}
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span className="text-muted-foreground">{t.comingSoon}</span>
            )}
          </div>
        </motion.a>

        <motion.a
          {...(JETBRAINS_PUBLISHED
            ? { href: JETBRAINS_URL, target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="group relative glass rounded-2xl border-border hover:border-[#B24EFF]/40 p-7 flex flex-col transition-colors"
        >
          <div className="flex items-center gap-3 mb-5">
            <JetBrainsLogo className="w-11 h-11" />
            <div>
              <h3 className="font-semibold text-foreground text-xl leading-tight">JetBrains</h3>
              <p className="text-sm text-muted-foreground">{t.jetbrainsSub}</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">{t.jetbrainsDesc}</p>
          <div className="flex flex-wrap gap-1.5 mt-4 flex-1 content-start">
            {JETBRAINS_IDES.map((ide) => (
              <span
                key={ide}
                className="px-2.5 py-0.5 rounded-md bg-muted border border-border text-sm text-muted-foreground"
              >
                {ide}
              </span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-base font-medium text-foreground/70 group-hover:gap-2.5 transition-all">
            {JETBRAINS_PUBLISHED ? (
              <>
                {t.jetbrainsCta}
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span className="text-muted-foreground">{t.comingSoon}</span>
            )}
          </div>
        </motion.a>

        <motion.div
          initial={{ opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ delay: 0.16, duration: 0.5 }}
          className="group relative glass rounded-2xl border-border hover:border-emerald-500/40 p-7 flex flex-col transition-colors"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Terminal className="w-6 h-6 text-foreground/70" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-xl leading-tight">CLI</h3>
              <p className="text-sm text-muted-foreground">{t.cliSub}</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed flex-1">{t.cliDesc}</p>
          <p className="text-sm text-muted-foreground/70 mt-5 mb-1.5">{t.cliHint}</p>
          <button
            onClick={copyCli}
            className="flex items-center justify-between gap-2 w-full rounded-lg bg-muted border border-border px-3 py-2.5 font-mono text-sm text-foreground/70 hover:border-foreground/20 transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-foreground/40">$</span>
              <span className="truncate">{CLI_INSTALL}</span>
            </span>
            {copied ? (
              <span className="flex items-center gap-1 text-foreground/70 flex-shrink-0">
                <Check className="w-3.5 h-3.5" /> {t.copied}
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </button>
        </motion.div>
      </div>
    </SectionLayout>
  )
}
