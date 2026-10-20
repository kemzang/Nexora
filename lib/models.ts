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
/**
 * Verbes de conception : refonte, architecture, migration, conception de
 * systeme. Ce sont eux qui justifient un modele plus capable, bien plus que
 * la longueur du message.
 */
const DEEP_WORK_PATTERNS =
  /\b(refactor|refonte|reecri|rewrite|architectur|concev|conception|design\s+(a|the|un|une)|migrat|port(er|ing)\s+(vers|to)|optimis|debug|deboguer|diagnosti|pourquoi\s+(ca|cela|ce)|why\s+(does|is|are)|implement|mettre\s+en\s+place|plan(ifier)?\s|strateg|comparer?\s+les|trade-?off|securis|secure|vulnerab|performance|scalab|concurren|race\s+condition|deadlock|algorithm|complexit)\b/i

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
    // Pas de Sonnet (x11) ni de Gemini Pro (x12) ici : a 4M credits, un seul
    // tour d'agent sur ces modeles coute environ 440 000 credits, soit neuf
    // tours pour le mois entier. Promettre un modele que le plafond ne peut
    // pas financer fait fuir le client des le premier jour ; les modeles
    // chers sont la vraie raison de passer a Pro.
    models: ['deepseek-chat', 'gemini-flash', 'claude-haiku'],
    features: [
      '4M credits/month',
      '500 requests/day',
      'DeepSeek, Gemini Flash & Claude Haiku 5.5',
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
    // 30 $ par siege : au tarif precedent de 35 $, le credit revenait a
    // 0,875 $ le million contre 0,800 $ pour dix comptes Pro — l'offre
    // d'equipe coutait donc PLUS cher que des comptes individuels, et
    // n'avait aucune raison d'etre signee. A 30 $, c'est le tarif Business
    // exactement, et la mutualisation des credits devient le seul argument
    // a faire valoir : elle suffit, puisqu'elle evite de perdre les quotas
    // des membres peu actifs.
    price: 30,
    priceLabel: 'from $30',
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
 * Part du prix d'entrée encore facturée quand le fournisseur a servi les
 * jetons depuis son cache, par fournisseur. Ce sont leurs tarifs réels :
 * Anthropic et DeepSeek relisent à 0,1x le prix d'entrée, Google à 0,25x.
 *
 * Un fournisseur inconnu reste à 1 : on ne rend jamais une remise qu'on n'a
 * pas obtenue.
 */
const CACHE_READ_DISCOUNT: Record<string, number> = {
  Anthropic: 0.1,
  DeepSeek: 0.1,
  Google: 0.25,
}

/** Facteur applique aux jetons d'entree relus depuis le cache du fournisseur. */
export function cacheReadFactor(modelId: string): number {
  const provider = MODELS[modelId as ModelId]?.provider ?? ''
  return CACHE_READ_DISCOUNT[provider] ?? 1
}

/**
 * Calcule les crédits (= tokens pondérés) consommés par une requête.
 * On pondère les tokens réels par le coût relatif du modèle, de sorte qu'un
 * modèle cher (Opus 5x) consomme bien plus du quota qu'un modèle bon marché (DeepSeek 0.25x).
 *
 * `cachedInputTokens` est la part de `inputTokens` que le fournisseur a
 * relue depuis son cache — donc comprise dans le total, pas en plus. Elle est
 * facturée au tarif du cache, sinon la boucle d'agent fait payer sept fois le
 * même contexte : un testeur a brûlé 72 % du quota gratuit sur UN prompt,
 * dont ~330 000 crédits de contexte identique renvoyé à chaque étape.
 *
 * L'écriture du cache coûte 1,25x chez Anthropic ; on l'absorbe au lieu de la
 * refacturer. Le premier appel d'une conversation ne doit pas devenir plus
 * cher qu'avant pour l'utilisateur, et la marge reste largement gagnante sur
 * l'ensemble de la session.
 */
export function computeCreditsConsumed(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0,
): number {
  const cached = Math.min(Math.max(0, cachedInputTokens), Math.max(0, inputTokens))
  const fresh = Math.max(0, inputTokens - cached)
  const weighted = fresh + cached * cacheReadFactor(modelId) + outputTokens
  return Math.ceil(weighted * getCreditMultiplier(modelId))
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

/**
 * Ne garde que l'instruction de l'utilisateur, sans le contexte qu'on y a
 * injecte : blocs de code, contenus de fichiers et citations.
 *
 * C'est la cle du calcul. En mode agent, chaque message embarque des
 * fichiers entiers — mesurer sa longueur brute revient a mesurer la taille
 * du projet, pas la difficulte de la demande.
 */
function instructionOnly(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')        // blocs de code
    .replace(/^\s*>.*$/gm, ' ')              // citations
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ' ') // blocs de contexte balises
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Difficulte estimee de la demande, de 1 a 5.
 *
 * L'ancienne version notait surtout le VOLUME : un message de plus de 1000
 * caracteres valait 5 a lui seul. En mode agent ou chaque requete transporte
 * le contenu des fichiers, la note etait donc toujours au maximum, et seul
 * le modele le plus capable du plan etait retenu — a chaque tour, quel que
 * soit le travail demande. Un utilisateur qui demandait « renomme cette
 * variable » payait le prix d'une refonte d'architecture.
 *
 * On juge maintenant l'instruction seule, et surtout ce qu'elle demande.
 */
export function analyzeComplexity(messages: ComplexMessage[]): number {
  const raw = getLastMessage(messages)
  const ask = instructionOnly(raw)
  const msgCount = messages.length

  // Une salutation ou un remerciement n'a pas besoin d'un gros modele,
  // meme en fin de longue conversation.
  if (isGreeting(ask) && ask.length < 80) return 1

  // L'echelle est calee sur les capacites declarees des modeles :
  //   1-3 : retouche, question, tache de codage ordinaire   -> modeles rapides
  //   4   : conception, diagnostic, refonte                 -> Sonnet
  //   5   : conception ample ET specifiee en detail         -> Opus
  let score = 1

  // Axe 1 : nature de la tache. Le signal le plus fiable, et le seul qui
  // justifie a lui seul un modele plus capable.
  const deepWork = DEEP_WORK_PATTERNS.test(ask)
  if (deepWork) score += 3

  // Axe 2 : vocabulaire technique, mais uniquement SUR LE RESTE de la
  // phrase. Sans cette soustraction, « refactor » comptait deux fois — une
  // fois comme tache de conception, une fois comme terme technique — et une
  // simple refonte sautait directement sur le modele le plus cher.
  const reste = ask.replace(DEEP_WORK_PATTERNS, ' ')
  if (countTechnicalTerms(reste) >= 2) score += 1

  // Axe 3 : une instruction longue ET une tache de conception, c'est une
  // specification detaillee. La longueur seule ne prouve rien.
  if (deepWork && ask.length > 600) score += 1

  // Axe 4 : du code ecrit dans l'instruction, hors blocs de contexte.
  if (hasCode(ask) && !hasCodeBlocks(raw)) score += 1

  // Axe 5 : une conversation tres longue a accumule des contraintes a tenir
  // ensemble. Un seul point, au-dela de 20 messages — l'ancien seuil de 5 se
  // franchissait en trois echanges.
  if (msgCount > 20) score += 1

  // Le palier 5 ouvre le modele le plus cher du plan. On le reserve aux
  // demandes qui sont A LA FOIS une tache de conception et une specification
  // detaillee : sans cette condition, une phrase de huit mots contenant
  // « refactor » suffisait a declencher Opus, a x22.
  const merite5 = deepWork && ask.length > 600
  const plafond = merite5 ? 5 : 4

  return Math.max(1, Math.min(plafond, score))
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
    // A capacite suffisante, le moins cher gagne. Le tri se faisait sur
    // `sortOrder`, qui classe par prestige et non par prix : gemini-pro (x12)
    // passait avant claude-haiku (x1) alors que les deux ont la meme
    // capacite. En mode Auto l'utilisateur demande qu'on choisisse pour lui ;
    // a qualite egale, prendre douze fois plus cher est indefendable.
    if (aEnough === 0) {
      if (a.creditMultiplier !== b.creditMultiplier) {
        return a.creditMultiplier - b.creditMultiplier
      }
      return a.sortOrder - b.sortOrder
    }
    if (a.capability !== b.capability) return b.capability - a.capability
    return a.creditMultiplier - b.creditMultiplier
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
      // Meme regle : un repli ne doit pas couter plus cher que l'original.
      if (aEnough === 0) {
        if (a.creditMultiplier !== b.creditMultiplier) {
          return a.creditMultiplier - b.creditMultiplier
        }
        return a.sortOrder - b.sortOrder
      }
      if (a.capability !== b.capability) return b.capability - a.capability
      return a.creditMultiplier - b.creditMultiplier
    })

  return { candidates: [first, ...rest], complexity, downgraded }
}

