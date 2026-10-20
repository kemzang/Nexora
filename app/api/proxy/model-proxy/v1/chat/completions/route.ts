import {
  getOrgRemainingCredits,
  getUserOrg,
  orgCreditLimit,
  type UserOrg,
} from '@/lib/organizations'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-verify'
import { createClient } from '@supabase/supabase-js'
import { applyAnthropicCache, expectedBillableInput } from '@/lib/promptCache'
import { readOpenAIUsage, trackSseUsage, type SseUsage as UpstreamUsage } from '@/lib/sseUsage'
import { getFailoverCandidates, hasImageContent, estimateTokens, getEffectiveTokenLimit, computeCreditsConsumed, getCreditMultiplier, type AIModel, type ModelId, type PlanId } from '@/lib/models'
import { cacheGet, cacheSet } from '@/lib/upstash-cache'
import { captureServerError } from '@/lib/sentry'
import { isFreeQuotaBlocked } from '@/lib/machineAccounts'
import { quotaWindow } from '@/lib/billingWindow'

export const runtime = 'nodejs'

// Duree max de la fonction. 60 s est le plafond du plan Vercel Hobby, donc
// cette valeur se deploie sur tous les plans. Sur un plan Pro, elle peut etre
// montee jusqu'a 300 pour les generations tres longues.
// Streaming LLM : la generation depasse tres largement le defaut Vercel
// (10-15 s selon le plan), qui coupait les reponses longues en plein milieu.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Caches ───────────────────────────────────────────────────────────────────
// Deux niveaux : Map locale (rapide, mais isolée à l'instance serverless qui la
// détient) en L1, puis Upstash Redis (partagé entre TOUTES les instances) en
// L2 avant de retomber sur Supabase. Sous charge, Vercel répartit les requêtes
// entre plusieurs instances Node — sans L2, chacune revalidait indépendamment
// le plan/quota (jusqu'à 5 min de dérive entre instances). Si Upstash n'est pas
// configuré (UPSTASH_REDIS_REST_URL absent), cacheGet renvoie toujours null et
// on retombe exactement sur le comportement L1→Supabase d'origine.
//
// Ces Map vivent aussi longtemps que l'instance. Sans borne, une instance
// chaude qui voit passer beaucoup d'utilisateurs distincts les fait grossir
// indefiniment jusqu'a saturer la memoire de la fonction. BoundedTtlMap plafonne
// le nombre d'entrees et evince les plus anciennes : le cache reste un cache,
// pas une fuite.
const CACHE_MAX_ENTRIES = 5_000

class BoundedTtlMap<V extends { expiresAt: number }> {
  private map = new Map<string, V>()

  constructor(private readonly maxEntries = CACHE_MAX_ENTRIES) {}

  get(key: string): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key)
      return undefined
    }
    // Re-inserer marque l'entree comme recemment utilisee : Map preserve
    // l'ordre d'insertion, donc la plus ancienne cle est la premiere.
    this.map.delete(key)
    this.map.set(key, entry)
    return entry
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxEntries) {
      // Purge d'abord ce qui est expire ; si tout est encore valide, evince
      // l'entree la plus anciennement utilisee.
      const now = Date.now()
      for (const [k, v] of this.map) {
        if (v.expiresAt <= now) this.map.delete(k)
      }
      if (this.map.size >= this.maxEntries) {
        const oldest = this.map.keys().next()
        if (!oldest.done) this.map.delete(oldest.value)
      }
    }
    this.map.set(key, value)
  }
}

const planCache = new BoundedTtlMap<{ value: PlanWindow; expiresAt: number }>()
const usageCache = new BoundedTtlMap<{ total: number; expiresAt: number }>()
const createdAtCache = new BoundedTtlMap<{
  createdAt: string
  expiresAt: number
}>()

/*
 * Plafond de tokens de SORTIE par requete.
 *
 * Le palier gratuit etait a 2048, en dessous des 4096 que l'extension demande :
 * chaque reponse etait donc tronquee, et une reponse coupee en plein milieu
 * d'une fonction rend du code syntaxiquement casse. L'utilisateur relance
 * alors sa demande — ce qui coute PLUS cher qu'une reponse complete du premier
 * coup, en plus de donner l'impression que le modele est mauvais.
 *
 * Un plafond bas n'economise donc rien : il transforme une requete utile en
 * deux requetes inutilisables. 4096 est le minimum viable pour de la
 * generation de code.
 */
const MAX_TOKENS_PER_PLAN: Record<PlanId, number> = {
  free: 4096,
  starter: 8192,
  pro: 16384,
  business: 32768,
  enterprise: 64000,
}

const API_ROUTES: Record<string, { baseUrl: string; keyEnv: string; format: 'openai' | 'anthropic' | 'gemini' }> = {
  'deepseek-chat':    { baseUrl: 'https://api.deepseek.com/v1/chat/completions',              keyEnv: 'DEEPSEEK_API_KEY',   format: 'openai'    },
  'deepseek-reasoner':{ baseUrl: 'https://api.deepseek.com/v1/chat/completions',              keyEnv: 'DEEPSEEK_API_KEY',   format: 'openai'    },
  'gemini-flash':     { baseUrl: 'https://generativelanguage.googleapis.com/v1beta',          keyEnv: 'GEMINI_API_KEY',     format: 'gemini'    },
  'gemini-pro':       { baseUrl: 'https://generativelanguage.googleapis.com/v1beta',          keyEnv: 'GEMINI_API_KEY',     format: 'gemini'    },
  'claude-haiku':     { baseUrl: 'https://api.anthropic.com/v1/messages',                     keyEnv: 'ANTHROPIC_API_KEY',  format: 'anthropic' },
  'claude-sonnet':    { baseUrl: 'https://api.anthropic.com/v1/messages',                     keyEnv: 'ANTHROPIC_API_KEY',  format: 'anthropic' },
  'claude-opus':      { baseUrl: 'https://api.anthropic.com/v1/messages',                     keyEnv: 'ANTHROPIC_API_KEY',  format: 'anthropic' },
}

// ── Usage tracking ───────────────────────────────────────────────────────────

