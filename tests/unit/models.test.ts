/**
 * Unit tests for lib/models.ts — pure functions, no network, no live server.
 *
 * Usage:
 *   npx tsx tests/unit/models.test.ts
 */

import { selectBestModel } from '../../lib/models'

type TestResult = { name: string; passed: boolean; ms: number; info?: string }

const results: TestResult[] = []
let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  const t0 = Date.now()
  try {
    await fn()
    results.push({ name, passed: true, ms: Date.now() - t0 })
    passed++
    console.log(`  ✅  ${name}  (${Date.now() - t0}ms)`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, ms: Date.now() - t0, info: msg })
    failed++
    console.log(`  ❌  ${name}  (${Date.now() - t0}ms)\n      ${msg}`)
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
  }
}

console.log(`\n🧪  Nexora Model Selection Unit Tests\n`)

// Message technique et long : score de complexité élevé (>3) avec l'ancienne
// heuristique — c'est exactement ce qui faisait basculer un choix explicite
// de deepseek-chat vers gemini-pro silencieusement.
const complexMessages = [
  { role: 'user', content: '```ts\nfunction refactor() { return new Promise(async (resolve) => { await cache.get() }) }\n```' },
  { role: 'assistant', content: 'Voici une analyse de la complexité architecturale, du cache et du sharding.' },
  { role: 'user', content: 'Explique le pattern de load balancing et la gestion des race conditions dans ce microservice, avec un exemple de deadlock.' },
]

await test('un modèle choisi explicitement et présent dans le plan est TOUJOURS respecté, même si le message est complexe', () => {
  const { model, downgraded } = selectBestModel('free', 'deepseek-chat', complexMessages)
  expect(model.id).toBe('deepseek-chat')
  expect(downgraded).toBe(false)
})

await test('un modèle choisi explicitement mais absent du plan bascule vers le fallback (downgraded=true)', () => {
  const { downgraded } = selectBestModel('free', 'claude-opus', complexMessages)
  expect(downgraded).toBe(true)
})

await test('sans préférence, la complexité choisit un modèle disponible dans le plan', () => {
  const { model } = selectBestModel('free', undefined, complexMessages)
  expect(model.id !== undefined).toBe(true)
})

await test('DISABLED_MODELS exclut un modèle même choisi explicitement (repli d\'urgence panne fournisseur)', () => {
  const prev = process.env.DISABLED_MODELS
  process.env.DISABLED_MODELS = 'gemini-pro,gemini-flash'
  try {
    const { model } = selectBestModel('starter', 'gemini-pro', [{ role: 'user', content: 'hi' }])
    expect(model.id === 'gemini-pro').toBe(false)
  } finally {
    if (prev === undefined) delete process.env.DISABLED_MODELS
    else process.env.DISABLED_MODELS = prev
  }
})

await test('un message nécessitant la vision force un modèle qui la supporte', () => {
  const visionMessages = [
    { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }] },
  ]
  // deepseek-chat ne supporte pas la vision → doit basculer vers un modèle qui la supporte
  const { model } = selectBestModel('starter', 'deepseek-chat', visionMessages as any)
  expect(model.supportsVision).toBe(true)
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`  Total: ${results.length}  ✅ ${passed}  ❌ ${failed}`)
console.log(`${'─'.repeat(50)}\n`)

if (failed > 0) process.exit(1)
