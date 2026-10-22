// Shared fail-closed guard for Triệu's protected routes (records, policies).
// Order: Tide ready -> verify token/DPoP -> authorize operation. Body is read only after this.
import type { ApiErrorBody, GuardedOperation, ModuleName, OperationErrorCode, OperationResult, SessionIdentity } from "@/contracts";
import { getTideVerifier } from "@/tide/server";

type Authenticated = Extract<SessionIdentity, { status: "authenticated" }>;

export const STATUS_BY_CODE: Record<OperationErrorCode, number> = {
  INTEGRATION_NOT_READY: 503,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export function apiError(status: number, body: ApiErrorBody) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiOk(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function notReady(module: ModuleName, message: string) {
  return apiError(503, { code: "INTEGRATION_NOT_READY", module, message });
}

export function fromResult(result: Exclude<OperationResult<unknown>, { outcome: "allowed" }>) {
  switch (result.outcome) {
    case "not-ready":
      return notReady(result.module, result.cause);
    case "denied":
      return apiError(403, { code: "FORBIDDEN", message: result.cause });
    case "error":
      return apiError(STATUS_BY_CODE[result.code], { code: result.code, message: result.cause });
  }
}

export async function guard(
  request: Request,
  operation: GuardedOperation,
): Promise<{ ok: true; session: Authenticated } | { ok: false; response: Response }> {
  const verifier = getTideVerifier();
  const tide = verifier.readiness();
  if (tide.state !== "ready") return { ok: false, response: notReady("tide", tide.detail) };

  const session = await verifier.verify(request);
  if (session.status === "not-configured") return { ok: false, response: notReady("tide", session.reason) };
  if (session.status !== "authenticated") {
    return { ok: false, response: apiError(401, { code: "UNAUTHENTICATED", message: "No verified Tide session." }) };
  }

  const authz = await verifier.authorize(session, operation);
  if (authz.outcome !== "allowed") return { ok: false, response: fromResult(authz) };
  return { ok: true, session };
}

const RECORD_ID = /^[A-Za-z0-9._-]{1,64}$/;
export function isRecordId(value: unknown): value is string {
  return typeof value === "string" && RECORD_ID.test(value);
}
