export type ModelId = 'deepseek-chat' | 'gemini-flash' | 'gemini-pro' | 'claude-haiku' | 'claude-sonnet' | 'claude-opus'

export type PlanId = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

export interface AIModel {
  id: ModelId
  name: string
  provider: string
  apiIdentifier: string
  apiBaseUrl: string
  inputCostPer1K: number
  outputCostPer1K: number
  contextWindow: number
  capability: number
  sortOrder: number
  supportsVision: boolean
  /**
   * Cout relatif en credits. DeepSeek V3 (1.25x) sert de reference.
   *
   * Les valeurs sont calees sur le cout reel d'appel, pas choisies a la main :
   * a ces multiplicateurs, un million de credits coute ~0.349$ quel que soit le
   * modele. Les precedentes penalisaient Claude d'un facteur 4 a 5 — Opus etait
   * a 375 pour un cout equivalent a 77 — ce qui ne rapportait rien et reduisait
   * un plan Pro a cinq echanges en mode agent sur Sonnet.
   *
   * A recalculer si les tarifs des fournisseurs bougent : le rapport entre
   * multiplicateurs doit suivre le rapport entre prix d'API.
   */
  creditMultiplier: number
}

export interface Plan {
  id: PlanId
  name: string
  nameFr: string
  price: number
  priceLabel: string
  tokensPerMonth: number
  maxRequestsPerDay: number
  // Appels /api/proxy/web (recherche) et /api/proxy/crawl (crawl) autorisés
  // par mois — Tavily facture au call, pas au token, donc distinct de
  // tokensPerMonth. Voir lib/quota.ts. 99999 = illimité (Enterprise).
  webSearchesPerMonth: number
  webCrawlsPerMonth: number
  // Nombre max de personnes dans une session de collaboration (propriétaire
  // inclus). 99999 = illimité (Enterprise).
  maxCollaborators: number
  // Durée de l'abonnement en jours. Absent = mensuel (≈30j). Utilisé pour les
  // forfaits test (7j / 14j).
  models: ModelId[]
  modelsLabel?: string
  features: string[]
  popular?: boolean
  // Forfait de test temporaire (à désactiver après les tests).
}

interface ComplexMessage {
  content?: string
  role?: string
}

