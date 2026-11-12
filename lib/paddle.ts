import type { PlanId } from './models'

/**
 * Paddle price IDs — un produit/prix par plan payant, créés dans le
 * dashboard Paddle (Catalogue > Produits). Contrairement à Lemon Squeezy, le
 * checkout Paddle s'ouvre directement côté client (Paddle.Checkout.open)
 * avec l'ID du prix, donc ces IDs doivent être publics (NEXT_PUBLIC_) — ce
 * ne sont pas des secrets, juste des identifiants de catalogue.
 */
export const PADDLE_PRICE_IDS: Partial<Record<PlanId, string>> = {
  starter: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER,
  pro: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO,
  business: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS,
  enterprise: process.env.NEXT_PUBLIC_PADDLE_PRICE_ENTERPRISE,
}

/** Un jeton client Paddle "test_..." pointe vers le sandbox, "live_..." vers la prod. */
export function isPaddleSandbox(clientToken: string | undefined): boolean {
  return !clientToken || clientToken.startsWith('test_')
}

/** Base URL de l'API Paddle server-side, selon PADDLE_ENV (voir .env.local). */
export function paddleApiBaseUrl(): string {
  return process.env.PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com'
}

/** Extrait l'id de souscription Paddle depuis la référence stockée en base ("paddle_sub_<id>"). */
export function paddleSubscriptionIdFromReference(reference: string): string | null {
  const m = reference.match(/^paddle_sub_(.+)$/)
  return m ? m[1] : null
}

/**
 * Traduit une reponse d'erreur Paddle en message exploitable.
 *
 * « Erreur Paddle (403) » ne dit rien a personne : il a fallu lire le code,
 * la configuration Vercel et la documentation pour comprendre un refus, alors
 * que la reponse de Paddle portait la raison depuis le debut.
 *
 * Un 403 ici a presque toujours la meme cause : la cle et l'abonnement ne
 * sont pas dans le meme environnement. `paddleApiBaseUrl()` ci-dessus retombe
 * sur le sandbox des que PADDLE_ENV ne vaut pas exactement « production », ce
 * qui veut dire qu'une variable absente ou mal orthographiee envoie une cle de
 * production interroger le sandbox — et Paddle repond 403.
 */
export function messagePaddle(status: number, corps: string): string {
  let code = ''
  let detail = ''
  try {
    const j = JSON.parse(corps)
    code = j?.error?.code ?? ''
    detail = j?.error?.detail ?? ''
  } catch {
    // Paddle a renvoye autre chose que du JSON — on garde le texte brut,
    // tronque : un corps d'erreur entier dans un toast est illisible.
    detail = corps.slice(0, 200)
  }

  if (status === 403) {
    return (
      `Paddle refused the request (403${code ? ` ${code}` : ''}). ` +
      'Check that PADDLE_ENV and PADDLE_API_KEY point at the same environment ' +
      'as the subscription' +
      (detail ? ` — ${detail}` : '') +
      '.'
    )
  }
  if (status === 404) {
    return (
      'Paddle does not know this subscription (404). ' +
      'It was most likely created in the other environment.'
    )
  }
  return `Paddle error (${status})${code ? ` ${code}` : ''}${detail ? ` — ${detail}` : ''}`
}
