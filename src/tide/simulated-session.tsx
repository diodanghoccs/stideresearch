"use client";

// Plan C simulated session: same TideSessionPort as the real bridge, so the UI and API are unchanged.
// It simulates sign-in, roles and the RelationshipAttestation:1 checks the ORKs would make
// (subject, role, tag, policy access). Every result says SIMULATED. Not real encryption.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { EncryptedRecord, OperationResult, PolicyRequest, SessionIdentity, SignedPolicy, TideSessionPort } from "@/contracts";
import { TideSessionContext } from "@/app/workflow/session-context";
import { SIM_USERS, simUserKey, type SimAlias } from "./simulated-users";

interface SimPolicy {
  simulated: true;
  recordId: string;
  subjectType: string;
  subjectId: string;
  access: string;
}

const CIPHER_PREFIX = "SIMULATED-CIPHERTEXT:";
const toB64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const fromB64 = (s: string) => decodeURIComponent(escape(atob(s)));

function denied<T>(operation: string, cause: string, recordId?: string): OperationResult<T> {
  return { outcome: "denied", operation, cause: `SIMULATED ORK (Plan C): ${cause}`, recordId };
}

/** The checks RelationshipAttestation:1 makes, simulated. Returns a deny cause or null. */
function check(alias: SimAlias, policy: SimPolicy, recordId: string, op: "encrypt" | "decrypt"): string | null {
  const role = op === "encrypt" ? "_tide_encryptor" : "_tide_decryptor";
  if (!SIM_USERS[alias].roles.includes(role)) return `'${role}' role not found for this ${op}ion request.`;
  const grants = policy.access === "read-write" || (op === "encrypt" ? policy.access === "write" : policy.access === "read");
  if (!grants) return `${role} not found in list of roles.`;
  if (policy.recordId !== recordId) return "Tags do not contain assignmentId.";
  if (policy.subjectType === "User" && policy.subjectId !== simUserKey(alias)) return "subjectId does not match.";
  return null;
}

function readPolicy(p: SignedPolicy): SimPolicy | null {
  try {
    const parsed = JSON.parse(fromB64(p.policyB64)) as SimPolicy;
    return parsed.simulated ? parsed : null;
  } catch {
    return null;
  }
}

export const SimulatedIdentityContext = createContext<{ alias: SimAlias | null; setAlias: (a: SimAlias | null) => void } | null>(null);
export const useSimulatedIdentity = () => useContext(SimulatedIdentityContext);

export function SimulatedSessionProvider({ children }: { children: ReactNode }) {
  const [alias, setAlias] = useState<SimAlias | null>(null);

  const port = useMemo<TideSessionPort>(() => {
    const signedIn = <T,>(op: string): OperationResult<T> | null =>
      alias ? null : { outcome: "error", operation: op, code: "UNAUTHENTICATED", cause: "Pick a simulated identity first." };
    return {
      readiness: () => ({ module: "tide", state: "ready", implementation: "SIMULATED-session (Plan C)", detail: "SIMULATED: sign-in, roles and ORK checks are simulated." }),
      async getSession(): Promise<SessionIdentity> {
        if (!alias) return { status: "unauthenticated" };
        return {
          status: "authenticated",
          principalId: `sim-${alias}`,
          displayName: `${SIM_USERS[alias].name} (SIMULATED)`,
          roles: SIM_USERS[alias].roles,
          tideUserKey: simUserKey(alias),
          verifiedBy: "simulated",
        };
      },
      async authFetch(url: string, init?: RequestInit): Promise<OperationResult<Response>> {
        const no = signedIn<Response>("auth-fetch");
        if (no) return no;
        const headers = new Headers(init?.headers);
        headers.set("X-Simulated-User", alias!);
        return { outcome: "allowed", value: await fetch(url, { ...init, headers }) };
      },
      async signPolicy(req: PolicyRequest): Promise<OperationResult<SignedPolicy>> {
        const no = signedIn<SignedPolicy>("sign-policy");
        if (no) return no;
        if (!SIM_USERS[alias!].roles.includes("tide-realm-admin")) return denied("sign-policy", "only a tide-realm-admin can approve a grant.", req.recordId);
        const policy: SimPolicy = { simulated: true, recordId: req.recordId, subjectType: req.subjectType, subjectId: req.subjectId, access: req.access };
        return {
          outcome: "allowed",
          value: {
            policyId: crypto.randomUUID(),
            recordId: req.recordId,
            subjectType: req.subjectType,
            subjectId: req.subjectId,
            subjectLabel: req.subjectLabel ? `${req.subjectLabel} (SIMULATED)` : "(SIMULATED)",
            access: req.access,
            policyB64: toB64(JSON.stringify(policy)),
            grantedBy: `sim-${alias}`,
            createdAt: new Date().toISOString(),
          },
        };
      },
      async encrypt({ assignmentId, plaintext, policy }): Promise<OperationResult<EncryptedRecord>> {
        const no = signedIn<EncryptedRecord>("encrypt");
        if (no) return no;
        const p = readPolicy(policy);
        if (!p) return { outcome: "error", operation: "encrypt", code: "INVALID_INPUT", cause: "Not a simulated policy." };
        const cause = check(alias!, p, assignmentId, "encrypt");
        if (cause) return denied("encrypt", cause, assignmentId);
        return {
          outcome: "allowed",
          value: { recordId: assignmentId, assignmentId, ciphertext: CIPHER_PREFIX + toB64(plaintext), policyRef: policy.policyId, version: 1, createdAt: new Date().toISOString() },
        };
      },
      async decrypt({ record, policy }): Promise<OperationResult<{ recordId: string; plaintext: string }>> {
        const no = signedIn<{ recordId: string; plaintext: string }>("decrypt");
        if (no) return no;
        const p = readPolicy(policy);
        if (!p || !record.ciphertext.startsWith(CIPHER_PREFIX)) {
          return { outcome: "error", operation: "decrypt", code: "INVALID_INPUT", cause: "Not a simulated record/policy." };
        }
        const cause = check(alias!, p, record.assignmentId, "decrypt");
        if (cause) return denied("decrypt", cause, record.recordId);
        return { outcome: "allowed", value: { recordId: record.recordId, plaintext: fromB64(record.ciphertext.slice(CIPHER_PREFIX.length)) } };
      },
    };
  }, [alias]);

  return (
    <SimulatedIdentityContext.Provider value={{ alias, setAlias }}>
      <TideSessionContext.Provider value={port}>{children}</TideSessionContext.Provider>
    </SimulatedIdentityContext.Provider>
  );
}
