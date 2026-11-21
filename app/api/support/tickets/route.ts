import { NextRequest, NextResponse } from 'next/server'

import {
  adminClient,
  bad,
  clientIp,
  recordSubmission,
  tooManyAttempts,
  tooManySubmissions,
} from '../../leads/route-helpers'
import {
  notifySupportTicket,
  notifyTicketAddition,
  sendTicketAddition,
  sendTicketConfirmation,
} from '@/lib/supportEmails'
import {
  ETATS_VIVANTS,
  dossierAbsorbant,
  generateReference,
  validerTicket,
} from '@/lib/supportTickets'

export const runtime = 'nodejs'

/**
 * Creation d'un ticket.
 *
 * Volontairement ouverte aux visiteurs non connectes : « je n'arrive pas a
 * me connecter » est justement le cas ou exiger une session rendrait le
 * support inatteignable. En contrepartie, la route est bornee — champ
 * piege, limite par adresse IP, longueurs maximales, et seuls les champs
 * declares par le type choisi sont conserves.
 *
 * L'ordre compte : la ligne est ECRITE d'abord, les courriels partent
 * ensuite. Un envoi rate ne doit jamais faire perdre une demande.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const validation = validerTicket(body)
    if (!validation.ok) {
      // Le champ piege recoit la meme reponse qu'un succes : inutile
      // d'apprendre au robot ce qui l'a trahi.
      if (validation.error === 'Invalid submission') {
        return NextResponse.json({ success: true, reference: generateReference() })
      }
      return bad(validation.error)
    }
    const ticket = validation.ticket

    const cle = `support:${clientIp(req)}`
    if ((await tooManyAttempts(cle)) || (await tooManySubmissions(cle, 5))) {
      return bad('Too many requests. Please try again later.', 429)
    }

    const db = adminClient()

    // Contexte joint sans que l'utilisateur ait a le taper : c'est ce qui
    // evite deux allers-retours avant de comprendre le probleme.
    const contexte: Record<string, unknown> = { ...ticket.fields }
    let userId: string | null = null

    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (token) {
      const { data } = await db.auth.getUser(token)
      if (data.user) {
        userId = data.user.id
        contexte.account_email = data.user.email
        contexte.account_created = data.user.created_at
        const { data: sub } = await db
          .from('user_subscriptions')
          .select('status, current_period_end, subscription_plans!inner(slug)')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .maybeSingle()
        contexte.plan = (sub?.subscription_plans as any)?.slug ?? 'free'
        contexte.subscription_status = sub?.status ?? 'none'
        if (sub?.current_period_end) {
          contexte.period_end = sub.current_period_end
        }
      }
    }

    /*
     * Une demande deja ouverte sur le meme sujet ?
     *
     * Alors on n'en cree pas une seconde : le message rejoint le fil de
     * la plus ancienne. Cinq dossiers pour un meme probleme, c'est cinq
     * endroits ou chercher la reponse — et quatre qui resteront sans
     * reponse pendant qu'on repond sur le cinquieme.
     *
     * L'appariement se fait sur l'adresse plutot que sur le compte :
     * quelqu'un peut ouvrir une demande sans etre connecte (« je
     * n'arrive pas a me connecter ») puis revenir connecte. C'est la
     * meme personne et le meme probleme.
     */
    const { data: ouverts } = await db
      .from('support_tickets')
      .select('id, reference, category, status, created_at')
      .eq('email', ticket.email)
      .in('status', ETATS_VIVANTS)
      .order('created_at', { ascending: true })
      .limit(20)

    const absorbant = dossierAbsorbant(ouverts ?? [], ticket.category)

    if (absorbant) {
      const { error: erreurAjout } = await db
        .from('support_ticket_replies')
        .insert({
          ticket_id: absorbant.id,
          direction: 'inbound',
          author: ticket.email,
          body: ticket.message,
          email_sent: true,
        })

      if (erreurAjout) {
        console.error('[support] ajout au dossier impossible:', erreurAjout)
        return bad('Could not record your request. Please try again.', 500)
      }

      // Le dossier redevient a traiter : il avait peut-etre ete marque
      // « answered », et quelqu'un vient de reprendre la parole.
      await db
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', absorbant.id)
        .neq('status', 'open')

      await recordSubmission(cle)
      await Promise.allSettled([
        sendTicketAddition({
          reference: absorbant.reference,
          email: ticket.email,
          subject: ticket.subject,
          message: ticket.message,
          openedAt: absorbant.created_at,
        }),
        notifyTicketAddition({
          reference: absorbant.reference,
          email: ticket.email,
          subject: ticket.subject,
          message: ticket.message,
        }),
      ])

      return NextResponse.json({
        success: true,
        reference: absorbant.reference,
        // L'ecran doit dire pourquoi la reference n'est pas neuve, sinon
        // l'utilisateur croit avoir mal rempli le formulaire.
        merged: true,
        mergedOpenedAt: absorbant.created_at,
      })
    }

    // Collision de reference : improbable (32^5), pas impossible. On
    // reessaie plutot que de rendre une erreur a l'utilisateur.
    let reference = generateReference()
    let inserted = null
    for (let essai = 0; essai < 3 && !inserted; essai++) {
      const { data, error } = await db
        .from('support_tickets')
        .insert({
          reference,
          user_id: userId,
          email: ticket.email,
          category: ticket.category,
          subject: ticket.subject,
          message: ticket.message,
          context: contexte,
        })
        .select('id, reference')
        .single()
      if (!error) {
        inserted = data
        break
      }
      if (!String(error.message).includes('duplicate')) {
        console.error('[support] insertion impossible:', error)
        return bad('Could not record your request. Please try again.', 500)
      }
      reference = generateReference()
    }
    if (!inserted) {
      return bad('Could not record your request. Please try again.', 500)
    }

    await recordSubmission(cle)

    /*
     * Les courriels partent APRES l'ecriture, et on les ATTEND.
     *
     * Ils etaient lances sans attendre, pour ne pas ralentir la reponse.
     * L'intention etait bonne, la plateforme ne la permet pas : Vercel gele
     * la fonction des que la reponse part, et tout envoi encore en vol est
     * tue. Les deux couraient donc contre l'horloge — le premier passait,
     * le second non. Resultat observe le 21 novembre 2026 : le client
     * recevait sa confirmation, et personne n'etait prevenu du ticket.
     *
     * allSettled : les deux partent en parallele, et l'echec de l'un
     * n'empeche pas l'autre. Aucune des deux fonctions ne rejette de toute
     * facon, mais le ticket est deja enregistre — rien ici ne doit pouvoir
     * faire echouer la reponse.
     */
    await Promise.allSettled([
      sendTicketConfirmation({ ...ticket, reference }),
      notifySupportTicket({ ...ticket, reference, context: contexte }),
    ])

    return NextResponse.json({ success: true, reference })
  } catch (e) {
    console.error('[support] erreur:', e)
    return bad('Server error', 500)
  }
}

