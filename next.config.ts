import path from "path";
import type { NextConfig } from "next";

// Tide settings copied from the official pack template (templates/nextjs-customer-portal/next.config.ts)
// and playbook add-auth-nextjs-fresh. Scripts already run Next with --webpack (required by the SDK).
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  webpack: (config) => {
    // @tidecloak/js has incomplete re-exports: do not fail on missing export presence.
    config.module.strictExportPresence = false;
    // @tidecloak/react CJS dist contains ESM syntax: resolve to the ESM build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tidecloak/react": path.resolve(__dirname, "node_modules/@tidecloak/react/dist/esm/index.js"),
    };
    return config;
  },

  async headers() {
    return [
      // frame-src * is required for the Tide iframe (ORK re-homing); without it login hangs.
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-src 'self' *" }] },
      // DPoP page rule must stay LAST (last matching rule wins for the same header).
      {
        source: "/tide_dpop/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'unsafe-inline'" },
          { key: "Allow-CSP-From", value: "*" },
        ],
      },
    ];
  },

  // Static rewrite to public/tide_dpop_auth.html (never a route handler: Next injects a CSP there).
  async rewrites() {
    return [{ source: "/tide_dpop/:path*", destination: "/tide_dpop_auth.html" }];
  },
};

export default nextConfig;
