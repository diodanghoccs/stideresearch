// Browser/session Tide boundary. Owner after base: Trí.
// Real implementation wraps @tidecloak/nextjs (TideCloakProvider / useTideCloak) and the pack's
// relationship.ts helper once data/tidecloak.json exists. Until then nothing here pretends to log in,
// sign, encrypt or decrypt. (Stub signatures updated by Triệu for the contracts change of 22/10.)
import type {
  EncryptedRecord,
  ModuleReadiness,
  OperationResult,
  PolicyRequest,
  SessionIdentity,
  SignedPolicy,
  TideSessionPort,
} from "@/contracts";

const REASON = "Tide session adapter not implemented (SDK provider not wired, owner: Trí).";

function notReady<T>(operation: string, detail = REASON): OperationResult<T> {
  return { outcome: "not-ready", operation, module: "tide", code: "INTEGRATION_NOT_READY", cause: detail };
}

export const unconfiguredTideSession: TideSessionPort = {
  readiness(): ModuleReadiness {
    return { module: "tide", state: "not-implemented", implementation: "unconfigured-tide-session", detail: REASON };
  },
  async getSession(): Promise<SessionIdentity> {
    return { status: "not-configured", reason: REASON };
  },
  async authFetch(_url: string, _init?: RequestInit): Promise<OperationResult<Response>> {
    // No session: never send the request.
    return notReady("auth-fetch");
  },
  async signPolicy(_input: PolicyRequest): Promise<OperationResult<SignedPolicy>> {
    return notReady("sign-policy");
  },
  async encrypt(_input: { assignmentId: string; plaintext: string; policy: SignedPolicy }): Promise<OperationResult<EncryptedRecord>> {
    // Never echo the plaintext back as "ciphertext".
    return notReady("encrypt");
  },
  async decrypt(input: { record: EncryptedRecord; policy: SignedPolicy }): Promise<OperationResult<{ recordId: string; plaintext: string }>> {
    return notReady("decrypt", `${REASON} (record ${input.record.recordId})`);
  },
};
