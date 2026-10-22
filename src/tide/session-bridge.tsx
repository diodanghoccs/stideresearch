"use client";

// Real TideSessionPort on top of @tidecloak/nextjs (useTideCloak) and the official
// RelationshipAttestation helper (./relationship.ts, copied verbatim from the Tide pack).
// Written by Triệu's dev on 22/10 to unblock integration; owner of src/tide remains Trí.
// Browser only: the user's credential never leaves the Tide enclave.
import { useMemo, type ReactNode } from "react";
import { useTideCloak } from "@tidecloak/nextjs";
import type { EncryptedRecord, OperationResult, PolicyRequest, SessionIdentity, SignedPolicy, TideSessionPort } from "@/contracts";
import { TideSessionContext } from "@/app/workflow/session-context";
import { decryptForRecord, encryptForRecord, readSession, signRelationshipPolicy } from "./relationship";

function describe(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: unknown }).cause;
  const causeText = cause instanceof Error ? cause.message : cause ? JSON.stringify(cause) : "";
  return causeText ? `${err.message} — cause: ${causeText}` : err.message;
}

/**
 * The pack documents that a contract refusal surfaces as a threshold failure carrying the ORK cause.
 * A bare THRESHOLD_FAILURE is also what a network/ORK outage looks like, so it is NOT a deny on its
 * own: only a recognised contract cause makes it `denied`; everything else stays an error.
 */
const CONTRACT_DENY_CAUSE = /subjectId does not match|not found in doken|Tags do not contain|not found in list of roles|role not found/i;

function fromTideError<T>(operation: string, err: unknown, recordId?: string): OperationResult<T> {
  const text = describe(err);
  if (CONTRACT_DENY_CAUSE.test(text)) {
    return { outcome: "denied", operation, cause: text, recordId };
  }
  const cause = /THRESHOLD_FAILURE/i.test(text) ? `${text} (no contract cause: not concluded as a deny)` : text;
  return { outcome: "error", operation, code: "UPSTREAM_ERROR", cause, recordId };
}

function notSignedIn<T>(operation: string): OperationResult<T> {
  return { outcome: "error", operation, code: "UNAUTHENTICATED", cause: "Sign in with Tide first." };
}

export function TideSessionBridge({ children }: { children: ReactNode }) {
  const tc = useTideCloak();
  const { authenticated, isInitializing, initError, token } = tc;

  const port = useMemo<TideSessionPort>(() => {
    const readiness = () =>
      initError
        ? { module: "tide" as const, state: "error" as const, implementation: "tidecloak-nextjs-session", detail: initError.message }
        : { module: "tide" as const, state: "ready" as const, implementation: "tidecloak-nextjs-session", detail: "TideCloak provider initialised." };

    return {
      readiness,
      async getSession(): Promise<SessionIdentity> {
        if (initError) return { status: "not-configured", reason: `Tide init failed: ${initError.message}` };
        if (isInitializing || !authenticated) return { status: "unauthenticated" };
        const s = readSession();
        return {
          status: "authenticated",
          principalId: String(tc.getValueFromToken("sub") ?? ""),
          displayName: tc.getValueFromToken("preferred_username") ?? undefined,
          roles: s.realmRoles,
          tideUserKey: s.tideUserKey || undefined,
          verifiedBy: "tide",
        };
      },
      login: () => tc.login(),
      logout: () => tc.logout(),
      async authFetch(url: string, init?: RequestInit): Promise<OperationResult<Response>> {
        if (!authenticated) return notSignedIn("auth-fetch");
        try {
          // secureFetch attaches the access token with a DPoP proof for this URL and method.
          return { outcome: "allowed", value: await tc.secureFetch(url, init) };
        } catch (e) {
          return { outcome: "error", operation: "auth-fetch", code: "UPSTREAM_ERROR", cause: describe(e) };
        }
      },
      async signPolicy(req: PolicyRequest): Promise<OperationResult<SignedPolicy>> {
        if (!authenticated) return notSignedIn("sign-policy");
        try {
          // The realm admin policy authorises the signing (fetched with the admin's own token).
          const cfg = tc.getConfig();
          const base = String(cfg["auth-server-url"]).replace(/\/+$/, "");
          const res = await tc.secureFetch(`${base}/admin/realms/${cfg.realm}/iga/role-policies/name/tide-realm-admin`);
          if (!res.ok) return { outcome: "error", operation: "sign-policy", code: res.status === 403 ? "FORBIDDEN" : "UPSTREAM_ERROR", cause: `admin policy fetch HTTP ${res.status}` };
          const { policy } = (await res.json()) as { policy?: string };
          if (!policy) return { outcome: "error", operation: "sign-policy", code: "UPSTREAM_ERROR", cause: "admin policy missing in response" };
          const adminPolicy = Uint8Array.from(atob(policy), (c) => c.charCodeAt(0));
          const policyB64 = await signRelationshipPolicy(
            { vendorId: tc.getVendorId(), subject: { type: req.subjectType, id: req.subjectId }, recordId: req.recordId, access: req.access },
            adminPolicy,
          );
          return {
            outcome: "allowed",
            value: {
              policyId: crypto.randomUUID(),
              recordId: req.recordId,
              subjectType: req.subjectType,
              subjectId: req.subjectId,
              subjectLabel: req.subjectLabel,
              access: req.access,
              policyB64,
              grantedBy: String(tc.getValueFromToken("sub") ?? ""),
              createdAt: new Date().toISOString(),
            },
          };
        } catch (e) {
          return fromTideError("sign-policy", e, req.recordId);
        }
      },
      async encrypt({ assignmentId, plaintext, policy }): Promise<OperationResult<EncryptedRecord>> {
        if (!authenticated) return notSignedIn("encrypt");
        try {
          const ciphertext = await encryptForRecord(plaintext, assignmentId, policy.policyB64);
          return {
            outcome: "allowed",
            value: { recordId: assignmentId, assignmentId, ciphertext, policyRef: policy.policyId, version: 1, createdAt: new Date().toISOString() },
          };
        } catch (e) {
          return fromTideError("encrypt", e, assignmentId);
        }
      },
      async decrypt({ record, policy }): Promise<OperationResult<{ recordId: string; plaintext: string }>> {
        if (!authenticated) return notSignedIn("decrypt");
        try {
          const plaintext = await decryptForRecord(record.ciphertext, record.assignmentId, policy.policyB64);
          return { outcome: "allowed", value: { recordId: record.recordId, plaintext } };
        } catch (e) {
          return fromTideError("decrypt", e, record.recordId);
        }
      },
    };
    // token in deps: a refreshed session rebuilds the port so consumers re-read the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, isInitializing, initError, token]);

  return <TideSessionContext.Provider value={port}>{children}</TideSessionContext.Provider>;
}