/**
 * Les tickets de l'utilisateur connecte, avec leur fil.
 *
 * Jusqu'ici il n'y avait rien a l'ecran : apres l'envoi, l'utilisateur
 * repartait avec une reference affichee une fois. Onglet ferme, courriel
 * de confirmation egare, et sa demande devenait introuvable pour lui.
 *
 * Le filtre sur `user_id` est la seule chose qui separe les dossiers : on
 * passe par la clef de service, donc RLS ne protege pas ici. Toute
 * modification de cette requete doit le garder en tete.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return bad('Unauthorized', 401)

  const db = adminClient()
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user) return bad('Unauthorized', 401)

  const { data } = await db
    .from('support_tickets')
    .select('id, reference, category, subject, message, status, created_at, user_seen_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const tickets = data ?? []
  let reponses: Record<string, unknown[]> = {}

  if (tickets.length > 0) {
    const { data: lignes } = await db
      .from('support_ticket_replies')
      // Ni `author` ni `raw_body` : l'adresse de l'administrateur qui a
      // repondu ne regarde pas le client, et le brut contient la citation.
      .select('id, ticket_id, direction, body, created_at')
      .in(
        'ticket_id',
        tickets.map((t) => t.id),
      )
      .order('created_at', { ascending: true })

    reponses = (lignes ?? []).reduce<Record<string, unknown[]>>((acc, r) => {
      ;(acc[r.ticket_id] ||= []).push(r)
      return acc
    }, {})
  }

  return NextResponse.json({ tickets, replies: reponses })
}

/**
 * « J'ai lu ce dossier. »
 *
 * L'etat « answered » dit que NOUS avons repondu, pas que l'utilisateur
 * l'a vu. Sans cette date, un dossier deja lu continuerait d'etre
 * signale comme neuf, et au troisieme le signal ne voudrait plus rien
 * dire.
 */
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return bad('Unauthorized', 401)

  const db = adminClient()
  const { data: auth } = await db.auth.getUser(token)
  if (!auth.user) return bad('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const id = String(body.id ?? '')
  if (!id) return bad('Missing id', 400)

  // Le filtre sur user_id n'est pas decoratif : on passe par la clef de
  // service, donc rien d'autre n'empeche de marquer le dossier d'autrui.
  const { error } = await db
    .from('support_tickets')
    .update({ user_seen_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) {
    console.error('[support] marquage lu impossible:', error)
    return bad('Server error', 500)
  }

  return NextResponse.json({ success: true })
}
