// Browser/session Tide boundary. Owner after base: Trí.
// Real implementation wraps @tidecloak/nextjs (TideCloakProvider / useTideCloak) once
// data/tidecloak.json exists. Until then nothing here pretends to log in, encrypt or decrypt.
import type { EncryptedRecord, ModuleReadiness, OperationResult, SessionIdentity, TideSessionPort } from "@/contracts";

const REASON = "Tide session adapter not implemented in base (SDK provider not wired, owner: Trí).";

export const unconfiguredTideSession: TideSessionPort = {
  readiness(): ModuleReadiness {
    return { module: "tide", state: "not-implemented", implementation: "unconfigured-tide-session", detail: REASON };
  },
  async getSession(): Promise<SessionIdentity> {
    return { status: "not-configured", reason: REASON };
  },
  async encrypt(_input: { assignmentId: string; plaintext: string }): Promise<OperationResult<EncryptedRecord>> {
    // Never echo the plaintext back as "ciphertext".
    return { outcome: "not-ready", operation: "encrypt", module: "tide", code: "INTEGRATION_NOT_READY", cause: REASON };
  },
  async decrypt(input: { record: EncryptedRecord }): Promise<OperationResult<{ recordId: string; plaintext: string }>> {
    return {
      outcome: "not-ready",
      operation: "decrypt",
      module: "tide",
      code: "INTEGRATION_NOT_READY",
      cause: `${REASON} (record ${input.record.recordId})`,
    };
  },
};