const GREETING_PATTERNS = /^(salut|bonjour|bonsoir|coucou|hello|hi|hey|merci|oui|non|ok|okay|d'accord|super|parfait)\b/i
const CODE_PATTERNS = /```|\b(function|class|import\s|export\s|const\s+\w+\s*=\s*\(|=>|interface\s|type\s|async\s|await\s|Promise|new\s+\w+\(|\.map\(|\.filter\(|\.reduce\()/
const TECHNICAL_TERMS = /\b(refactor|architecture|optimis|pattern\s+[a-z]|algorithme|asynchrone|performances?|sécurité|design\s+pattern|scalabilit|déploiement|microservice|api\s+rest|graphql|middleware|middleware|endpoint|thread|mutex|deadlock|race\s+condition|compliquit|big\s*o|time\s*complexity|espace\s*complexit)\b/i
const COMPLEX_TERMS = /\b(architect|refactor|cache|cluster|load\s+balanc|index\s+compos|re-render|bundler|lazy\s+load|stream|webhook|orm|transaction|sharding|replicat|failover|container|docker|kubernetes|ci\/cd)\b/i

export const MODELS: Record<ModelId, AIModel> = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Flash',
    provider: 'DeepSeek',
    apiIdentifier: 'deepseek-flash',
    apiBaseUrl: 'https://api.deepseek.com/v1/chat/completions',
    inputCostPer1K: 0.0003,
    outputCostPer1K: 0.0012,
    contextWindow: 64000,
    capability: 3,
    sortOrder: 1,
    supportsVision: false,
    // 1.25 et non 1 : a multiplicateur 1, un credit DeepSeek coute son prix
    // brut, sans marge. C'est le modele par defaut, donc le plus consomme, et
    // le seul sur lequel un quota epuise pouvait passer sous le cout — jusqu'a
    // -4$ sur un plan Business dont le client genere beaucoup de code. Les
    // modeles Claude, eux, sont facturees ~5x leur cout relatif et n'ont jamais
    // pose ce probleme. 1.25 couvre le pire cas calcule (1.18) avec une marge.
    creditMultiplier: 1.25,
  },
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google',
    // gemini-2.0-flash a été arrêté par Google le 1er juin 2026 (404 sur
    // generateContent) - gemini-3.8-flash est le modèle Flash stable actuel.
    // ATTENTION : Google double ce tarif le 1er janvier 2027 (1.50$/7.50$).
    // Il faudra alors passer le multiplicateur de 4 à 8, sinon on vend à perte.
    apiIdentifier: 'gemini-3.8-flash',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    inputCostPer1K: 0.00075,
    outputCostPer1K: 0.00375,
    contextWindow: 1000000,
    capability: 2,
    sortOrder: 2,
    supportsVision: true,
    creditMultiplier: 4,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    // gemini-2.0-pro puis gemini-2.5-pro (fix précédent) n'existent plus -
    // Google renvoie désormais lui-même dans son erreur 404 le nom du
    // modèle de remplacement ("update your code to use
    // models/gemini-3.1-pro-preview"). Les modèles Gemini tournent vite :
    // si ça recasse, vérifier le message d'erreur exact de Google avant de
    // deviner un nom.
    apiIdentifier: 'gemini-3.1-pro-preview',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent',
    inputCostPer1K: 0.002,
    outputCostPer1K: 0.012,
    contextWindow: 1000000,
    capability: 3,
    sortOrder: 3,
    supportsVision: true,
    creditMultiplier: 12,
  },
  'claude-haiku': {
    id: 'claude-haiku',
    name: 'Claude Haiku 5.5',
    provider: 'Anthropic',
    apiIdentifier: 'claude-haiku-5-5',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.0001,
    outputCostPer1K: 0.0005,
    contextWindow: 1000000,
    capability: 3,
    sortOrder: 4,
    supportsVision: true,
    creditMultiplier: 1,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 5.5',
    provider: 'Anthropic',
    apiIdentifier: 'claude-sonnet-5-5',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.002,
    outputCostPer1K: 0.010,
    contextWindow: 1000000,
    capability: 4,
    sortOrder: 5,
    supportsVision: true,
    creditMultiplier: 11,
  },
  'claude-opus': {
    id: 'claude-opus',
    name: 'Claude Opus 5.5',
    provider: 'Anthropic',
    apiIdentifier: 'claude-opus-5-5',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.004,
    outputCostPer1K: 0.020,
    contextWindow: 1000000,
    capability: 5,
    sortOrder: 6,
    supportsVision: true,
    creditMultiplier: 22,
  },
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    nameFr: 'Découverte',
    price: 0,
    priceLabel: '$0',
    // 500k : a 100 000 credits, deux echanges en mode agent suffisaient a
    // tout epuiser — un prospect ne pouvait pas se faire d'avis. A 500k il
    // en a une douzaine, assez pour tester l'agent sur du vrai code.
    // Coute au pire 0.30$ par compte entierement consomme (0.09$ sur Haiku
    // 5.5, le modele par defaut), plafonne par la limite de deux comptes
    // par machine. Ne pas remonter sans refaire le calcul d'exposition :
    // c'est la seule ligne du produit que personne ne paie.
    tokensPerMonth: 500000,
    maxRequestsPerDay: 200,
    webSearchesPerMonth: 30,
    webCrawlsPerMonth: 5,
    maxCollaborators: 1,
    models: [
      'deepseek-chat',
      'gemini-flash',
      'claude-haiku',
    ],
    features: [
      '500K credits/month',
      '200 requests/day',
      'DeepSeek Flash & Claude Haiku 5.5',
      'AI chat + autocomplete',
      'Basic Agent mode',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    nameFr: 'Starter',
    price: 5,
    priceLabel: '$5',
    tokensPerMonth: 4000000,
    maxRequestsPerDay: 500,
    webSearchesPerMonth: 200,
    webCrawlsPerMonth: 25,
    maxCollaborators: 2,
    models: [
      'deepseek-chat',
      'gemini-flash',
      'claude-haiku',
      'gemini-pro',
      'claude-sonnet',
    ],
    features: [
      '4M credits/month',
      '500 requests/day',
      '+ Claude Sonnet 5.5 & Gemini 3.1 Pro',
      'Advanced autocomplete',
      'Full Agent mode',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameFr: 'Pro',
    price: 12,
    priceLabel: '$12',
    tokensPerMonth: 15000000,
    maxRequestsPerDay: 2000,
    webSearchesPerMonth: 800,
    webCrawlsPerMonth: 100,
    maxCollaborators: 5,
    models: [
      'deepseek-chat',
      'gemini-flash',
      'claude-haiku',
      'gemini-pro',
      'claude-sonnet',
      'claude-opus',
    ],
    modelsLabel: 'DeepSeek, Gemini, Claude Haiku, Sonnet & Opus',
    features: [
      '15M credits/month',
      '2,000 requests/day',
      '+ Claude Opus 5.5',
      'Full codebase indexing',
      'Priority support',
    ],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    nameFr: 'Business',
    price: 30,
    priceLabel: '$30',
    tokensPerMonth: 40000000,
    maxRequestsPerDay: 5000,
    webSearchesPerMonth: 2500,
    webCrawlsPerMonth: 300,
    maxCollaborators: 20,
    models: [
      'deepseek-chat',
      'gemini-flash',
      'claude-haiku',
      'gemini-pro',
      'claude-sonnet',
      'claude-opus',
    ],
    features: [
      '40M credits/month',
      '5,000 requests/day',
      'All models, no limits',
      'Team mode + direct API access',
      'Dedicated support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Enterprise',
    // Facture par siege : 35$/dev/mois, 10 sieges minimum = 350$ plancher.
    // `price` reste le plancher par siege pour les calculs de quota existants.
    price: 35,
    priceLabel: 'from $35',
    // 40M par siege, mis en commun pour l'equipe. A 35$/siege, un siege
    // entierement consomme sur le modele le plus cher coute au pire 24$ :
    // la marge reste positive. 100M/siege mettait le plan en perte de 27$.
    tokensPerMonth: 40000000,
    maxRequestsPerDay: 99999,
    webSearchesPerMonth: 99999,
    webCrawlsPerMonth: 99999,
    maxCollaborators: 99999,
    models: [
      'deepseek-chat',
      'gemini-flash',
      'claude-haiku',
      'gemini-pro',
      'claude-sonnet',
      'claude-opus',
    ],
    features: [
      '40M credits per seat, pooled',
      'Unlimited requests',
      'All models + team mode',
      'SSO + 24/7 support + SLA',
      '10 seats minimum',
    ],
  },
}

export function getModelsForPlan(planId: PlanId): ModelId[] {
  return PLANS[planId].models
}

/** Multiplicateur de crédit d'un modèle (défaut 1x si inconnu). */
export function getCreditMultiplier(modelId: string): number {
  return MODELS[modelId as ModelId]?.creditMultiplier ?? 1
}

/**
 * Calcule les crédits (= tokens pondérés) consommés par une requête.
 * On pondère les tokens réels par le coût relatif du modèle, de sorte qu'un
 * modèle cher (Opus 5x) consomme bien plus du quota qu'un modèle bon marché (DeepSeek 0.25x).
 */
export function computeCreditsConsumed(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const totalTokens = inputTokens + outputTokens
  return Math.ceil(totalTokens * getCreditMultiplier(modelId))
}

// Limite mensuelle du plan. `userCreatedAt` n'est plus utilisé pour un bonus
// premier mois (tous les plans ont un montant mensuel fixe désormais), mais
// reste dans la signature pour ne pas casser les appelants existants.
export function getEffectiveTokenLimit(planId: PlanId, userCreatedAt?: string): number {
  return PLANS[planId].tokensPerMonth
}

/**
 * Un message multimodal (image jointe) a un `content` en tableau de parts
 * ({type: "text"|"image_url", ...}), pas une chaîne - .trim() dessus levait
 * une TypeError et faisait planter tout /chat/completions en 500 dès qu'une
 * image était envoyée. On n'en extrait que le texte.
 */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p?.type === 'text' && typeof p.text === 'string')
      .map((p: any) => p.text)
      .join(' ')
  }
  return ''
}

function getLastMessage(messages: ComplexMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = extractText(messages[i]?.content)
    if (content.trim().length > 0) return content
  }
  return ''
}

function isGreeting(text: string): boolean {
  return GREETING_PATTERNS.test(text.trim())
}

function hasCode(text: string): boolean {
  return CODE_PATTERNS.test(text)
}

function countTechnicalTerms(text: string): number {
  const techMatches = text.match(TECHNICAL_TERMS)
  const complexMatches = text.match(COMPLEX_TERMS)
  return (techMatches?.length || 0) + (complexMatches?.length || 0)
}

function hasCodeBlocks(text: string): boolean {
  return (text.match(/```/g) || []).length >= 2
}

