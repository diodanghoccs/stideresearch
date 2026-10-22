"use client";

// Tide provider (playbook add-auth-nextjs-fresh Step 4a; same as the pack's nextjs-customer-portal).
// data/tidecloak.json is the adapter exported from the realm (gitignored). useDPoP goes inside config.
import type { ReactNode } from "react";
import { TideCloakProvider } from "@tidecloak/nextjs";
import tcConfig from "../../data/tidecloak.json";
import { TideSessionBridge } from "@/tide/session-bridge";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>
      <TideSessionBridge>{children}</TideSessionBridge>
    </TideCloakProvider>
  );
}
