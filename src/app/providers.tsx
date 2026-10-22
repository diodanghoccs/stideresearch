"use client";

// Tide provider (playbook add-auth-nextjs-fresh Step 4a; same as the pack's nextjs-customer-portal).
// data/tidecloak.json is the adapter exported from the realm (gitignored). useDPoP goes inside config.
// Plan C: with NEXT_PUBLIC_TIDE_MODE=simulated the real provider is not mounted; a SIMULATED session
// (labelled everywhere) takes its place behind the same port.
import type { ReactNode } from "react";
import { TideCloakProvider } from "@tidecloak/nextjs";
import tcConfig from "../../data/tidecloak.json";
import { TideSessionBridge } from "@/tide/session-bridge";
import { SimulatedSessionProvider } from "@/tide/simulated-session";
import { SIMULATED_MODE } from "@/tide/simulated-users";

export function Providers({ children }: { children: ReactNode }) {
  if (SIMULATED_MODE) return <SimulatedSessionProvider>{children}</SimulatedSessionProvider>;
  return (
    <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>
      <TideSessionBridge>{children}</TideSessionBridge>
    </TideCloakProvider>
  );
}
