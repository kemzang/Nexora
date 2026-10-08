/**
 * Identifiant de l'extension VS Code, tel que publie sur le Marketplace.
 *
 * VS Code route les URI `vscode://<editeur>.<extension>/...` sur l'extension
 * qui porte exactement cet identifiant. Une valeur erronee ne produit pas une
 * erreur silencieuse : l'editeur affiche « The extension '<id>' cannot be
 * installed because it was not found » et la connexion echoue.
 *
 * Cette constante existe parce que l'identifiant etait recopie dans huit
 * fichiers, sous deux formes differentes et toutes deux obsoletes, apres le
 * renommage de `nexora` en `nexora-ai`.
 */
export const VSCODE_EXTENSION_ID = 'nexoracoding.nexora-ai'

/** Lien profond vers l'extension, ex. editorDeepLink('auth', { token }). */
export function editorDeepLink(
  path: string,
  params: Record<string, string> = {},
): string {
  const query = new URLSearchParams(params).toString()
  return `vscode://${VSCODE_EXTENSION_ID}/${path}${query ? `?${query}` : ''}`
}
