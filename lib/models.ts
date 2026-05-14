export type ModelId = 'deepseek-chat' | 'gemini-flash' | 'gemini-pro' | 'claude-haiku' | 'grok-2' | 'claude-sonnet' | 'gpt-5' | 'claude-opus'

export type PlanId = 'free' | 'neo' | 'pro' | 'business' | 'enterprise'

export interface AIModel {
  id: ModelId
  name: string
  provider: string
  apiIdentifier: string
  apiBaseUrl: string
  inputCostPer1K: number
  outputCostPer1K: number
  contextWindow: number
  sortOrder: number
}

export interface Plan {
  id: PlanId
  name: string
  nameFr: string
  price: number
  priceLabel: string
  tokensPerMonth: number
  maxRequestsPerDay: number
  models: ModelId[]
  modelsLabel?: string
  features: string[]
  popular?: boolean
}

export const MODELS: Record<ModelId, AIModel> = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    apiIdentifier: 'deepseek-chat',
    apiBaseUrl: 'https://api.deepseek.com/chat/completions',
    inputCostPer1K: 0.0001,
    outputCostPer1K: 0.0002,
    contextWindow: 64000,
    sortOrder: 1,
  },
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'Google',
    apiIdentifier: 'gemini-2.0-flash',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    inputCostPer1K: 0.00015,
    outputCostPer1K: 0.0005,
    contextWindow: 32000,
    sortOrder: 2,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    apiIdentifier: 'gemini-2.0-pro',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent',
    inputCostPer1K: 0.001,
    outputCostPer1K: 0.002,
    contextWindow: 32000,
    sortOrder: 3,
  },
  'claude-haiku': {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'Anthropic',
    apiIdentifier: 'claude-3-haiku-20240307',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.0025,
    outputCostPer1K: 0.0125,
    contextWindow: 48000,
    sortOrder: 4,
  },
  'grok-2': {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xAI',
    apiIdentifier: 'grok-2-1212',
    apiBaseUrl: 'https://api.x.ai/v1/chat/completions',
    inputCostPer1K: 0.002,
    outputCostPer1K: 0.01,
    contextWindow: 32000,
    sortOrder: 5,
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'Anthropic',
    apiIdentifier: 'claude-3-sonnet-20240229',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.005,
    outputCostPer1K: 0.015,
    contextWindow: 64000,
    sortOrder: 6,
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    apiIdentifier: 'gpt-5-preview',
    apiBaseUrl: 'https://api.openai.com/v1/chat/completions',
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.04,
    contextWindow: 128000,
    sortOrder: 7,
  },
  'claude-opus': {
    id: 'claude-opus',
    name: 'Claude Opus',
    provider: 'Anthropic',
    apiIdentifier: 'claude-3-opus-20240229',
    apiBaseUrl: 'https://api.anthropic.com/v1/messages',
    inputCostPer1K: 0.015,
    outputCostPer1K: 0.075,
    contextWindow: 64000,
    sortOrder: 8,
  },
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    nameFr: 'Découverte',
    price: 0,
    priceLabel: '0€',
    tokensPerMonth: 1000,
    maxRequestsPerDay: 20,
    models: ['deepseek-chat', 'gemini-flash'],
    features: [
      '1K tokens/mois',
      '20 requêtes/jour',
      'DeepSeek & Gemini Flash',
      'Chat IA dans VS Code',
    ],
  },
  neo: {
    id: 'neo',
    name: 'Neo',
    nameFr: 'Neo',
    price: 4,
    priceLabel: '4€',
    tokensPerMonth: 15000,
    maxRequestsPerDay: 150,
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro'],
    features: [
      '15K tokens/mois',
      '150 requêtes/jour',
      '+ Gemini Pro',
      'Auto-complétion',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameFr: 'Pro',
    price: 9,
    priceLabel: '9€',
    tokensPerMonth: 50000,
    maxRequestsPerDay: 500,
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'grok-2'],
    modelsLabel: 'DeepSeek, Gemini, Claude Haiku, Grok',
    features: [
      '50K tokens/mois',
      '500 requêtes/jour',
      '+ Grok & Claude Haiku',
      'Mode Agent',
      'Support prioritaire',
    ],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    nameFr: 'Business',
    price: 17,
    priceLabel: '17€',
    tokensPerMonth: 200000,
    maxRequestsPerDay: 2000,
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'grok-2', 'claude-sonnet'],
    features: [
      '200K tokens/mois',
      '2 000 requêtes/jour',
      '+ Claude Sonnet',
      'Mode équipe',
      'Support prioritaire',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Enterprise',
    price: 100,
    priceLabel: '100€',
    tokensPerMonth: 1000000,
    maxRequestsPerDay: 10000,
    models: ['deepseek-chat', 'gemini-flash', 'gemini-pro', 'claude-haiku', 'grok-2', 'claude-sonnet', 'gpt-5', 'claude-opus'],
    features: [
      '1M tokens/mois',
      'Requêtes illimitées',
      '+ Claude Opus & GPT-5',
      'Tous les modèles',
      'SSO + Support 24/7',
    ],
  },
}

export function getModelsForPlan(planId: PlanId): ModelId[] {
  return PLANS[planId].models
}

export function selectBestModel(
  userPlan: PlanId,
  preferredModel?: ModelId
): { model: AIModel; downgraded: boolean } {
  const availableModels = getModelsForPlan(userPlan)
  const available = availableModels.map(id => MODELS[id])

  if (preferredModel && availableModels.includes(preferredModel)) {
    return { model: MODELS[preferredModel], downgraded: false }
  }

  const sorted = available.sort((a, b) => a.sortOrder - b.sortOrder)
  const best = sorted[0]

  return {
    model: best,
    downgraded: preferredModel ? true : false,
  }
}

export function estimateTokens(messages: { content: string }[]): number {
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
