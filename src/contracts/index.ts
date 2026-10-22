// Shared C2 contracts. Every module (tide / inference / storage / UI / checks) imports from here.
// Owner after base handoff: Triệu. Do not change these types silently: announce changes to the
// modules that depend on them. Contracts are SDK-agnostic; no Tide SDK types leak in here.

export type ModuleName = "tide" | "inference" | "storage";

/**
 * - ready: the real integration is wired and usable.
 * - not-configured: required config/secret is missing.
 * - not-implemented: no real adapter exists yet (stub).
 * - error: configured but failing.
 */
export type ReadinessState = "ready" | "not-configured" | "not-implemented" | "error";

export interface ModuleReadiness {
  module: ModuleName;
  state: ReadinessState;
  /** Implementation name, e.g. "unconfigured-tide". Stubs must never be named real/secure. */
  implementation: string;
  /** Human-readable reason. Must not contain secrets, tokens or env values. */
  detail: string;
  /** Storage only: false means data is lost on restart. */
  persistent?: boolean;
}

/** Demo personas from the S2 brief. Metadata only: an alias never makes an identity verified. */
export type DemoAlias = "lan" | "ai-reader" | "minh" | "y";

export type SessionIdentity =
  | { status: "not-configured"; reason: string }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      /** Stable principal id from a verified Tide token (never from an unverified JWT). */
      principalId: string;
      displayName?: string;
      demoAlias?: DemoAlias;
      verifiedBy: "tide";
    };

/** Stored record. Holds no plaintext and no private key. */
export interface EncryptedRecord {
  recordId: string;
  /** Dataset / channel tag, e.g. "dataset-A", "channel-minh". */
  assignmentId: string;
  /** Opaque ciphertext produced by Tide encrypt. Storage cannot verify it is real encryption. */
  ciphertext: string;
  /** Opaque signed policy or policy reference. */
  policyRef: string;
  version: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** AI draft. Plaintext: never stored as an EncryptedRecord before Lan reviews and encrypts it. */
export interface DraftBrief {
  sourceRecordId: string;
  text: string;
  model: string;
  provider: string;
  runId: string;
  createdAt: string;
}

export type OperationErrorCode =
  | "INTEGRATION_NOT_READY"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

/**
 * Result of any guarded operation.
 * "denied" is only for a real authorization decision (e.g. Tide/ORK refused); never map
 * arbitrary exceptions to denied.
 */
export type OperationResult<T> =
  | { outcome: "allowed"; value: T }
  | { outcome: "denied"; operation: string; cause: string; recordId?: string }
  | { outcome: "error"; operation: string; code: OperationErrorCode; cause: string; recordId?: string }
  | { outcome: "not-ready"; operation: string; module: ModuleName; code: "INTEGRATION_NOT_READY"; cause: string };

export type GuardedOperation = "summarize" | "encrypt" | "decrypt" | "read-record" | "write-record";

// ---------- Ports ----------

/** Browser/session side of Tide (login state, encrypt, decrypt). Owner: Trí. */
export interface TideSessionPort {
  readiness(): ModuleReadiness;
  getSession(): Promise<SessionIdentity>;
  encrypt(input: { assignmentId: string; plaintext: string }): Promise<OperationResult<EncryptedRecord>>;
  decrypt(input: { record: EncryptedRecord }): Promise<OperationResult<{ recordId: string; plaintext: string }>>;
}

/** Server side of Tide: verify the request token, then authorize the operation. Owner: Trí. */
export interface TideRequestVerifier {
  readiness(): ModuleReadiness;
  /** Must verify signature/DPoP. Never parse an unverified JWT and treat it as authenticated. */
  verify(request: Request): Promise<SessionIdentity>;
  authorize(session: SessionIdentity, operation: GuardedOperation): Promise<OperationResult<void>>;
}

export interface SummarizeInput {
  /** The record the AI-reader was granted (dataset A in the demo). */
  sourceRecordId: string;
  text: string;
  runId: string;
}

/** Owner: Tuấn. Must not read storage or B, and never receives Tide credentials. */
export interface InferencePort {
  readiness(): ModuleReadiness;
  summarize(input: SummarizeInput): Promise<OperationResult<DraftBrief>>;
}

/** Server-side envelope store. Does not grant access or verify tokens: callers authorize first. */
export interface StoragePort {
  readiness(): ModuleReadiness;
  put(record: unknown): Promise<OperationResult<EncryptedRecord>>;
  get(recordId: string): Promise<OperationResult<EncryptedRecord>>;
  list(assignmentId?: string): Promise<OperationResult<EncryptedRecord[]>>;
}

// ---------- HTTP shapes ----------

export interface HealthResponse {
  status: "live";
  checkedAt: string;
  modules: Record<ModuleName, ModuleReadiness>;
}

export interface ApiErrorBody {
  code: OperationErrorCode;
  message: string;
  module?: ModuleName;
}
