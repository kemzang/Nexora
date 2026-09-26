import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // L'ancienne adresse de demonstration reste servie par Vercel : elle
        // est encore codee dans les extensions deja installees, qui cesseraient
        // de fonctionner si on la debranchait. Mais un utilisateur ne doit plus
        // y atterrir — un lien d'e-mail un peu ancien y menait encore, et il y
        // restait ensuite, toute la navigation etant relative.
        //
        // Les chemins /api/ sont volontairement EXCLUS : une redirection sur un
        // POST fait perdre le corps de la requete selon le client HTTP, ce qui
        // casserait les appels au proxy de modeles depuis les extensions
        // installees. Elles continuent donc d'etre servies directement.
        source: '/((?!api/).*)',
        has: [{ type: 'host', value: 'nexora-mu-henna.vercel.app' }],
        destination: 'https://nexoracoding.com/:1',
        // Temporaire : tant que d'anciennes versions pointent encore ici, on ne
        // veut pas que les navigateurs memorisent la redirection pour toujours.
        permanent: false,
      },
    ]
  },
  async headers() {
    // Ces pages font partie du flux d'authentification des editeurs
    // (IntelliJ/CLI/VS Code) : un cache CDN qui sert une version perimee
    // (deploiement precedent) casse le flux sans qu'aucune erreur ne
    // s'affiche — vecu avec le fix uriScheme=jetbrains, servi perime malgre
    // "force-dynamic" (qui n'empeche pas le cache HTTP en aval).
    return [
      {
        source: "/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/tokens/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

// withSentryConfig() only touches the build when SENTRY_AUTH_TOKEN is set
// (source map upload) — without it, this wraps the config as a no-op, so
// normal builds/deploys never require a Sentry project to succeed.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
});
