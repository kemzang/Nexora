import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