/**
 * Cout d'une image en jetons, forfaitaire.
 *
 * C'est l'ordre de grandeur d'un plein cadre chez Anthropic. Mesurer la
 * longueur du base64 n'a aucun sens : les fournisseurs facturent au pave de
 * pixels, pas au caractere, et quatre caracteres par jeton donnerait des
 * centaines de milliers de jetons pour une seule capture d'ecran.
 */
const IMAGE_TOKENS = 1600

/**
 * Estimation a quatre caracteres par jeton. Grossiere mais suffisante : elle
 * ne sert qu'au controle de solde fait avant l'appel et a la garde de taille
 * de contexte. Le decompte reel vient du fournisseur.
 *
 * Un message multimodal a un `content` en tableau de parts. `content.length`
 * y vaut le NOMBRE de parts : une capture d'ecran etait donc estimee a un
 * jeton, et une conversation pleine d'images passait le controle de solde
 * comme si elle etait vide.
 */
export function estimateTokens(messages: { content?: unknown }[]): number {
  let total = 0
  for (const msg of messages) {
    const content = msg?.content
    if (typeof content === 'string') {
      total += Math.ceil(content.length / 4)
      continue
    }
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (typeof part === 'string') {
        total += Math.ceil(part.length / 4)
      } else if (part?.type === 'text' && typeof part.text === 'string') {
        total += Math.ceil(part.text.length / 4)
      } else if (part?.type === 'image' || part?.type === 'image_url') {
        total += IMAGE_TOKENS
      } else if (part && typeof part === 'object') {
        // Resultat d'outil ou bloc inconnu : on mesure sa forme serialisee.
        total += Math.ceil(JSON.stringify(part).length / 4)
      }
    }
  }
  return total
}

export function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * model.inputCostPer1K
  const outputCost = (outputTokens / 1000) * model.outputCostPer1K
  return inputCost + outputCost
}
