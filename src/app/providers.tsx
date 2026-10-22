"use client";

import type { ReactNode } from "react";
import { TideCloakProvider } from "@tidecloak/nextjs";
// Adapter exported from TideCloak (gitignored). Contains public keys/ids only, no secrets.
import tcConfig from "../../data/tidecloak.json";

// useDPoP goes inside the config object, not as a separate JSX prop.
export function Providers({ children }: { children: ReactNode }) {
  return <TideCloakProvider config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}>{children}</TideCloakProvider>;
}