interface UsageContext {
  userId: string
  plan: PlanId
  modelId: string
  inputTokens: number
  preferred: string | null
  complexity: number
  downgraded: boolean
  /**
   * Consommation reelle rapportee par le fournisseur, remplie au vol pendant
   * la reponse. Elle prime sur `inputTokens`, qui n'est qu'une estimation a
   * quatre caracteres par jeton faite avant l'appel : c'est elle qui porte la
   * part relue depuis le cache, donc la seule facon de ne pas refacturer sept
   * fois le meme contexte dans une boucle d'agent.
   */
  upstream: UpstreamUsage
}

/** Enregistre la consommation finale (entrée + sortie, pondérée par le crédit du modèle). */
async function recordUsage(ctx: UsageContext, outputTokens: number): Promise<void> {
  const realInput = ctx.upstream.inputTokens
  const inputTokens = typeof realInput === 'number' && realInput > 0 ? realInput : ctx.inputTokens
  const cachedInput = ctx.upstream.cachedInputTokens ?? 0
  const outTokens =
    typeof ctx.upstream.outputTokens === 'number' && ctx.upstream.outputTokens > 0
      ? ctx.upstream.outputTokens
      : outputTokens
  const credits = computeCreditsConsumed(ctx.modelId, inputTokens, outTokens, cachedInput)
  try {
    const { error } = await supabase.from('usage_sessions').insert({
      user_id: ctx.userId,
      // started_at explicite : le dashboard ET le quota filtrent par started_at >=
      // début du mois. Sans valeur (si la colonne n'a pas de défaut DB), les lignes
      // seraient exclues → conso affichée à 0 et quota jamais décompté.
      started_at: new Date().toISOString(),
      session_type: 'chat_proxy',
      // PAS model_id : cette colonne est une UUID FK vers ai_models(id), pas
      // un slug texte. ctx.modelId vaut "deepseek-chat"/"claude-sonnet"/etc,
      // donc l'y mettre faisait echouer l'insert a chaque appel (erreur
      // "invalid input syntax for type uuid") — silencieusement, avalee par
      // le catch ci-dessous. Resultat verifie en base : usage_sessions restait
      // a zero ligne pour TOUT le monde, quel que soit l'usage reel. Le slug
      // est deja conserve dans metadata.model plus bas ; recordCall() dans
      // lib/quota.ts evite deja ce meme piege, avec le meme commentaire.
      tokens_input: inputTokens,
      tokens_output: outTokens,
      tokens_total: credits, // crédits pondérés — c'est ce qui décompte le quota
      metadata: {
        plan: ctx.plan,
        model: ctx.modelId,
        preferred: ctx.preferred,
        complexity: ctx.complexity,
        downgraded: ctx.downgraded,
        creditMultiplier: credits / Math.max(1, inputTokens + outTokens),
        // Garde la trace de ce que le cache a fait economiser : c'est la seule
        // facon de verifier en base qu'il mord vraiment, et d'ou vient l'ecart
        // entre jetons traites et credits decomptes.
        cachedInputTokens: cachedInput,
        estimatedInputTokens: ctx.inputTokens,
        usageFromProvider: typeof realInput === 'number' && realInput > 0,
      },
    })
    if (error) {
      // Le suivi reste best-effort (on ne casse jamais la réponse pour ça),
      // mais une erreur d'insert doit rester visible dans les logs Vercel —
      // avant ce correctif, un catch muet a fait disparaître ce type de bug
      // pendant des mois sans qu'aucune alerte ne remonte nulle part.
      // captureServerError() ferme la boucle : ce cas precis (colonne
      // model_id incompatible) aurait ete detecte par Sentry des le premier
      // appel plutot que des mois plus tard, a la main.
      console.error('[model-proxy] recordUsage insert failed:', error)
      captureServerError(error, { route: 'model-proxy/chat/completions', stage: 'recordUsage.insert', userId: ctx.userId })
    }
  } catch (err) {
    console.error('[model-proxy] recordUsage threw:', err)
    captureServerError(err, { route: 'model-proxy/chat/completions', stage: 'recordUsage.catch', userId: ctx.userId })
  }
}

/**
 * Wrappe un flux SSE OpenAI : laisse passer les chunks tels quels vers le client
 * tout en comptant le texte de sortie (delta.content), puis enregistre la conso.
 */
function trackOutputStream(
  body: ReadableStream<Uint8Array>,
  ctx: UsageContext,
): ReadableStream<Uint8Array> {
  return trackSseUsage(body, ctx.upstream, (outputTokens) => recordUsage(ctx, outputTokens))
}

// ── Plan helpers ─────────────────────────────────────────────────────────────
/**
 * Plan de l'utilisateur et periode de son abonnement.
 *
 * La periode est lue ici plutot que dans une requete a part : les deux
 * viennent de la meme ligne, et cette fonction est sur le chemin critique.
 */
type PlanWindow = {
  plan: PlanId
  periodStart?: string
  periodEnd?: string
}

async function getUserPlanWindow(userId: string): Promise<PlanWindow> {
  const cached = planCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const shared = await cacheGet<PlanWindow>(`plan:${userId}`)
  if (shared) {
    planCache.set(userId, { value: shared, expiresAt: Date.now() + 300_000 })
    return shared
  }

  const { data } = await supabase
    .from('user_subscriptions')
    .select('current_period_start, current_period_end, subscription_plans!inner(slug)')
    .eq('user_id', userId)
    .eq('status', 'active')
    // Exclut les abonnements expirés (forfaits test 7/14j, ou tout plan échu).
    .gt('current_period_end', new Date().toISOString())
    .maybeSingle()

  const value: PlanWindow = {
    plan: ((data?.subscription_plans as any)?.slug as PlanId) || 'free',
    periodStart: data?.current_period_start ?? undefined,
    periodEnd: data?.current_period_end ?? undefined,
  }
  planCache.set(userId, { value, expiresAt: Date.now() + 300_000 })
  void cacheSet(`plan:${userId}`, value, 300)
  return value
}

async function getUserPlan(userId: string): Promise<PlanId> {
  return (await getUserPlanWindow(userId)).plan
}

