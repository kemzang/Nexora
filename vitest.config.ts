import { defineConfig } from 'vitest/config'

/**
 * Perimetre volontairement etroit.
 *
 * `tests/` contient des scripts autonomes, ecrits pour `npx tsx` : ils n'ont
 * ni `describe` ni `it`, donc vitest les ramasse et echoue sur « No test
 * suite found ». Ce ne sont pas des tests casses, c'est un autre style — on
 * ne les inclut simplement pas ici. Les convertir serait un chantier a part.
 *
 * `.claude/worktrees/` est une copie de travail temporaire : la scanner
 * faisait executer deux fois les memes fichiers.
 */
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['**/node_modules/**', '.claude/**', 'tests/**'],
  },
})
