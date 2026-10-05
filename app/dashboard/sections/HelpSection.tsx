'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import {
  Book, MessageCircle, Mail, Sparkles, ChevronDown, Terminal,
  Code, Zap, Key, ExternalLink, GitBranch, MessagesSquare
} from 'lucide-react'

const FAQ = [
  {
    q: 'How do I install the Nexora extension in VS Code?',
    a: 'Open VS Code, go to the Extensions tab (Ctrl+Shift+X), search for "Nexora AI" and click Install. Restart VS Code if prompted.',
  },
  {
    q: 'How do I connect my account to the extension?',
    a: 'In VS Code, open the command palette (Ctrl+Shift+P), type "Nexora: Login" and follow the instructions. You will be redirected to your browser to authenticate.',
  },
  {
    q: 'What is a credit and how is it counted?',
    a: 'A credit corresponds to one token (about 4 characters of text), weighted by the model used — more powerful models (Claude Opus, Sonnet…) consume more credits per token than economical ones (DeepSeek, Gemini Flash). Each AI request consumes credits on input (your message plus context) and on output (the generated response). The count is visible in your dashboard.',
  },
  {
    q: 'Do my unused credits carry over to the next month?',
    a: 'No. Credits reset at each monthly renewal and do not carry over from one month to the next.',
  },
  {
    q: 'How do I change plan or cancel my subscription?',
    a: 'Go to the Subscription section of your dashboard. You can upgrade your plan at any time. To cancel, email our support.',
  },
]

function FaqItem({ item }: { item: typeof FAQ[0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{item.q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HelpSection() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground text-sm mt-1">Documentation, guides and resources to get started</p>
      </div>

      {/* Quick start */}
      <Card className="glass border-border bg-gradient-to-br from-muted to-muted/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Terminal className="w-4 h-4 text-foreground/70" />
            <h2 className="font-semibold">Quick-start guide</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                icon: Code,
                title: 'Installer l\'extension',
                desc: 'Recherchez "Nexora AI" dans le marketplace VS Code',
                color: 'text-foreground/70',
                bg: 'bg-muted',
              },
              {
                step: '02',
                icon: Key,
                title: 'Create an API key',
                desc: 'Generate your key in the "API keys" tab of the dashboard',
                color: 'text-foreground/70',
                bg: 'bg-muted',
              },
              {
                step: '03',
                icon: Zap,
                title: 'Start coding',
                desc: 'Use Ctrl+Shift+P → Nexora in VS Code',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
            ].map((step) => (
              <div key={step.step} className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-border/40">
                <div className={`w-10 h-10 ${step.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <step.icon className={`w-4.5 h-4.5 ${step.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-0.5">ÉTAPE {step.step}</p>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <div>
        <h2 className="text-base font-semibold mb-4">Ressources</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Book,
              title: 'Documentation',
              desc: 'Full guides, API reference and tutorials',
              color: 'text-foreground/70',
              bg: 'bg-muted',
              hover: 'hover:border-border hover:bg-muted',
              action: 'Consulter →',
            },
            {
              icon: GitBranch,
              title: 'GitHub',
              desc: 'Extension source code and issues',
              color: 'text-foreground',
              bg: 'bg-white/[0.06]',
              hover: 'hover:border-white/[0.12] hover:bg-white/[0.04]',
              action: 'View the repo →',
            },
            {
              icon: MessagesSquare,
              title: 'Community',
              desc: 'Discord and forum with the Nexora community',
              color: 'text-foreground/70',
              bg: 'bg-muted',
              hover: 'hover:border-border hover:bg-muted',
              action: 'Join →',
            },
          ].map(item => (
            <Card key={item.title} className={`glass border-border/50 ${item.hover} transition-all cursor-pointer group hover:-translate-y-0.5`}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 mb-4 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                <span className="text-xs text-foreground/70 font-medium">{item.action}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-base font-semibold mb-4">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <FaqItem item={item} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <Card className="glass bg-gradient-to-br from-muted to-muted/50 border-border">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-9 h-9 mx-auto mb-3 text-foreground/70" />
          <h2 className="text-lg font-bold mb-1">Any other questions?</h2>
          <p className="text-muted-foreground text-sm mb-5 max-w-sm mx-auto">
            Our team is here to help. We reply within 24 hours on weekdays.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="mailto:contact@nexoracoding.com"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Send an email
            </a>
            <a
              href="#"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-border/50 hover:bg-white/[0.08] text-foreground text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat en direct
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
