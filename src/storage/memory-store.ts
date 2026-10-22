// In-memory EncryptedRecord store (development only). Owner after base: Triệu.
// - Server memory only: everything is lost on restart. Not the persistent storage for S2 acceptance.
// - Accepts only the EncryptedRecord envelope shape; rejects plaintext-looking or unknown fields.
// - Cannot verify that `ciphertext` is real encryption: callers must only store Tide encrypt output.
// - No authorization here: API routes must verify + authorize before calling it.
// Only type imports, so checks can run this file directly with Node type stripping.
import type { EncryptedRecord, ModuleReadiness, OperationResult, StoragePort } from "../contracts/index.ts";

const ENVELOPE_KEYS = ["recordId", "assignmentId", "ciphertext", "policyRef", "version", "createdAt"] as const;
const ALLOWED = new Set<string>(ENVELOPE_KEYS);

export function validateEncryptedRecord(input: unknown): OperationResult<EncryptedRecord> {
  const invalid = (cause: string): OperationResult<EncryptedRecord> => ({
    outcome: "error",
    operation: "write-record",
    code: "INVALID_INPUT",
    cause,
  });
  if (typeof input !== "object" || input === null || Array.isArray(input)) return invalid("record must be an object");
  const obj = input as Record<string, unknown>;
  const extra = Object.keys(obj).filter((k) => !ALLOWED.has(k));
  if (extra.length > 0) return invalid(`unexpected field(s): ${extra.join(", ")} (only the encrypted envelope is stored)`);
  for (const key of ["recordId", "assignmentId", "ciphertext", "policyRef", "createdAt"] as const) {
    if (typeof obj[key] !== "string" || (obj[key] as string).length === 0) return invalid(`${key} must be a non-empty string`);
  }
  if (!Number.isInteger(obj.version) || (obj.version as number) < 1) return invalid("version must be a positive integer");
  if (Number.isNaN(Date.parse(obj.createdAt as string))) return invalid("createdAt must be an ISO timestamp");
  const record: EncryptedRecord = {
    recordId: obj.recordId as string,
    assignmentId: obj.assignmentId as string,
    ciphertext: obj.ciphertext as string,
    policyRef: obj.policyRef as string,
    version: obj.version as number,
    createdAt: obj.createdAt as string,
  };
  return { outcome: "allowed", value: record };
}

export class InMemoryEncryptedRecordStore implements StoragePort {
  #records = new Map<string, EncryptedRecord>();

  readiness(): ModuleReadiness {
    return {
      module: "storage",
      state: "ready",
      implementation: "in-memory-dev",
      persistent: false,
      detail: "Server memory only, lost on restart; envelope shape only; cannot verify ciphertext is real encryption; no public write route.",
    };
  }

  async put(record: unknown): Promise<OperationResult<EncryptedRecord>> {
    const checked = validateEncryptedRecord(record);
    if (checked.outcome !== "allowed") return checked;
    this.#records.set(checked.value.recordId, { ...checked.value });
    return { outcome: "allowed", value: { ...checked.value } };
  }

  async get(recordId: string): Promise<OperationResult<EncryptedRecord>> {
    const found = this.#records.get(recordId);
    return found
      ? { outcome: "allowed", value: { ...found } }
      : { outcome: "error", operation: "read-record", code: "NOT_FOUND", cause: "record not found", recordId };
  }

  async list(assignmentId?: string): Promise<OperationResult<EncryptedRecord[]>> {
    const all = [...this.#records.values()].filter((r) => !assignmentId || r.assignmentId === assignmentId);
    return { outcome: "allowed", value: all.map((r) => ({ ...r })) };
  }
}