/**
 * Fenetre de consommation.
 *
 * Elle se calait sur la date d'inscription a la plateforme, jamais sur
 * l'abonnement. Deux consequences, toutes deux au detriment du client qui
 * paie :
 *
 *   - le quota repartait a l'anniversaire de l'inscription pendant que
 *     Paddle prelevait au jour de l'achat, deux cycles qui derivaient ;
 *   - une montee en gamme n'effacait pas la consommation precedente, donc
 *     quelqu'un qui passait de Starter a Pro payait 15M et en recevait 11.
 *
 * Pour un abonne, la fenetre est desormais celle de son abonnement : le
 * compteur repart au jour du prelevement, et un changement de plan ecrit un
 * `current_period_start` a maintenant, donc un quota neuf.
 *
 * Les comptes gratuits gardent l'anniversaire d'inscription : sans ancrage,
 * quelqu'un inscrit le 28 obtiendrait deux quotas en trois jours.
 */
async function getQuotaWindow(
  userId: string,
  now = new Date(),
): Promise<{ startIso: string; secondsUntilReset: number }> {
  const { periodStart, periodEnd } = await getUserPlanWindow(userId)

  if (periodStart && periodEnd) {
    const w = quotaWindow({ periodStart, periodEnd }, now)
    return { startIso: w.start.toISOString(), secondsUntilReset: w.secondsUntilReset }
  }

  const createdAt = await getUserCreatedAt(userId)
  const w = quotaWindow({ createdAt }, now)
  return { startIso: w.start.toISOString(), secondsUntilReset: w.secondsUntilReset }
}

async function getUserCreatedAt(userId: string): Promise<string | undefined> {
  const cached = createdAtCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.createdAt

  const shared = await cacheGet<string>(`created-at:${userId}`)
  if (shared) {
    createdAtCache.set(userId, { createdAt: shared, expiresAt: Date.now() + 3_600_000 })
    return shared
  }

  const { data } = await supabase.auth.admin.getUserById(userId)
  const createdAt = data?.user?.created_at
  if (createdAt) {
    createdAtCache.set(userId, { createdAt, expiresAt: Date.now() + 3_600_000 })
    void cacheSet(`created-at:${userId}`, createdAt, 3_600)
  }
  return createdAt
}

/**
 * Somme des crédits du mois. Passe par la fonction SQL get_monthly_usage
 * (migration 005) pour que l'agrégation se fasse dans Postgres : sans elle on
 * rapatriait toutes les lignes du mois pour n'en tirer qu'un entier.
 *
 * Repli sur l'ancien calcul si la fonction n'existe pas encore, pour que le
 * code puisse être déployé avant la migration sans bloquer les utilisateurs.
 */
async function sumMonthlyUsage(userId: string, since: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_monthly_usage', {
    p_user_id: userId,
    p_since: since,
  })

  if (!error && data !== null && data !== undefined) {
    return Number(data) || 0
  }

  const { data: rows } = await supabase
    .from('usage_sessions')
    .select('tokens_input, tokens_total')
    .gte('started_at', since)
    .eq('user_id', userId)
  return (rows ?? []).reduce(
    (sum, r) => sum + (r.tokens_total ?? r.tokens_input ?? 0),
    0,
  )
}

/**
 * Credits restants, ou Infinity quand le plan n'en compte pas.
 *
 * checkMonthlyLimit() ne repond que par oui ou non. Pour adapter la requete au
 * solde plutot que de la refuser, il faut le nombre.
 */
/**
 * Quota d'une equipe : le pot commun de l'organisation remplace le quota
 * personnel. L'appartenance est mise en cache brievement — la route la
 * consulte a chaque requete, et elle ne change qu'a une invitation ou un
 * retrait.
 */
async function resolveOrg(userId: string): Promise<UserOrg | null> {
  // cacheGet renvoie null aussi bien pour « absent du cache » que pour une
  // valeur nulle. On encapsule donc la reponse, sinon la grande majorite des
  // utilisateurs — ceux sans equipe — interrogeraient la base a chaque appel.
  const cached = await cacheGet<{ org: UserOrg | null }>(`org:${userId}`)
  if (cached) return cached.org
  const org = await getUserOrg(supabase, userId)
  void cacheSet(`org:${userId}`, { org }, 120)
  return org
}

async function getRemainingCredits(userId: string, plan: PlanId): Promise<number> {
  const planLimit = getEffectiveTokenLimit(plan)

  if (plan === 'free' && (await isFreeQuotaBlocked(supabase, userId))) return 0
  if (planLimit <= 0) return Number.POSITIVE_INFINITY

  const cached = usageCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return Math.max(0, planLimit - cached.total)
  }
  const shared = await cacheGet<number>(`usage:${userId}`)
  if (shared !== null) {
    usageCache.set(userId, { total: shared, expiresAt: Date.now() + 60_000 })
    return Math.max(0, planLimit - shared)
  }
  const usage = await sumMonthlyUsage(userId, (await getQuotaWindow(userId)).startIso)
  usageCache.set(userId, { total: usage, expiresAt: Date.now() + 60_000 })
  void cacheSet(`usage:${userId}`, usage, 60)
  return Math.max(0, planLimit - usage)
}

async function checkMonthlyLimit(userId: string, plan: PlanId): Promise<string | null> {
  let planLimit = getEffectiveTokenLimit(plan)

  // Le palier gratuit ne vaut que pour les deux premiers comptes d'une meme
  // machine. Au-dela, l'acces au produit reste ouvert mais sans credits
  // offerts : c'est la seule reponse a l'ouverture en serie de comptes
  // jetables, qui consomme de vrais appels d'API a nos frais. Les plans
  // payants ne sont jamais concernes.
  if (plan === 'free' && (await isFreeQuotaBlocked(supabase, userId))) {
    planLimit = 0
    return '0'
  }

  if (planLimit <= 0) return null

  const cached = usageCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.total >= planLimit ? planLimit.toString() : null
  }

  const sharedTotal = await cacheGet<number>(`usage:${userId}`)
  if (sharedTotal !== null) {
    usageCache.set(userId, { total: sharedTotal, expiresAt: Date.now() + 60_000 })
    return sharedTotal >= planLimit ? planLimit.toString() : null
  }

  const now = new Date()
  const usage = await sumMonthlyUsage(userId, (await getQuotaWindow(userId, now)).startIso)
  usageCache.set(userId, { total: usage, expiresAt: Date.now() + 60_000 })
  void cacheSet(`usage:${userId}`, usage, 60)
  return usage >= planLimit ? planLimit.toString() : null
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

