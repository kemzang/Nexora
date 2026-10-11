'use client'

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
  options: { value: string; label: string }[]
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
