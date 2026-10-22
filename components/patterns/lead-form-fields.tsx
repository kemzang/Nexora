'use client'

import { findCountry } from '@/lib/countries'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Briques de formulaire partagees par les pages Enterprise et start-up.
 *
 * Les deux formulaires posent des questions differentes mais ont la meme
 * mecanique : champs obligatoires marques, aide sous le champ, erreur serveur
 * affichee au meme endroit. Les factoriser evite que l'un derive de l'autre.
 */

export function Field({
  label, hint, required, children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

export function TextField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string },
) {
  const { label, hint, required, ...rest } = props
  return (
    <Field label={label} hint={hint} required={required}>
      <Input required={required} {...rest} />
    </Field>
  )
}

export function SelectField({
  label, hint, required, value, onChange, options, placeholder,
}: {
  label: string
  hint?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint} required={required}>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <option value="">{placeholder ?? 'Select…'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  )
}

export function TextArea({
  label, hint, required, value, onChange, rows = 4, placeholder,
}: {
  label: string
  hint?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint} required={required}>
      <textarea
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-ring resize-y"
      />
    </Field>
  )
}

export function CheckGroup({
  label, hint, options, selected, onToggle,
}: {
  label: string
  hint?: string
  /**
   * `desc` explique ce que l'option engage. Les intitules du formulaire
   * Enterprise — « SSO / SAML », « Data residency » — sont du jargon de
   * decideur technique : quelqu'un qui remplit le formulaire sans savoir ce
   * qu'ils recouvrent coche au hasard, ou ne coche rien. Dans les deux cas
   * la demande arrive moins exploitable.
   */
  options: { value: string; label: string; desc?: string }[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              // L'explication est aussi dans `title` : au survol sur un
              // ordinateur, et lue par les lecteurs d'ecran.
              title={o.desc}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                on
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

/**
 * Champ piege. Invisible et hors du flux de tabulation pour un humain, mais
 * rempli par la plupart des robots qui completent tous les champs d'un
 * formulaire. Le serveur accepte alors la requete sans rien enregistrer.
 */
export function Honeypot({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        Website URL
        <input
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  )
}

/**
 * Champ telephone, avec l'indicatif du pays choisi.
 *
 * L'indicatif est affiche a gauche plutot que pre-rempli dans le champ :
 * pre-remplir conduit a le voir efface par un copier-coller, ou double
 * quand la personne retape le sien. Ici il ne fait pas partie de la saisie.
 *
 * Tant qu'aucun pays n'est choisi, le champ est desactive : sans pays on ne
 * sait ni quel indicatif attendre, ni combien de chiffres.
 */
export function PhoneField({
  country, value, onChange, error,
}: {
  country: string
  value: string
  onChange: (v: string) => void
  error?: string | null
}) {
  const c = findCountry(country)
  return (
    <Field label="Phone" hint={error ?? undefined}>
      <div className="flex items-stretch gap-2">
        <span
          className={`flex items-center gap-1.5 px-3 rounded-lg border text-sm whitespace-nowrap ${
            c ? 'border-border text-foreground' : 'border-border/50 text-muted-foreground'
          }`}
        >
          {c ? <>{c.flag} +{c.dial}</> : '—'}
        </span>
        <input
          type="tel"
          inputMode="tel"
          value={value}
          disabled={!c}
          onChange={(e) => onChange(e.target.value)}
          placeholder={c ? 'Phone number' : 'Select a country first'}
          aria-invalid={!!error}
          className={`flex-1 min-w-0 bg-transparent border rounded-lg px-3 py-2 text-sm outline-none transition-colors disabled:opacity-50 ${
            error
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-border focus:border-foreground/40'
          }`}
        />
      </div>
    </Field>
  )
}