/**
 * Traduit le contenu d'un message du format OpenAI vers celui d'Anthropic.
 *
 * Les deux s'accordent sur `text` mais divergent sur les images : OpenAI
 * envoie `image_url` avec une URL (souvent une data-URL base64), Anthropic
 * attend `image` avec une `source` structuree. Sans cette traduction,
 * Anthropic refusait tout le message — et comme une image reste dans
 * l'historique, TOUTES les requetes suivantes de la conversation
 * echouaient, pas seulement celle qui portait l'image.
 */
function toAnthropicContent(content: any): any {
  if (!Array.isArray(content)) return content ?? ''

  const parts = content
    .map((p: any) => {
      if (!p || typeof p !== 'object') return null
      if (p.type === 'text') return { type: 'text', text: p.text ?? '' }
      // Deja au format Anthropic : laisser passer.
      if (p.type === 'image' && p.source) return p
      if (p.type === 'image_url') {
        const url = p.image_url?.url ?? p.image_url
        if (typeof url !== 'string') return null
        const m = url.match(/^data:([^;,]+);base64,(.*)$/)
        if (m) {
          return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }
        }
        if (/^https?:\/\//.test(url)) {
          return { type: 'image', source: { type: 'url', url } }
        }
        return null
      }
      return null
    })
    .filter(Boolean)

  // Un message sans aucune partie exploitable serait refuse : on met un
  // texte vide plutot qu'un tableau vide.
  return parts.length > 0 ? parts : ''
}

function buildAnthropicMessages(messages: any[]): any[] {
  const result: any[] = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'system') { i++; continue }

    // Consecutive tool results → single user message with tool_result parts
    if (msg.role === 'tool') {
      const parts: any[] = []
      while (i < messages.length && messages[i].role === 'tool') {
        parts.push({
          type: 'tool_result',
          tool_use_id: messages[i].tool_call_id,
          content: typeof messages[i].content === 'string'
            ? messages[i].content
            : JSON.stringify(messages[i].content ?? ''),
        })
        i++
      }
      result.push({ role: 'user', content: parts })
      continue
    }

    // Assistant message with tool calls
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const content: any[] = []
      if (msg.content) content.push({ type: 'text', text: msg.content })
      for (const tc of msg.tool_calls) {
        let input: any = {}
        try { input = JSON.parse(tc.function.arguments) } catch { /* use {} */ }
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
      }
      result.push({ role: 'assistant', content })
      i++
      continue
    }

    result.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: toAnthropicContent(msg.content),
    })
    i++
  }
  return result
}

function buildAnthropicBody(body: any, modelApiId: string): any {
  const system = body.messages
    .filter((m: any) => m.role === 'system')
    .map((m: any) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n')

  const msgs = buildAnthropicMessages(body.messages)

  const req: any = {
    model: modelApiId,
    max_tokens: body.max_tokens ?? 4096,
    messages: msgs,
    stream: body.stream ?? true,
  }

  // Pose les points de cache et renvoie le `system` a envoyer (chaine nue si
  // la conversation est trop courte pour etre mise en cache). Modifie `msgs`
  // sur place — voir lib/promptCache.ts.
  const systemField = applyAnthropicCache(system, msgs)
  if (system) req.system = systemField

  if (body.temperature != null) req.temperature = body.temperature
  if (body.top_p != null) req.top_p = body.top_p

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    req.tools = body.tools.map((t: any) => ({
      name: t.function?.name ?? t.name,
      description: t.function?.description ?? t.description ?? '',
      input_schema: t.function?.parameters ?? t.input_schema ?? { type: 'object', properties: {} },
    }))
  }

  if (body.tool_choice) {
    const tc = body.tool_choice
    if (tc === 'auto' || tc?.type === 'auto') req.tool_choice = { type: 'auto' }
    else if (tc === 'required' || tc?.type === 'required') req.tool_choice = { type: 'any' }
    else if (tc === 'none' || tc?.type === 'none') req.tool_choice = { type: 'none' }
    else if (tc?.function?.name) req.tool_choice = { type: 'tool', name: tc.function.name }
  }

  return req
}

function anthropicNonStreamingToOpenAI(json: any, modelId: string): any {
  const content: any[] = json.content ?? []
  const texts = content.filter((c: any) => c.type === 'text').map((c: any) => c.text)
  const toolUses = content.filter((c: any) => c.type === 'tool_use')
  const message: any = { role: 'assistant', content: texts.join('') || null }
  if (toolUses.length > 0) {
    message.tool_calls = toolUses.map((tc: any) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: JSON.stringify(tc.input ?? {}) },
    }))
    if (!message.content) message.content = null
  }
  return {
    id: json.id ?? `msg_${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [{
      index: 0,
      message,
      finish_reason: json.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      logprobs: null,
    }],
    usage: {
      // Meme regle que dans le flux : on recompose le total d'entree, cache
      // compris, et on expose la part relue pour la facturation.
      prompt_tokens:
        (json.usage?.input_tokens ?? 0) +
        (json.usage?.cache_read_input_tokens ?? 0) +
        (json.usage?.cache_creation_input_tokens ?? 0),
      completion_tokens: json.usage?.output_tokens ?? 0,
      total_tokens:
        (json.usage?.input_tokens ?? 0) +
        (json.usage?.cache_read_input_tokens ?? 0) +
        (json.usage?.cache_creation_input_tokens ?? 0) +
        (json.usage?.output_tokens ?? 0),
      prompt_cache_hit_tokens: json.usage?.cache_read_input_tokens ?? 0,
    },
  }
}

// Transforms Anthropic SSE → OpenAI SSE
function anthropicStreamToOpenAI(
  stream: ReadableStream<Uint8Array>,
  modelId: string,
  usage?: UpstreamUsage,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  const msgId = `chatcmpl-${Date.now()}`
  // Map: Anthropic content block index → OpenAI tool_call index
  const blockToToolIndex = new Map<number, number>()
  let nextToolIndex = 0

  return stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.slice(6).trim()
        if (!dataStr) continue

        let event: any
        try { event = JSON.parse(dataStr) } catch { continue }

        const emit = (delta: any, finishReason: string | null = null) => {
          const c: any = { id: msgId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: modelId, choices: [{ index: 0, delta, finish_reason: finishReason, logprobs: null }] }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`))
        }

        if (event.type === 'message_start' && usage) {
          // `input_tokens` chez Anthropic ne compte QUE le reste non mis en
          // cache. Le total d'entree est donc la somme des trois, et c'est ce
          // total que la facturation doit voir : sans ca, un prefixe
          // integralement relu afficherait une entree quasi nulle et la
          // remise serait appliquee deux fois.
          const u = event.message?.usage ?? {}
          const fresh = u.input_tokens ?? 0
          const read = u.cache_read_input_tokens ?? 0
          const written = u.cache_creation_input_tokens ?? 0
          usage.inputTokens = fresh + read + written
          usage.cachedInputTokens = read
          if (typeof u.output_tokens === 'number') usage.outputTokens = u.output_tokens
        } else if (event.type === 'message_delta' && usage && event.usage?.output_tokens != null) {
          usage.outputTokens = event.usage.output_tokens
        }

        if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
          const toolIdx = nextToolIndex++
          blockToToolIndex.set(event.index, toolIdx)
          emit({ tool_calls: [{ index: toolIdx, id: event.content_block.id, type: 'function', function: { name: event.content_block.name, arguments: '' } }] })
        } else if (event.type === 'content_block_delta') {
          const d = event.delta
          if (d?.type === 'text_delta') {
            emit({ content: d.text })
          } else if (d?.type === 'input_json_delta') {
            const toolIdx = blockToToolIndex.get(event.index)
            if (toolIdx !== undefined) {
              emit({ tool_calls: [{ index: toolIdx, function: { arguments: d.partial_json } }] })
            }
          }
        } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
          emit({}, event.delta.stop_reason === 'tool_use' ? 'tool_calls' : 'stop')
        } else if (event.type === 'message_stop') {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    },
  }))
}

