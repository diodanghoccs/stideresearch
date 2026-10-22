import type { NextConfig } from "next";

// Base config only. Tide DPoP rewrites/CSP from the official playbook
// (add-auth-nextjs-fresh) are added by the Tide owner (Trí) when wiring the SDK.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
