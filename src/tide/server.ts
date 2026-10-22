// Server-side Tide boundary. Owner after base: Trí.
// Base ships only the unconfigured verifier: it never authenticates anyone and never authorizes.
// Replace with a real verifier per the Tide playbooks verify-jwt-server-side / protect-api-nextjs.
import type { GuardedOperation, ModuleReadiness, OperationResult, SessionIdentity, TideRequestVerifier } from "@/contracts";

const REASON = "Tide server verifier not implemented in base (JWT/DPoP verification pending, owner: Trí).";

export const unconfiguredTideVerifier: TideRequestVerifier = {
  readiness(): ModuleReadiness {
    return { module: "tide", state: "not-implemented", implementation: "unconfigured-tide", detail: REASON };
  },
  async verify(_request: Request): Promise<SessionIdentity> {
    // Deliberately does not read or parse any Authorization header.
    return { status: "not-configured", reason: REASON };
  },
  async authorize(_session: SessionIdentity, operation: GuardedOperation): Promise<OperationResult<void>> {
    return { outcome: "not-ready", operation, module: "tide", code: "INTEGRATION_NOT_READY", cause: REASON };
  },
};

export function getTideVerifier(): TideRequestVerifier {
  return unconfiguredTideVerifier;
}