// ── Gemini ────────────────────────────────────────────────────────────────────

/**
 * Traduit le contenu d'un message du format OpenAI vers celui de Gemini.
 *
 * Le code precedent faisait `JSON.stringify(msg.content)` : une capture
 * d'ecran devenait des centaines de milliers de caracteres de base64
 * envoyes comme de la prose. Pas d'erreur visible, mais le modele recevait
 * du bruit et le quota de l'utilisateur fondait pour rien.
 */
function toGeminiParts(content: any): any[] {
  if (typeof content === 'string') return [{ text: content }]
  if (!Array.isArray(content)) return [{ text: String(content ?? '') }]

  const parts = content
    .map((p: any) => {
      if (!p || typeof p !== 'object') return null
      if (p.type === 'text') return { text: p.text ?? '' }
      if (p.type === 'image_url') {
        const url = p.image_url?.url ?? p.image_url
        if (typeof url !== 'string') return null
        const m = url.match(/^data:([^;,]+);base64,(.*)$/)
        if (m) return { inlineData: { mimeType: m[1], data: m[2] } }
        if (/^https?:\/\//.test(url)) return { fileData: { mimeType: 'image/*', fileUri: url } }
        return null
      }
      return null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts : [{ text: '' }]
}

function buildGeminiContents(messages: any[]): any[] {
  const result: any[] = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'system') { i++; continue }

    if (msg.role === 'tool') {
      const parts: any[] = []
      while (i < messages.length && messages[i].role === 'tool') {
        parts.push({
          functionResponse: {
            name: messages[i].name ?? 'tool_result',
            response: { content: messages[i].content ?? '' },
          },
        })
        i++
      }
      result.push({ role: 'user', parts })
      continue
    }

    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
      const parts: any[] = []
      if (msg.content) parts.push({ text: msg.content })
      for (const tc of msg.tool_calls) {
        let args: any = {}
        try { args = JSON.parse(tc.function.arguments) } catch { /* use {} */ }
        parts.push({ functionCall: { name: tc.function.name, args } })
      }
      result.push({ role: 'model', parts })
      i++
      continue
    }

    const role = msg.role === 'assistant' ? 'model' : 'user'
    result.push({ role, parts: toGeminiParts(msg.content) })
    i++
  }
  return result
}

function buildGeminiBody(body: any): any {
  const system = body.messages
    .filter((m: any) => m.role === 'system')
    .map((m: any) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n')

  const req: any = {
    contents: buildGeminiContents(body.messages),
    generationConfig: {
      temperature: body.temperature ?? 0.7,
      maxOutputTokens: body.max_tokens ?? 4096,
    },
  }
  if (system) req.systemInstruction = { parts: [{ text: system }] }
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    req.tools = [{
      functionDeclarations: body.tools.map((t: any) => ({
        name: t.function?.name ?? t.name,
        description: t.function?.description ?? t.description ?? '',
        parameters: t.function?.parameters ?? { type: 'OBJECT', properties: {} },
      })),
    }]
  }
  return req
}

