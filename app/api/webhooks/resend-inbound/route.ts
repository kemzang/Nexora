import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { resend } from '@/lib/resend'
import { corpsDuCourriel, extraireReference } from '@/lib/supportInbound'
import { generateReference } from '@/lib/supportTickets'

export const runtime = 'nodejs'

/**
 * Les reponses des clients, remises dans le fil de leur ticket.
 *
 * Resend appelle cette route a chaque courriel recu sur le domaine de
 * reception. Deux particularites de ce webhook dictent la forme du code :
 *
 * 1. Il ne transporte PAS le corps du message, seulement des metadonnees.
 *    Il faut un second appel, `emails.receiving.get`, pour obtenir le
 *    texte. Un webhook qui echoue a cette etape doit donc etre REESSAYE,
 *    pas acquitte.
 *
 * 2. Resend ne conserve les messages que trente jours. Le fil en base est
 *    l'archive ; passe ce delai, ce que nous n'avons pas copie n'existe
 *    plus nulle part.
 *
 * Regle qui prime sur tout le reste : un courriel verifie n'est jamais
 * jete. Si la reference est introuvable — client qui ecrit a une autre
 * adresse, sujet reecrit, transfert depuis une boite tierce — on ouvre un
 * NOUVEAU ticket avec son contenu. Un support qui perd un message en
 * silence est pire qu'un support absent : personne ne sait qu'il faut
 * relancer.
 */
function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    // Sans secret, on ne peut pas distinguer Resend de n'importe qui. On
    // refuse plutot que d'ecrire en base sur la foi d'un appel anonyme.
    console.error('[inbound] RESEND_WEBHOOK_SECRET absent')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  // Le corps BRUT : la signature porte sur les octets recus. Analyser puis
  // re-serialiser suffirait a la rendre invalide.
  const brut = await req.text()

  let evenement
  try {
    evenement = resend.webhooks.verify({
      payload: brut,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret: secret,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (evenement.type !== 'email.received') {
    // Un autre evenement abonne par erreur : on acquitte, sinon Resend
    // reessaiera indefiniment quelque chose qu'on ne traitera jamais.
    return NextResponse.json({ ignored: evenement.type })
  }

  const emailId = evenement.data.email_id
  const db = service()

  // Resend reessaie en cas de non-reponse : le meme message peut arriver
  // deux fois. L'index unique l'attrape aussi, mais ce controle evite un
  // appel API et une lecture inutiles.
  const { data: deja } = await db
    .from('support_ticket_replies')
    .select('id')
    .eq('provider_message_id', emailId)
    .maybeSingle()
  if (deja) {
    return NextResponse.json({ duplicate: true })
  }

  // Le contenu, qui ne voyage pas dans le webhook.
  let contenu
  try {
    const reponse = await resend.emails.receiving.get(emailId)
    if (reponse.error || !reponse.data) {
      throw new Error(reponse.error?.message || 'empty response')
    }
    contenu = reponse.data
  } catch (e) {
    /*
     * 500 : Resend reessaiera. Acquitter ici perdrait le message pour de
     * bon, puisque son contenu n'existe plus ailleurs apres trente jours.
     *
     * La RAISON part aussi dans la reponse, pas seulement dans les logs.
     * Resend affiche ce corps dans l'historique de livraison : sans lui,
     * on lit « Could not fetch the message » et il faut aller fouiller
     * Vercel pour apprendre qu'il s'agissait d'une clef sans droits.
     * Ce tableau de bord n'est accessible qu'au proprietaire du compte.
     */
    const raison = e instanceof Error ? e.message : String(e)
    console.error('[inbound] contenu illisible pour', emailId, e)
    return NextResponse.json(
      { error: 'Could not fetch the message', reason: raison.slice(0, 300) },
      { status: 500 },
    )
  }

  const expediteur = String(contenu.from ?? evenement.data.from ?? '').toLowerCase()
  const sujet = String(contenu.subject ?? evenement.data.subject ?? '(no subject)')
  const { propre, brut: corpsBrut } = corpsDuCourriel(contenu)

  const reference = extraireReference({
    to: contenu.to ?? evenement.data.to,
    cc: contenu.cc ?? evenement.data.cc,
    bcc: contenu.bcc ?? evenement.data.bcc,
    subject: sujet,
  })

  let ticketId: string | null = null
  if (reference) {
    const { data: ticket } = await db
      .from('support_tickets')
      .select('id')
      .eq('reference', reference)
      .maybeSingle()
    ticketId = ticket?.id ?? null
  }

  // Aucun ticket reconnu : on en ouvre un, plutot que de laisser tomber.
  if (!ticketId) {
    const { data: nouveau, error: erreurTicket } = await db
      .from('support_tickets')
      .insert({
        reference: generateReference(),
        email: expediteur,
        category: 'other',
        subject: sujet.slice(0, 150),
        message: propre,
        context: {
          source: 'inbound email',
          // Dit a l'oeil humain pourquoi ce ticket est seul : la reference
          // citee n'existait pas, ou il n'y en avait aucune.
          unmatched_reference: reference ?? null,
          resend_email_id: emailId,
        },
      })
      .select('id')
      .single()

    if (erreurTicket || !nouveau) {
      console.error('[inbound] ticket non cree:', erreurTicket)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
    ticketId = nouveau.id
  }

  const { error: erreurReponse } = await db.from('support_ticket_replies').insert({
    ticket_id: ticketId,
    direction: 'inbound',
    author: expediteur,
    body: propre,
    raw_body: corpsBrut,
    // Il est arrive : il n'y a pas de notification a avoir ratee.
    email_sent: true,
    provider_message_id: emailId,
  })

  if (erreurReponse) {
    // 23505 : l'index unique a rattrape un rejeu que la lecture plus haut
    // avait manque, les deux appels s'etant croises. Ce n'est pas un echec.
    if ((erreurReponse as { code?: string }).code === '23505') {
      return NextResponse.json({ duplicate: true })
    }
    console.error('[inbound] reponse non enregistree:', erreurReponse)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  // Le client a repris la parole : le ticket redevient a traiter. Sans
  // cela, une relance resterait classee « answered » et sortirait de la
  // file alors que quelqu'un attend.
  await db
    .from('support_tickets')
    .update({ status: 'open' })
    .eq('id', ticketId)
    .neq('status', 'open')

  return NextResponse.json({ success: true })
}
