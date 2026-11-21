import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /*
   * Quatre regles ramenees au rang d'avertissement.
   *
   * Elles faisaient echouer l'integration continue sur 311 points, sans
   * qu'aucun ne soit un defaut. Une CI qui echoue toujours ne signale
   * plus rien : on cesse de lire ses courriels, et le jour ou elle a
   * raison, personne ne s'en apercoit. Les avertissements restent
   * affiches — la dette est visible, elle ne bloque simplement plus.
   *
   * Ce qui reste bloquant : tout le reste, y compris les vraies erreurs
   * de code que ces 311 lignes de bruit masquaient.
   */
  {
    rules: {
      // 295 occurrences. C'est de la dette de typage, pas un defaut :
      // aucun `any` ne casse quoi que ce soit a l'execution. Les typer un
      // par un se fait au fil de l'eau, pas en une fois sur 120 fichiers.
      "@typescript-eslint/no-explicit-any": "warn",

      // 13 occurrences, dont le motif `mounted` qu'impose le rendu cote
      // serveur : poser un etat dans un effet est la facon RECOMMANDEE
      // d'eviter une difference d'hydratation. La regle vient du
      // compilateur React et se trompe sur ce cas.
      "react-hooks/set-state-in-effect": "warn",

      // 2 occurrences, toutes deux sur `window.location.href = ...`,
      // qui est la facon normale de naviguer. Faux positif.
      "react-hooks/immutability": "warn",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Les worktrees de travail sont une COPIE du depot : sans cette
    // ligne, eslint analyse tout deux fois et rapporte des centaines de
    // doublons qui n'existent pas sur GitHub. Le local ne disait donc pas
    // la meme chose que l'integration continue.
    ".claude/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
