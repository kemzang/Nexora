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
  /** Coût relatif en crédits (1x = référence). Pondère la consommation par modèle. */
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
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    apiIdentifier: 'deepseek-chat',
    apiBaseUrl: 'https://api.deepseek.com/v1/chat/completions',
    inputCostPer1K: 0.0001,
    outputCostPer1K: 0.0002,
    contextWindow: 64000,
    capability: 3,
    sortOrder: 1,
    supportsVision: false,
    creditMultiplier: 1,
  },
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'Google',
    // gemini-2.0-flash a été arrêté par Google le 1er juin 2026 (404 sur
    // generateContent) - gemini-3.8-flash est le modèle Flash stable actuel.
    apiIdentifier: 'gemini-3.8-flash',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
    inputCostPer1K: 0.00075,
    outputCostPer1K: 0.00375,
    contextWindow: 32000,
    capability: 2,
    sortOrder: 2,
    supportsVision: true,
    creditMultiplier: 2.5,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    // gemini-2.0-pro puis gemini-2.5-pro (fix précédent) n'existent plus -
    // Google renvoie désormais lui-même dans son erreur 404 le nom du
    // modèle de remplacement ("update your code to use
    // models/gemini-3.1-pro-preview"). Les modèles Gemini tournent vite :
    // si ça recasse, vérifier le message d'erreur exact de Google avant de
    // deviner un nom.
    apiIdentifier: 'gemini-3.1-pro-preview',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent',
    inputCostPer1K: 0.001,
    outputCostPer1K: 0.006,
    contextWindow: 32000,
    capability: 3,
    sortOrder: 3,
    supportsVision: true,
    creditMultiplier: 10,
  },
  'claude-haiku': {
    id: 'claude-haiku',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    apiIdentifier: 'claude-haiku-4-5-20251001',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.0008,
    outputCostPer1K: 0.004,
    contextWindow: 200000,
    capability: 3,
    sortOrder: 4,
    supportsVision: true,
    creditMultiplier: 20,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    apiIdentifier: 'claude-sonnet-4-6',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    contextWindow: 200000,
    capability: 4,
    sortOrder: 5,
    supportsVision: true,
    creditMultiplier: 75,
  },
  'claude-opus': {
    id: 'claude-opus',
    name: 'Claude Opus 4.7',
    provider: 'Anthropic',
    apiIdentifier: 'claude-opus-4-7',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.015,
    outputCostPer1K: 0.075,
    contextWindow: 200000,
    capability: 5,
    sortOrder: 6,
    supportsVision: true,
    creditMultiplier: 375,
  },
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    nameFr: 'Découverte',
    price: 0,
    priceLabel: '$0',
    tokensPerMonth: 100000,
    maxRequestsPerDay: 200,
    webSearchesPerMonth: 30,
    webCrawlsPerMonth: 5,
    maxCollaborators: 1,
    models: ['deepseek-chat', 'gemini-flash'],
    features: [
      '100 000 crédits/mois',
      '200 requêtes/jour',
      'DeepSeek V3 & Gemini Flash',
      'Chat IA + Autocomplétion',
      'Mode Agent basique',
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
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro'],
    features: [
      '4M crédits/mois',
      '500 requêtes/jour',
      '+ Gemini 2.5 Pro',
      'Autocomplétion avancée',
      'Mode Agent complet',
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
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'claude-sonnet'],
    modelsLabel: 'DeepSeek, Gemini, Claude Haiku & Sonnet',
    features: [
      '15M crédits/mois',
      '2 000 requêtes/jour',
      '+ Claude Haiku & Sonnet 4.6',
      'Indexing codebase complet',
      'Support prioritaire',
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
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'claude-sonnet', 'claude-opus'],
    features: [
      '40M crédits/mois',
      '5 000 requêtes/jour',
      '+ Claude Opus 4.7',
      'Accès API direct',
      'Support dédié',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Enterprise',
    price: 80,
    priceLabel: '$80',
    tokensPerMonth: 100000000,
    maxRequestsPerDay: 99999,
    webSearchesPerMonth: 99999,
    webCrawlsPerMonth: 99999,
    maxCollaborators: 99999,
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'claude-sonnet', 'claude-opus'],
    features: [
      '100M crédits/mois',
      'Requêtes illimitées',
      'Tous les modèles disponibles',
      'SSO + Support 24/7 + SLA',
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