function estimateOutputLength(messages: ComplexMessage[]): number {
  let totalChars = 0
  for (const msg of messages) {
    totalChars += msg.content?.length || 0
  }
  return totalChars
}

export function analyzeComplexity(messages: ComplexMessage[]): number {
  const lastMsg = getLastMessage(messages)
  const totalLen = estimateOutputLength(messages)
  const msgCount = messages.length

  let score = 0

  // Axe 1 : Longueur du dernier message
  if (lastMsg.length < 30) score += 1
  else if (lastMsg.length < 100) score += 2
  else if (lastMsg.length < 350) score += 3
  else if (lastMsg.length < 1000) score += 4
  else score += 5

  // Axe 2 : Volume total de la conversation
  if (totalLen > 5000) score += 1

  // Axe 3 : Présence de code
  if (hasCode(lastMsg)) score += 1
  if (hasCodeBlocks(lastMsg)) score += 1

  // Axe 4 : Termes techniques avancés
  const techTermCount = countTechnicalTerms(lastMsg)
  if (techTermCount >= 3) score += 2
  else if (techTermCount >= 1) score += 1

  // Axe 5 : Profondeur de la conversation
  if (msgCount > 10) score += 2
  else if (msgCount > 5) score += 1

  // Axe 6 : Salutation simple → réduit la complexité
  if (isGreeting(lastMsg) && msgCount <= 2) score -= 1

  return Math.max(1, Math.min(5, score))
}

