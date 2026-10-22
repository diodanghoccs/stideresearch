// In-memory signed-policy store (development only). Owner: Triệu.
// - Server memory only: lost on restart, like the record store.
// - Validates shape only. It cannot check the Tide signature; the ORKs reject a bad policy on use.
// - No authorization here: routes verify the caller and require "store-policy" (admin) first.
// Only type imports, so checks can run this file directly with Node type stripping.
import type { OperationResult, PolicyAccess, PolicyStorePort, PolicySubjectType, SignedPolicy } from "../contracts/index.ts";

const SUBJECT_TYPES: readonly PolicySubjectType[] = ["User", "Group", "Role"];
const ACCESS: readonly PolicyAccess[] = ["read", "write", "read-write"];
const ALLOWED = new Set(["policyId", "recordId", "subjectType", "subjectId", "subjectLabel", "access", "policyB64", "grantedBy", "createdAt"]);
const BASE64 = /^[A-Za-z0-9+/_-]+={0,2}$/;

function invalid(cause: string): OperationResult<SignedPolicy> {
  return { outcome: "error", operation: "store-policy", code: "INVALID_INPUT", cause };
}

/** grantedBy always comes from the verified admin session, never from the request body. */
export function validateSignedPolicy(input: unknown, grantedBy: string): OperationResult<SignedPolicy> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return invalid("policy must be an object");
  const obj = input as Record<string, unknown>;
  const extra = Object.keys(obj).filter((k) => !ALLOWED.has(k));
  if (extra.length > 0) return invalid(`unexpected field(s): ${extra.join(", ")}`);
  for (const key of ["policyId", "recordId", "subjectId", "policyB64"] as const) {
    if (typeof obj[key] !== "string" || !(obj[key] as string).trim()) return invalid(`${key} must be a non-empty string`);
  }
  if (!SUBJECT_TYPES.includes(obj.subjectType as PolicySubjectType)) return invalid("subjectType must be User, Group or Role");
  if (!ACCESS.includes(obj.access as PolicyAccess)) return invalid("access must be read, write or read-write");
  if (!BASE64.test(obj.policyB64 as string)) return invalid("policyB64 must be base64");
  if (obj.subjectLabel !== undefined && typeof obj.subjectLabel !== "string") return invalid("subjectLabel must be a string");
  if (!grantedBy) return invalid("grantedBy missing (no verified admin)");
  return {
    outcome: "allowed",
    value: {
      policyId: obj.policyId as string,
      recordId: obj.recordId as string,
      subjectType: obj.subjectType as PolicySubjectType,
      subjectId: obj.subjectId as string,
      subjectLabel: obj.subjectLabel as string | undefined,
      access: obj.access as PolicyAccess,
      policyB64: obj.policyB64 as string,
      grantedBy,
      createdAt: new Date().toISOString(),
    },
  };
}

export class InMemoryPolicyStore implements PolicyStorePort {
  #byId = new Map<string, SignedPolicy>();

  async put(policy: unknown, grantedBy: string): Promise<OperationResult<SignedPolicy>> {
    const checked = validateSignedPolicy(policy, grantedBy);
    if (checked.outcome !== "allowed") return checked;
    this.#byId.set(checked.value.policyId, { ...checked.value });
    return { outcome: "allowed", value: { ...checked.value } };
  }

  async listForRecord(recordId: string): Promise<OperationResult<SignedPolicy[]>> {
    const list = [...this.#byId.values()].filter((p) => p.recordId === recordId).map((p) => ({ ...p }));
    return { outcome: "allowed", value: list };
  }
}
