/**
 * Calcul des vecteurs, en local.
 *
 * On utilise all-mpnet-base-v2 — le meme modele que l'extension pour indexer
 * le code et les docs. C'est la condition pour que le vecteur d'une requete
 * calcule cote client soit comparable a ceux stockes ici. Aucun appel d'API,
 * donc aucun cout par fragment.
 */
const MODEL = 'Xenova/all-mpnet-base-v2'
let pipe = null

export async function getEmbedder(log = console.log) {
  if (pipe) return pipe
  log(`  chargement de ${MODEL}…`)
  const { pipeline, env } = await import('@xenova/transformers')
  env.allowLocalModels = false
  pipe = await pipeline('feature-extraction', MODEL, { quantized: true })
  log('  modèle prêt')
  return pipe
}

/**
 * Vectorise un lot.
 *
 * Normalisation L2 : la recherche utilise la distance cosinus, qui suppose des
 * vecteurs de norme 1. Sans elle, les fragments longs — de norme plus grande —
 * remonteraient systematiquement en tete.
 */
export async function embedBatch(texts, log = console.log) {
  const p = await getEmbedder(log)
  const out = await p(texts, { pooling: 'mean', normalize: true })
  const dim = out.dims[out.dims.length - 1]
  const data = out.data
  const vectors = []
  for (let i = 0; i < texts.length; i++) {
    vectors.push(Array.from(data.slice(i * dim, (i + 1) * dim)))
  }
  return vectors
}
