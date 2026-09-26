/**
 * Unit tests for getFailoverCandidates — la liste de repli du proxy de modèles.
 *
 * Le repli par PLAN existait déjà (selectBestModel). Ces tests couvrent le
 * repli par PANNE : quand le fournisseur du modèle retenu est saturé, le proxy
 * doit pouvoir essayer un autre modèle du plan plutôt que de renvoyer à
 * l'utilisateur l'erreur brute de Google ou d'Anthropic.
 *
 * Usage:
 *   npx tsx tests/unit/failover.test.ts
 */

import { getFailoverCandidates, getModelsForPlan } from '../../lib/models'

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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

console.log(`\n🧪  Nexora Model Failover Unit Tests\n`)

await test('le premier candidat est celui que selectBestModel aurait retenu', () => {
  const { candidates } = getFailoverCandidates('pro', 'deepseek-chat', [])
  assert(candidates[0].id === 'deepseek-chat', `attendu deepseek-chat, obtenu ${candidates[0]?.id}`)
})

await test('propose au moins un repli quand le plan a plusieurs modèles', () => {
  const { candidates } = getFailoverCandidates('pro', 'deepseek-chat', [])
  assert(candidates.length > 1, `un seul candidat (${candidates.length}) : aucun repli possible`)
})

await test('ne propose jamais deux fois le même modèle', () => {
  const { candidates } = getFailoverCandidates('business', undefined, [])
  const ids = candidates.map(m => m.id)
  assert(new Set(ids).size === ids.length, `doublons dans ${ids.join(', ')}`)
})

await test('ne propose que des modèles du plan', () => {
  const allowed = new Set(getModelsForPlan('free'))
  const { candidates } = getFailoverCandidates('free', undefined, [])
  const intrus = candidates.filter(m => !allowed.has(m.id)).map(m => m.id)
  assert(intrus.length === 0, `modèles hors plan proposés : ${intrus.join(', ')}`)
})

await test('un modèle hors plan est signalé comme rétrogradé', () => {
  // claude-opus n'est pas dans le plan free : l'utilisateur doit pouvoir
  // l'apprendre plutôt que de croire qu'Opus lui répond.
  const { downgraded } = getFailoverCandidates('free', 'claude-opus', [])
  assert(downgraded === true, 'le repli par plan devrait être signalé')
})

await test('un modèle du plan n’est pas signalé comme rétrogradé', () => {
  const { downgraded, candidates } = getFailoverCandidates('pro', 'deepseek-chat', [])
  assert(downgraded === false, 'aucun repli ne devrait être signalé')
  assert(candidates[0].id === 'deepseek-chat', 'le choix explicite doit être respecté')
})

await test('une requête avec image n’est jamais repliée sur un modèle aveugle', () => {
  // Un modèle sans vision répondrait à côté au lieu d'échouer franchement.
  const visionMessages = [
    { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }] },
  ]
  const { candidates } = getFailoverCandidates('business', undefined, visionMessages as any)
  const aveugles = candidates.filter(m => !m.supportsVision).map(m => m.id)
  assert(aveugles.length === 0, `modèles sans vision dans la liste : ${aveugles.join(', ')}`)
})

await test('le plan gratuit renvoie une liste exploitable', () => {
  const { candidates } = getFailoverCandidates('free', undefined, [])
  assert(candidates.length >= 1, 'aucun modèle pour le plan gratuit')
  assert(candidates.every(m => m && m.id), 'candidat invalide dans la liste')
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
console.log(`  Total: ${results.length}  ✅ ${passed}  ❌ ${failed}`)
console.log(`${'─'.repeat(50)}\n`)

if (failed > 0) process.exit(1)
