import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  corpsDuCourriel,
  extraireReference,
  htmlVersTexte,
  nettoyerCitation,
  referenceDepuisDestinataires,
  referenceDepuisSujet,
} from './supportInbound'

/**
 * Rattacher une reponse au bon ticket.
 *
 * Tout ce qui suit porte sur du texte venu de l'exterieur : adresses
 * reecrites par des relais, sujets traduits, citations empilees. C'est
 * exactement le genre d'entree qu'on ne devine pas depuis son bureau, d'ou
 * des cas tires de vrais clients de messagerie.
 */

describe('reference portee par les destinataires', () => {
  it('lit la reference dans la partie locale', () => {
    expect(
      referenceDepuisDestinataires([['nx-7f3k2@reply.nexoracoding.com']]),
    ).toBe('NX-7F3K2')
  })

  it('accepte un nom d affichage et des chevrons', () => {
    expect(
      referenceDepuisDestinataires([['Nexora Support <NX-7F3K2@reply.nexoracoding.com>']]),
    ).toBe('NX-7F3K2')
  })

  it('accepte un suffixe ajoute par un relais', () => {
    // Certains systemes de suivi collent « +quelquechose » a la partie
    // locale. La reference reste lisible avant le « + ».
    expect(
      referenceDepuisDestinataires([['nx-7f3k2+track9@reply.nexoracoding.com']]),
    ).toBe('NX-7F3K2')
  })

  it('cherche aussi dans cc et bcc', () => {
    // Un client qui « repond a tous » peut nous deplacer en copie.
    expect(
      referenceDepuisDestinataires([
        ['collegue@example.com'],
        ['nx-7f3k2@reply.nexoracoding.com'],
      ]),
    ).toBe('NX-7F3K2')
  })

  it('ne confond pas une adresse ordinaire avec une reference', () => {
    for (const adresse of [
      'support@nexoracoding.com',
      'nx@reply.nexoracoding.com',
      'nx-7f3k2x@reply.nexoracoding.com',
      'bonjour-nx-7f3k2@example.com',
    ]) {
      expect(referenceDepuisDestinataires([[adresse]]), adresse).toBeNull()
    }
  })

  it('tolere des listes absentes', () => {
    expect(referenceDepuisDestinataires([null, undefined, []])).toBeNull()
  })
})

describe('reference citee dans le sujet', () => {
  it('la trouve au milieu d un sujet reecrit', () => {
    expect(referenceDepuisSujet('Re: Re: Fwd: [NX-7F3K2] Autocomplete')).toBe('NX-7F3K2')
  })

  it('rend null quand il n y en a pas', () => {
    expect(referenceDepuisSujet('Re: votre offre commerciale')).toBeNull()
    expect(referenceDepuisSujet(null)).toBeNull()
  })
})

describe('extraireReference', () => {
  it('prefere l adresse au sujet', () => {
    /*
     * Le cas qui compte : le client repond a notre message NX-7F3K2 mais
     * son client de messagerie a garde le sujet d un echange precedent.
     * L enveloppe dit la verite, le sujet ment.
     */
    expect(
      extraireReference({
        to: ['nx-7f3k2@reply.nexoracoding.com'],
        subject: 'Re: [NX-AAAAA] autre chose',
      }),
    ).toBe('NX-7F3K2')
  })

  it('retombe sur le sujet quand l adresse ne dit rien', () => {
    expect(
      extraireReference({
        to: ['support@nexoracoding.com'],
        subject: 'Re: [NX-7F3K2] Autocomplete',
      }),
    ).toBe('NX-7F3K2')
  })

  it('rend null plutot que de deviner', () => {
    // L appelant ouvrira un nouveau ticket : mieux vaut un dossier de trop
    // qu une reponse collee au dossier de quelqu un d autre.
    expect(extraireReference({ to: ['hello@nexoracoding.com'], subject: 'Question' })).toBeNull()
  })
})

