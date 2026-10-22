import path from "path";
import type { NextConfig } from "next";

// Tide wiring per the pack template `nextjs-e2ee-vault` (playbook add-auth-nextjs-fresh).
// Owner: Trí. Shared file — Triệu reviews before merge.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // @tidecloak/* need these webpack workarounds; scripts already use `--webpack`.
  webpack: (config) => {
    // @tidecloak/js has incomplete re-exports.
    config.module.strictExportPresence = false;
    // @tidecloak/react CJS dist contains ESM syntax.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tidecloak/react": path.resolve(__dirname, "node_modules/@tidecloak/react/dist/esm/index.js"),
    };
    return config;
  },

  async headers() {
    return [
      // frame-src * is required for the Tide enclave iframe (ORK re-homing).
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-src 'self' *" }] },
      // DPoP auth page needs inline script for the enclave. Keep this rule LAST.
      {
        source: "/tide_dpop/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'unsafe-inline'" },
          { key: "Allow-CSP-From", value: "*" },
        ],
      },
    ];
  },

  // Rewrite to the static file copied from node_modules/@tidecloak/js (version-matched). No route handler.
  async rewrites() {
    return [{ source: "/tide_dpop/:path*", destination: "/tide_dpop_auth.html" }];
  },
};

export default nextConfig;