/** Détecte si une liste de messages contient des images (data URL ou image_url) */
export function hasImageContent(messages: any[]): boolean {
  return messages.some((msg) => {
    if (!msg.content) return false
    if (typeof msg.content === 'string') {
      return msg.content.includes('data:image/')
    }
    if (Array.isArray(msg.content)) {
      return msg.content.some(
        (part: any) =>
          part.type === 'image_url' ||
          part.type === 'image' ||
          (part.type === 'text' && typeof part.text === 'string' && part.text.includes('data:image/'))
      )
    }
    return false
  })
}

/**
 * Modèles temporairement coupés côté opérations (ex: panne de facturation
 * chez un fournisseur) - liste d'ids séparés par des virgules dans la var
 * d'env DISABLED_MODELS. Permet de retirer un modèle en panne du routage
 * sans déploiement de code, et de le réactiver dès que le fournisseur va
 * mieux. Lu à chaque appel (pas de cache) pour pouvoir couper/rétablir sans
 * redémarrer.
 */
function getDisabledModels(): Set<string> {
  const raw = process.env.DISABLED_MODELS ?? ''
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
}

export function selectBestModel(
  userPlan: PlanId,
  preferredModel?: ModelId,
  messages: ComplexMessage[] = []
): { model: AIModel; complexity: number; downgraded: boolean } {
  const disabled = getDisabledModels()
  const availableModels = getModelsForPlan(userPlan).filter(id => !disabled.has(id))
  const available = availableModels.map(id => MODELS[id])
  const complexity = analyzeComplexity(messages)
  const needsVision = hasImageContent(messages as any[])

  // Le modèle choisi par l'utilisateur est toujours respecté tant qu'il fait
  // partie de son plan - la "complexité" du message ne doit JAMAIS l'écraser
  // silencieusement (c'était le bug : un message un peu technique suffisait à
  // rebasculer vers un autre modèle sans le dire à l'utilisateur). Seule
  // l'absence de support vision peut forcer un changement, pour éviter
  // d'envoyer une image à un modèle qui ne peut pas la lire.
  if (preferredModel && availableModels.includes(preferredModel)) {
    const chosen = MODELS[preferredModel]
    if (!needsVision || chosen.supportsVision) {
      return { model: chosen, complexity, downgraded: false }
    }
  }

  const sorted = [...available].sort((a, b) => {
    // Si images : les modèles sans vision passent en dernier
    if (needsVision) {
      if (a.supportsVision !== b.supportsVision) return a.supportsVision ? -1 : 1
    }
    const aEnough = a.capability >= complexity ? 0 : 1
    const bEnough = b.capability >= complexity ? 0 : 1
    if (aEnough !== bEnough) return aEnough - bEnough
    if (aEnough === 0) return a.sortOrder - b.sortOrder
    if (a.capability !== b.capability) return b.capability - a.capability
    return b.sortOrder - a.sortOrder
  })

  return {
    model: sorted[0],
    complexity,
    downgraded: preferredModel ? true : false,
  }
}