describe('nettoyerCitation', () => {
  it('coupe au « On … wrote: » de Gmail', () => {
    const recu = [
      'Merci, ca marche maintenant.',
      '',
      'On Fri, 21 Nov 2026 at 14:02, Nexora <noreply@nexoracoding.com> wrote:',
      '> Pouvez-vous reessayer apres la mise a jour ?',
      '> Nexora',
    ].join('\n')
    expect(nettoyerCitation(recu)).toBe('Merci, ca marche maintenant.')
  })

  it('coupe au « a écrit : » francais, accentue ou non', () => {
    for (const marqueur of [
      'Le 21 novembre 2026, Nexora a écrit :',
      'Le 21 novembre 2026, Nexora a ecrit :',
    ]) {
      const recu = `C'est resolu.\n\n${marqueur}\n> Bonjour,`
      expect(nettoyerCitation(recu), marqueur).toBe("C'est resolu.")
    }
  })

  it('coupe au bandeau Outlook', () => {
    const recu = [
      'Toujours le meme probleme.',
      '',
      '-----Original Message-----',
      'From: Nexora',
      'Sent: Friday',
    ].join('\n')
    expect(nettoyerCitation(recu)).toBe('Toujours le meme probleme.')
  })

  it('rend le texte entier quand la coupe ne laisserait rien', () => {
    /*
     * Le defaut a eviter absolument : un message qui s affiche vide dans
     * le panneau. On prefere un texte verbeux a l illusion que le client
     * n a rien dit.
     */
    const recu = 'On Friday, Nexora wrote:\n> tout le message est une citation'
    expect(nettoyerCitation(recu)).toBe(recu)
  })

  it('laisse intact un message sans citation', () => {
    const recu = "Bonjour,\n\nJe n'arrive pas a me connecter depuis hier.\n\nMerci"
    expect(nettoyerCitation(recu)).toBe(recu)
  })

  it('supporte les fins de ligne Windows', () => {
    const recu = 'Resolu.\r\n\r\nOn Fri, Nexora wrote:\r\n> bonjour'
    expect(nettoyerCitation(recu)).toBe('Resolu.')
  })
})

describe('htmlVersTexte', () => {
  it('rend les sauts de ligne et les entites', () => {
    expect(htmlVersTexte('<p>Bonjour&nbsp;&amp; merci</p><p>A bientot</p>')).toBe(
      'Bonjour & merci\nA bientot',
    )
  })

  it('jette le script et le style', () => {
    expect(
      htmlVersTexte('<style>p{color:red}</style><p>Texte</p><script>alert(1)</script>'),
    ).toBe('Texte')
  })
})

describe('corpsDuCourriel', () => {
  it('prefere le texte au HTML', () => {
    // `text` est ce que l expediteur a tape ; le HTML est une mise en forme.
    const r = corpsDuCourriel({ text: 'Version texte', html: '<p>Version HTML</p>' })
    expect(r.propre).toBe('Version texte')
  })

  it('retombe sur le HTML quand il n y a pas d alternative texte', () => {
    const r = corpsDuCourriel({ text: null, html: '<p>Seulement du HTML</p>' })
    expect(r.propre).toBe('Seulement du HTML')
  })

  it('garde le brut a cote du texte nettoye', () => {
    // On ne jette jamais ce qui a ete recu : un detail enterre sous la
    // citation peut etre celui qui explique le probleme.
    const recu = 'Merci !\n\nOn Fri, Nexora wrote:\n> ancien message'
    const r = corpsDuCourriel({ text: recu })
    expect(r.propre).toBe('Merci !')
    expect(r.brut).toBe(recu)
  })

  it('ne rend pas undefined sur un courriel vide', () => {
    const r = corpsDuCourriel({ text: null, html: null })
    expect(r.propre).toBe('')
    expect(r.brut).toBe('')
  })
})

describe('adresseDeReponse', () => {
  /*
   * Le module lit la variable d environnement a l import : on le recharge
   * pour chaque cas plutot que de la rendre mutable juste pour le test.
   */
  const ancien = process.env.SUPPORT_REPLY_DOMAIN

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.SUPPORT_REPLY_DOMAIN = ancien
  })

  it('compose l adresse quand le domaine est configure', async () => {
    process.env.SUPPORT_REPLY_DOMAIN = 'reply.nexoracoding.com'
    const { adresseDeReponse } = await import('./supportInbound')
    expect(adresseDeReponse('NX-7F3K2')).toBe('nx-7f3k2@reply.nexoracoding.com')
  })

  it('rend null tant que le MX n est pas pose', async () => {
    /*
     * Sans cette prudence, on enverrait les clients repondre a un domaine
     * qui ne recoit rien : leurs messages rebondiraient, et nous
     * croirions simplement qu ils n ont pas repondu.
     */
    delete process.env.SUPPORT_REPLY_DOMAIN
    const { adresseDeReponse } = await import('./supportInbound')
    expect(adresseDeReponse('NX-7F3K2')).toBeNull()
  })

  it('refuse une reference mal formee', async () => {
    process.env.SUPPORT_REPLY_DOMAIN = 'reply.nexoracoding.com'
    const { adresseDeReponse } = await import('./supportInbound')
    expect(adresseDeReponse('pas-une-reference')).toBeNull()
  })
})
