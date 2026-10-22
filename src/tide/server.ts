// Server-side Tide boundary: verify the access token (embedded JWKS) AND its DPoP proof, then
// authorize by realm/client role. Logic follows the official pack template
// (templates/nextjs-customer-portal/src/lib/auth/{tidecloakConfig,tideJWT,protect}.ts).
// Never logs tokens. Missing data/tidecloak.json -> not-configured (routes stay fail-closed).
import { readFileSync } from "fs";
import { join } from "path";
import { createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { GuardedOperation, ModuleReadiness, OperationResult, SessionIdentity, TideRequestVerifier } from "@/contracts";
import { verifyDpop } from "./verify-dpop";
import { SIM_USERS, SIMULATED_MODE, isSimAlias } from "./simulated-users";

interface AdapterConfig {
  realm: string;
  "auth-server-url": string;
  resource: string;
  jwk?: { keys: unknown[] };
}

type Loaded = { ok: true; config: AdapterConfig; jwks: ReturnType<typeof createLocalJWKSet> } | { ok: false; state: "not-configured" | "error"; detail: string };
let cached: Loaded | null = null;

// Lazy: never read the file at module load (next build evaluates modules).
function load(): Loaded {
  if (cached?.ok) return cached;
  let config: AdapterConfig;
  try {
    config = JSON.parse(readFileSync(join(process.cwd(), "data", "tidecloak.json"), "utf-8"));
  } catch {
    cached = { ok: false, state: "not-configured", detail: "data/tidecloak.json not found (export the adapter from the TideCloak realm)." };
    return cached;
  }
  if (!config.jwk) {
    cached = { ok: false, state: "error", detail: "Adapter JSON has no jwk (re-export after setUpTideRealm/IGA)." };
    return cached;
  }
  cached = { ok: true, config, jwks: createLocalJWKSet(config.jwk as Parameters<typeof createLocalJWKSet>[0]) };
  return cached;
}

const claimsBySession = new WeakMap<object, JWTPayload>();

function hasRole(payload: JWTPayload, role: string): boolean {
  const realmRoles = ((payload.realm_access as { roles?: string[] } | undefined)?.roles ?? []) as string[];
  if (realmRoles.includes(role)) return true;
  const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined;
  return Object.values(resourceAccess ?? {}).some((c) => c?.roles?.includes(role));
}

/** Which role each server operation needs (S2 plan). encrypt/decrypt happen in the browser via Tide. */
const REQUIRED_ROLE: Record<GuardedOperation, string | null> = {
  "read-record": null,
  "read-policy": null,
  "write-record": "_tide_encryptor",
  "store-policy": "tide-realm-admin",
  summarize: "_tide_decryptor",
  encrypt: null,
  decrypt: null,
};

export const tideVerifier: TideRequestVerifier = {
  readiness(): ModuleReadiness {
    const l = load();
    return l.ok
      ? { module: "tide", state: "ready", implementation: "tide-jwt-dpop-verifier", detail: `Verifies Tide tokens for realm ${l.config.realm} (embedded JWKS + DPoP proof).` }
      : { module: "tide", state: l.state, implementation: "tide-jwt-dpop-verifier", detail: l.detail };
  },

  async verify(request: Request): Promise<SessionIdentity> {
    const l = load();
    if (!l.ok) return { status: "not-configured", reason: l.detail };
    const authz = request.headers.get("authorization");
    if (!authz) return { status: "unauthenticated" };
    const token = authz.replace(/^(Bearer|DPoP)\s+/i, "");
    try {
      const issuer = `${l.config["auth-server-url"].replace(/\/+$/, "")}/realms/${l.config.realm}`;
      const { payload } = await jwtVerify(token, l.jwks, { issuer, clockTolerance: 30 });
      if (payload.azp !== l.config.resource) return { status: "unauthenticated" };
      if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 60) return { status: "unauthenticated" };
      // Signature alone is not enough: the token is sender-constrained (cnf.jkt).
      await verifyDpop(request, token, payload as { cnf?: { jkt?: string } });
      const roles = ((payload.realm_access as { roles?: string[] } | undefined)?.roles ?? []) as string[];
      const session: SessionIdentity = {
        status: "authenticated",
        principalId: String(payload.sub ?? ""),
        displayName: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
        roles,
        verifiedBy: "tide",
      };
      claimsBySession.set(session, payload);
      return session;
    } catch {
      return { status: "unauthenticated" };
    }
  },

  async authorize(session: SessionIdentity, operation: GuardedOperation): Promise<OperationResult<void>> {
    if (session.status !== "authenticated") {
      return { outcome: "error", operation, code: "UNAUTHENTICATED", cause: "No verified Tide session." };
    }
    const claims = claimsBySession.get(session);
    if (!claims) return { outcome: "error", operation, code: "UNAUTHENTICATED", cause: "Session was not produced by this verifier." };
    const role = REQUIRED_ROLE[operation];
    if (role && !hasRole(claims, role)) return { outcome: "denied", operation, cause: `Requires role ${role}.` };
    return { outcome: "allowed", value: undefined };
  },
};

// Plan C: simulated verifier, used ONLY when NEXT_PUBLIC_TIDE_MODE=simulated. It trusts the
// X-Simulated-User header and says so; it never accepts or parses a real Tide token.
const simRolesBySession = new WeakMap<object, string[]>();

export const simulatedVerifier: TideRequestVerifier = {
  readiness(): ModuleReadiness {
    return {
      module: "tide",
      state: "ready",
      implementation: "SIMULATED-verifier (Plan C)",
      detail: "SIMULATED: Tide sign-in, roles and access checks are simulated (Plan C); no Tide token is verified in this mode.",
    };
  },
  async verify(request: Request): Promise<SessionIdentity> {
    const alias = request.headers.get("x-simulated-user");
    if (!isSimAlias(alias)) return { status: "unauthenticated" };
    const session: SessionIdentity = {
      status: "authenticated",
      principalId: `sim-${alias}`,
      displayName: `${SIM_USERS[alias].name} (SIMULATED)`,
      roles: SIM_USERS[alias].roles,
      verifiedBy: "simulated",
    };
    simRolesBySession.set(session, SIM_USERS[alias].roles);
    return session;
  },
  async authorize(session: SessionIdentity, operation: GuardedOperation): Promise<OperationResult<void>> {
    const roles = simRolesBySession.get(session);
    if (session.status !== "authenticated" || !roles) {
      return { outcome: "error", operation, code: "UNAUTHENTICATED", cause: "No simulated session." };
    }
    const role = REQUIRED_ROLE[operation];
    if (role && !roles.includes(role)) return { outcome: "denied", operation, cause: `SIMULATED: requires role ${role}.` };
    return { outcome: "allowed", value: undefined };
  },
};

export function getTideVerifier(): TideRequestVerifier {
  return SIMULATED_MODE ? simulatedVerifier : tideVerifier;
}