/**
 * Modèles à essayer, dans l'ordre, pour une requête donnée.
 *
 * Le premier élément est celui que `selectBestModel` aurait retenu ; les
 * suivants sont les autres modèles du plan, du plus adapté au moins adapté.
 *
 * Pourquoi une liste plutôt qu'un seul modèle : le choix se faisait une fois
 * pour toutes avant l'appel. Si le fournisseur retenu était saturé (429 de
 * Google, d'Anthropic…), l'erreur brute repartait telle quelle vers
 * l'utilisateur — alors que d'autres modèles de son plan, chez d'autres
 * fournisseurs, étaient disponibles. Le repli par plan existait, le repli par
 * panne n'existait pas.
 */
export function getFailoverCandidates(
  userPlan: PlanId,
  preferredModel?: ModelId,
  messages: ComplexMessage[] = []
): { candidates: AIModel[]; complexity: number; downgraded: boolean } {
  const { model: first, complexity, downgraded } = selectBestModel(
    userPlan,
    preferredModel,
    messages
  )

  const disabled = getDisabledModels()
  const needsVision = hasImageContent(messages as any[])

  const rest = getModelsForPlan(userPlan)
    .filter(id => !disabled.has(id) && id !== first.id)
    .map(id => MODELS[id])
    // Une requête avec image ne doit pas retomber sur un modèle aveugle : il
    // répondrait à côté au lieu d'échouer franchement.
    .filter(m => m && (!needsVision || m.supportsVision))
    .sort((a, b) => {
      const aEnough = a.capability >= complexity ? 0 : 1
      const bEnough = b.capability >= complexity ? 0 : 1
      if (aEnough !== bEnough) return aEnough - bEnough
      if (aEnough === 0) return a.sortOrder - b.sortOrder
      return b.capability - a.capability
    })

  return { candidates: [first, ...rest], complexity, downgraded }
}

export function estimateTokens(messages: { content?: string }[]): number {
  let total = 0
  for (const msg of messages) {
    total += Math.ceil((msg.content?.length || 0) / 4)
  }
  return total
}

export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * model.inputCostPer1K
  const outputCost = (outputTokens / 1000) * model.outputCostPer1K
  return inputCost + outputCost
}