function geminiNonStreamingToOpenAI(json: any, modelId: string): any {
  const candidate = json.candidates?.[0]
  const parts: any[] = candidate?.content?.parts ?? []
  const texts = parts.filter((p: any) => p.text != null).map((p: any) => p.text)
  const toolCalls = parts.filter((p: any) => p.functionCall).map((p: any, idx: number) => ({
    id: `call_g${Date.now()}_${idx}`,
    type: 'function',
    function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
  }))
  const message: any = { role: 'assistant', content: texts.join('') || null }
  if (toolCalls.length > 0) { message.tool_calls = toolCalls; message.content ??= null }
  return {
    id: `chatcmpl-g${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: modelId,
    choices: [{ index: 0, message, finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop', logprobs: null }],
    usage: {
      prompt_tokens: json.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens: json.usageMetadata?.totalTokenCount ?? 0,
      prompt_cache_hit_tokens: json.usageMetadata?.cachedContentTokenCount ?? 0,
    },
  }
}

// Transforms Gemini SSE → OpenAI SSE
function geminiStreamToOpenAI(
  stream: ReadableStream<Uint8Array>,
  modelId: string,
  usage?: UpstreamUsage,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  const msgId = `chatcmpl-g${Date.now()}`
  let toolCallIndex = 0

  return stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.slice(6).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        let event: any
        try { event = JSON.parse(dataStr) } catch { continue }

        if (usage && event.usageMetadata) {
          // Google ne facture pas separement la mise en cache implicite : le
          // prefixe retrouve apparait dans `cachedContentTokenCount`, deja
          // compris dans `promptTokenCount`.
          const m = event.usageMetadata
          if (typeof m.promptTokenCount === 'number') usage.inputTokens = m.promptTokenCount
          if (typeof m.cachedContentTokenCount === 'number') {
            usage.cachedInputTokens = m.cachedContentTokenCount
          }
          if (typeof m.candidatesTokenCount === 'number') usage.outputTokens = m.candidatesTokenCount
        }

        const candidate = event.candidates?.[0]
        if (!candidate) continue

        const parts: any[] = candidate.content?.parts ?? []
        for (const part of parts) {
          let delta: any = null
          if (part.text != null) {
            delta = { content: part.text }
          } else if (part.functionCall) {
            const idx = toolCallIndex++
            delta = {
              tool_calls: [{ index: idx, id: `call_g${Date.now()}_${idx}`, type: 'function', function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args ?? {}) } }],
            }
          }
          if (delta) {
            const c = { id: msgId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: modelId, choices: [{ index: 0, delta, finish_reason: null, logprobs: null }] }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`))
          }
        }

        if (candidate.finishReason) {
          const fr = candidate.finishReason === 'STOP' ? 'stop' : 'tool_calls'
          const c = { id: msgId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: modelId, choices: [{ index: 0, delta: {}, finish_reason: fr, logprobs: null }] }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(c)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        }
      }
    },
    flush(controller) {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    },
  }))
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const [userId, body] = await Promise.all([verifyToken(token), req.json()])
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Validate messages
    const { messages, model: preferredModel, stream = true, ...rest } = body
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 })
    }
    if (messages.length > 200) {
      return NextResponse.json({ error: 'Too many messages (max 200)' }, { status: 400 })
    }
    let totalChars = 0
    for (const msg of messages) {
      if (typeof msg !== 'object' || msg === null) {
        return NextResponse.json({ error: 'Each message must be an object' }, { status: 400 })
      }
      if (!['user', 'assistant', 'system', 'tool'].includes(msg.role)) {
        return NextResponse.json({ error: `Invalid role: "${msg.role}"` }, { status: 400 })
      }
      totalChars += typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content ?? '').length
    }
    // Garde-fou grossier contre l'abus uniquement : la vraie limite depend du
    // modele retenu et se verifie plus bas, une fois celui-ci connu. Le plus
    // grand contexte du catalogue est de 1 M de jetons, soit environ 4 M de
    // caracteres ; on laisse une marge au-dela.
    if (totalChars > 5_000_000) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }

    // Plan check
    const userPlan = await getUserPlan(userId)

    // Membre d'une equipe : c'est le pot commun qui fait foi, pas le plan
    // personnel. Un membre sans abonnement propre doit pouvoir travailler
    // sur les credits de son organisation.
    const org = await resolveOrg(userId)
    const orgRemaining = org
      ? await getOrgRemainingCredits(supabase, org)
      : null

    const limitReached = org
      ? orgRemaining !== null && orgRemaining <= 0
        ? String(orgCreditLimit(org))
        : null
      : await checkMonthlyLimit(userId, userPlan)
    if (limitReached) {
      const now = new Date()
      const retryAfter = (await getQuotaWindow(userId, now)).secondsUntilReset
      return NextResponse.json(
        { error: org
            ? `Your team has used all its credits (${limitReached}). Ask an administrator of ${org.name} to add seats.`
            : `Monthly token limit reached (${limitReached}). Upgrade your plan to continue.`,
          code: 'MONTHLY_LIMIT_REACHED', plan: userPlan, limit: Number(limitReached), retry_after: retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const { candidates, complexity, downgraded: plannedDowngrade } =
      getFailoverCandidates(userPlan, preferredModel as ModelId, messages)

    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No model available for this plan' }, { status: 500 })
    }

    let maxTokens = Math.min(rest.max_tokens ?? MAX_TOKENS_PER_PLAN[userPlan] ?? 4096, MAX_TOKENS_PER_PLAN[userPlan] ?? 4096)

    /**
     * Adapter la requete au solde, au lieu de la refuser.
     *
     * checkMonthlyLimit() ne bloque qu'a zero credit. Entre les deux, un
     * utilisateur qui voit encore du solde doit obtenir une reponse, meme
     * courte, meme sur un modele moins cher — et aller au bout de ses credits
     * plutot que de se heurter a un mur.
     *
     * Deux leviers, dans cet ordre :
     *   1. choisir le premier candidat dont l'entree tient dans le solde — les
     *      candidats sont deja tries, les moins chers suivent ;
     *   2. plafonner la reponse a ce que le reliquat permet de produire.
     */
    const MIN_USEFUL_OUTPUT = 256
    const remaining =
      orgRemaining !== null
        ? orgRemaining
        : await getRemainingCredits(userId, userPlan)
    let budgetNote: string | null = null

    if (Number.isFinite(remaining)) {
      // Estimation par candidat : la remise de cache attendue depend du
      // fournisseur, et compter plein tarif un prefixe deja en cache faisait
      // declasser et tronquer des requetes largement finançables.
      const billableInput = (m: AIModel) => expectedBillableInput(m.id, messages as any[])
      const affordableIndex = candidates.findIndex(
        (c) => computeCreditsConsumed(c.id, billableInput(c), MIN_USEFUL_OUTPUT) <= remaining
      )

      // Aucun modele ne tient, meme le moins cher : on garde le moins cher et
      // on reduit la reponse au maximum. Mieux vaut trois phrases que rien.
      const chosen = affordableIndex >= 0 ? affordableIndex : candidates.length - 1
      if (chosen > 0) {
        const [cheaper] = candidates.splice(chosen, 1)
        candidates.unshift(cheaper)
        budgetNote = `switched to ${cheaper.name} to fit your remaining credits`
      }

      const head = candidates[0]
      const inputCost = computeCreditsConsumed(head.id, billableInput(head), 0)
      const leftForOutput = Math.max(0, remaining - inputCost)
      const affordableOutput = Math.floor(leftForOutput / getCreditMultiplier(head.id))
      if (affordableOutput < maxTokens) {
        // Au moins une reponse breve : on ne descend jamais sous 64 jetons,
        // sinon le modele s'arrete au milieu d'un mot et le credit est perdu
        // pour rien.
        maxTokens = Math.max(64, affordableOutput)
        if (!budgetNote) budgetNote = 'response shortened to fit your remaining credits'
      }
    }

    /**
     * La limite par requete suit la fenetre de contexte du modele retenu, et
     * non plus un plafond fixe.
     *
     * Elle valait 200 000 caracteres — environ 50 000 jetons — fixes avant le
     * passage en generation 5, ou les contextes sont montes a 1 M de jetons.
     * En mode agent chaque fichier lu s'ajoute a la conversation : l'agent
     * tombait sur « Content too large » apres quelques lectures, alors que le
     * modele pouvait en absorber vingt fois plus.
     *
     * On reserve la place de la reponse et on compte quatre caracteres par
     * jeton, l'approximation deja utilisee par estimateTokens().
     */
    const primary = candidates[0]
    const maxInputChars = Math.max(0, primary.contextWindow - maxTokens) * 4
    if (totalChars > maxInputChars) {
      return NextResponse.json(
        {
          // Le nom du modele reellement servi ne doit pas apparaitre : le
          // choix du modele se fait derriere, et l'utilisateur a selectionne
          // autre chose. Afficher « trop long pour Claude Haiku » a quelqu'un
          // qui a choisi Opus trahit la substitution sans rien lui apprendre
          // d'utile — la limite et la marche a suivre suffisent.
          error: `Conversation too long: ${Math.round(totalChars / 4).toLocaleString('en-US')} tokens for a ${primary.contextWindow.toLocaleString('en-US')}-token window. Start a new chat, or compact this one.`,
          code: 'CONTEXT_EXCEEDED',
          context_window: primary.contextWindow,
        },
        { status: 400 }
      )
    }

    /** Retire les images quand le modèle retenu ne sait pas les lire (sinon 400 côté provider). */
    const messagesFor = (model: AIModel) =>
      hasImageContent(messages) && !model.supportsVision
        ? (messages as any[]).map((msg: any) => {
            if (!Array.isArray(msg.content)) return msg
            const textParts = msg.content.filter((p: any) => p.type !== 'image_url' && p.type !== 'image')
            const text = textParts.map((p: any) => p.text ?? '').join(' ').trim()
            return { ...msg, content: text || '[Image non supportée par ce modèle]' }
          })
        : messages

    const sendUpstream = (model: AIModel, modelRoute: any, apiKey: string, msgs: any[]) => {
      if (modelRoute.format === 'openai') {
        return fetch(modelRoute.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            ...rest,
            model: model.apiIdentifier,
            messages: msgs,
            stream,
            max_tokens: maxTokens,
            // DeepSeek met son contexte en cache tout seul, cote serveur : il
            // n'y a rien a demander, mais le decompte des jetons relus ne
            // remonte qu'avec ce drapeau. Sans lui, on continuerait a
            // facturer un contexte identique au plein tarif alors qu'il ne
            // nous coute plus rien. Le morceau de fin qu'il ajoute (un
            // `usage` avec un `choices` vide) est retire du flux par
            // trackOutputStream, donc le client ne voit aucun changement.
            ...(stream ? { stream_options: { include_usage: true } } : {}),
          }),
        })
      }
      if (modelRoute.format === 'anthropic') {
        const anthropicBody = buildAnthropicBody({ ...rest, messages: msgs, stream, max_tokens: maxTokens }, model.apiIdentifier)
        return fetch(modelRoute.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(anthropicBody),
        })
      }
      const geminiBody = buildGeminiBody({ ...rest, messages: msgs, max_tokens: maxTokens })
      const endpoint = stream
        ? `${modelRoute.baseUrl}/models/${model.apiIdentifier}:streamGenerateContent?alt=sse`
        : `${modelRoute.baseUrl}/models/${model.apiIdentifier}:generateContent`
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(geminiBody),
      })
    }

    // Une panne de fournisseur ne doit pas remonter a l'utilisateur tant qu'un
    // autre modele de son plan peut repondre. On se limite a trois tentatives :
    // au-dela, l'attente cumulee coute plus cher a l'utilisateur que l'echec.
    const MAX_ATTEMPTS = 3
    /**
     * 429 = quota fournisseur, 5xx = panne passagere : un autre modele vaut la
     * peine. S'y ajoute le compte a sec, que les fournisseurs signalent par un
     * 400 ou un 402 et non par un 429 — Anthropic repond « Your credit balance
     * is too low to access the Anthropic API ».
     *
     * Sans ce cas, une ardoise vide chez UN fournisseur coupait le service
     * entier : l'utilisateur recevait l'erreur brute alors que DeepSeek et
     * Gemini, payes et disponibles, figuraient dans ses candidats.
     *
     * On reste strict sur le reste : un 400 de requete malformee se
     * reproduirait a l'identique ailleurs, et reessayer ne ferait que retarder
     * l'erreur de trois appels.
     */
    const OUT_OF_CREDIT =
      /credit balance|insufficient[_ ]quota|insufficient credit|exceeded your current quota|billing|payment required|RESOURCE_EXHAUSTED|quota exceeded/i
    const worthRetrying = (status: number, body = '') =>
      status === 429 ||
      status >= 500 ||
      ((status === 400 || status === 402 || status === 403) &&
        OUT_OF_CREDIT.test(body))

    let selectedModel: AIModel | null = null
    let route: any = null
    let upstreamResp: Response | null = null
    let effectiveMessages: any[] = messages
    let lastFailure: { status: number; text: string; modelId: string } | null = null
    const attempted: string[] = []

    for (const candidate of candidates.slice(0, MAX_ATTEMPTS)) {
      const candidateRoute = API_ROUTES[candidate.id]
      if (!candidateRoute) continue

      const apiKey = process.env[candidateRoute.keyEnv]
      // Cle absente = modele non deployable : on passe au suivant plutot que
      // de renvoyer une erreur serveur alors qu'un autre modele repondrait.
      if (!apiKey) continue

      attempted.push(candidate.id)
      const msgs = messagesFor(candidate)
      const resp = await sendUpstream(candidate, candidateRoute, apiKey, msgs)

      if (resp.ok) {
        selectedModel = candidate
        route = candidateRoute
        upstreamResp = resp
        effectiveMessages = msgs
        break
      }

      const errorText = await resp.text()
      console.error(`[model-proxy] upstream ${resp.status} from ${candidate.id}:`, errorText)
      lastFailure = { status: resp.status, text: errorText, modelId: candidate.id }

      // Erreur imputable a la requete (400, 401, 403...) : reessayer ailleurs
      // donnerait le meme resultat.
      if (!worthRetrying(resp.status, errorText)) break
    }

    if (!selectedModel || !route || !upstreamResp) {
      if (!lastFailure) {
        return NextResponse.json({ error: 'No model available for this plan' }, { status: 500 })
      }
      if (lastFailure.status === 429) {
        // Le SDK OpenAI ne lit que le champ "error" (chaîne courte) sur les
        // erreurs de streaming - il ignore silencieusement "details". Sans
        // le vrai message dedans, la console ne montre jamais que "Upstream
        // rate limit exceeded" et on ne sait pas CE QUE dit le fournisseur.
        return NextResponse.json(
          {
            // Le produit parle anglais ; ce message etait reste en francais.
            error: `All available models are busy right now (tried: ${attempted.join(', ')}). Please try again in a moment.`,
            // Distingue la saturation passagere — qui vaut la peine d'etre
            // reessayee — du quota mensuel epuise, qui ne bougera pas avant la
            // remise a zero. Sans ce code, le client reessayait neuf fois une
            // erreur definitive.
            code: 'UPSTREAM_SATURATED',
            retry_after: 60,
            models_attempted: attempted,
            details: lastFailure.text,
          },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
      // Le corps brut du fournisseur nomme son service et son portail de
      // facturation (« Please go to Plans & Billing… ») : ce sont nos comptes,
      // pas ceux de l'utilisateur. On journalise le detail et on ne renvoie
      // qu'un message qui le concerne.
      if (OUT_OF_CREDIT.test(lastFailure.text)) {
        console.error(
          `[model-proxy] credit epuise chez ${lastFailure.modelId} (essayes : ${attempted.join(', ')}) :`,
          lastFailure.text
        )
        return NextResponse.json(
          {
            error:
              'Service temporarily unavailable. Our team has been notified — please try again shortly.',
            code: 'UPSTREAM_UNAVAILABLE',
            models_attempted: attempted,
          },
          { status: 503, headers: { 'Retry-After': '120' } }
        )
      }
      return NextResponse.json({ error: lastFailure.text }, { status: lastFailure.status })
    }

    // Vrai pour l'utilisateur : le modele qui repond n'est pas celui demande,
    // que ce soit a cause du plan ou d'un fournisseur saturé.
    const downgraded = plannedDowngrade || (!!preferredModel && selectedModel.id !== preferredModel)
    const failedOver = attempted.length > 1

    // Usage tracking context — credits are weighted by the model's cost multiplier
    const inputTokens = estimateTokens(messages)
    const upstreamUsage: UpstreamUsage = {}
    const usageCtx: UsageContext = {
      userId,
      plan: userPlan,
      modelId: selectedModel.id,
      inputTokens,
      preferred: (preferredModel as string) || null,
      complexity,
      downgraded,
      upstream: upstreamUsage,
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Nexora-Model': selectedModel.id,
      'X-Nexora-Downgraded': String(downgraded),
      'X-Nexora-Complexity': String(complexity),
      // Distingue « pas dans ton plan » de « le fournisseur etait saturé » :
      // le client peut ainsi l'expliquer au lieu de laisser croire que le
      // modele demande a repondu.
      'X-Nexora-Failover': String(failedOver),
      // Dit pourquoi la reponse differe de ce qui etait demande quand le solde
      // a impose un modele moins cher ou une reponse plus courte. Sans ca,
      // l'utilisateur constate une reponse tronquee sans comprendre.
      ...(budgetNote ? { 'X-Nexora-Budget': budgetNote } : {}),
      'X-Nexora-Requested-Model': (preferredModel as string) || selectedModel.id,
    }

    // Helper: estimate output tokens from a non-streamed OpenAI-format completion
    const recordFromJson = async (json: any) => {
      const content = json?.choices?.[0]?.message?.content
      const u = json?.usage
      readOpenAIUsage(u, upstreamUsage)
      const outTokens =
        typeof u?.completion_tokens === 'number'
          ? u.completion_tokens
          : Math.ceil((typeof content === 'string' ? content.length : 0) / 4)
      await recordUsage(usageCtx, outTokens)
    }

    // For OpenAI format: pass through, counting output
    if (route.format === 'openai') {
      if (stream && upstreamResp.body) {
        return new NextResponse(trackOutputStream(upstreamResp.body, usageCtx), { status: 200, headers: responseHeaders })
      }
      const json = await upstreamResp.json()
      await recordFromJson(json)
      return NextResponse.json(json, {
        headers: {
          'X-Nexora-Model': selectedModel.id,
          'X-Nexora-Downgraded': String(downgraded),
          'X-Nexora-Failover': String(failedOver),
          'X-Nexora-Requested-Model': (preferredModel as string) || selectedModel.id,
        },
      })
    }

    // For Anthropic: convert SSE or JSON to OpenAI format
    if (route.format === 'anthropic') {
      if (stream) {
        const converted = anthropicStreamToOpenAI(upstreamResp.body!, selectedModel.id, upstreamUsage)
        return new NextResponse(trackOutputStream(converted, usageCtx), { status: 200, headers: responseHeaders })
      } else {
        const json = await upstreamResp.json()
        const converted = anthropicNonStreamingToOpenAI(json, selectedModel.id)
        await recordFromJson(converted)
        return NextResponse.json(converted, { headers: { 'X-Nexora-Model': selectedModel.id } })
      }
    }

    // For Gemini: convert SSE or JSON to OpenAI format
    if (stream) {
      const converted = geminiStreamToOpenAI(upstreamResp.body!, selectedModel.id, upstreamUsage)
      return new NextResponse(trackOutputStream(converted, usageCtx), { status: 200, headers: responseHeaders })
    } else {
      const json = await upstreamResp.json()
      const converted = geminiNonStreamingToOpenAI(json, selectedModel.id)
      await recordFromJson(converted)
      return NextResponse.json(converted, { headers: { 'X-Nexora-Model': selectedModel.id } })
    }
  } catch (err) {
    console.error('[model-proxy] error:', err)
    captureServerError(err, { route: 'model-proxy/chat/completions' })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
