import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const form = lire('app/enterprise/enterprise-client.tsx')

describe('formulaire Enterprise', () => {
  it('ferme la liste des pays', () => {
    // En champ libre on recevait « cameroun », « Cameroun » et « CMR » pour
    // un meme endroit : impossible a regrouper ou a compter.
    expect(form).toContain('COUNTRIES.map')
    expect(form).not.toMatch(/label="Country"[\s\S]{0,80}TextField/)
  })

  it('verifie le numero contre le pays choisi', () => {
    expect(form).toContain('checkPhone(')
    // Et bloque l'envoi plutot que de laisser filer un numero douteux.
    expect(form).toMatch(/if \(phoneError\)/)
  })

  it('enregistre le numero au format international', () => {
    // Sans indicatif, un numero n'est rappelable que depuis son pays.
    expect(form).toContain('toE164(f.phone, f.country)')
  })

  it('refuse un nombre de developpeurs negatif', () => {
    // `min={1}` n'empeche ni la saisie de -87 ni les fleches sous zero :
    // c'est la saisie elle-meme qui est filtree.
    expect(form).toMatch(/replace\(\/\[\^0-9\]\/g, ''\)/)
    // Et le serveur ne fait pas confiance au client.
    expect(lire('app/api/leads/enterprise/route.ts')).toContain('Math.max(1,')
  })

  it('explique ce que chaque exigence engage', () => {
    // « SSO / SAML » ou « Data residency » sont du jargon : sans explication
    // on coche au hasard, ou pas du tout.
    for (const v of ['sso', 'sla', 'invoicing', 'residency', 'onprem']) {
      const bloc = form.slice(form.indexOf(`value: '${v}'`))
      expect(bloc.slice(0, 400), `${v} sans explication`).toContain('desc:')
    }
  })

  it('n utilise plus la boite de dialogue du navigateur', () => {
    // Elle affiche le nom de domaine, ignore le theme et melange les langues.
    expect(lire('app/dashboard/sections/LeadsSection.tsx')).not.toContain('window.confirm')
  })
})
