// Summarize endpoint (owner after base: Tuấn; auth adapter from Trí).
// Order is fixed and fails closed: Tide ready -> verify -> authorize -> inference ready -> body -> provider.
// The provider is never called before auth, and the request body is never logged.
import type { ApiErrorBody, ModuleName, OperationErrorCode, OperationResult, SummarizeInput } from "@/contracts";
import { getInference } from "@/inference";
import { getTideVerifier } from "@/tide/server";

export const dynamic = "force-dynamic";

function error(status: number, body: ApiErrorBody) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function notReady(module: ModuleName, message: string) {
  return error(503, { code: "INTEGRATION_NOT_READY", module, message });
}

const STATUS_BY_CODE: Record<OperationErrorCode, number> = {
  INTEGRATION_NOT_READY: 503,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

function fromResult(result: Exclude<OperationResult<unknown>, { outcome: "allowed" }>) {
  switch (result.outcome) {
    case "not-ready":
      return notReady(result.module, result.cause);
    case "denied":
      return error(403, { code: "FORBIDDEN", message: result.cause });
    case "error":
      return error(STATUS_BY_CODE[result.code], { code: result.code, message: result.cause });
  }
}

function parseInput(raw: unknown): SummarizeInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { sourceRecordId, text, runId } = raw as Record<string, unknown>;
  if (typeof sourceRecordId !== "string" || typeof text !== "string" || typeof runId !== "string") return null;
  if (!sourceRecordId || !text.trim() || !runId) return null;
  return { sourceRecordId, text, runId };
}

export async function POST(request: Request) {
  const verifier = getTideVerifier();
  const tide = verifier.readiness();
  if (tide.state !== "ready") return notReady("tide", tide.detail);

  const session = await verifier.verify(request);
  if (session.status === "not-configured") return notReady("tide", session.reason);
  if (session.status !== "authenticated") return error(401, { code: "UNAUTHENTICATED", message: "No verified Tide session." });

  const authz = await verifier.authorize(session, "summarize");
  if (authz.outcome !== "allowed") return fromResult(authz);

  const inference = getInference();
  const ready = inference.readiness();
  if (ready.state !== "ready") return notReady("inference", ready.detail);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return error(400, { code: "INVALID_INPUT", message: "Body must be JSON." });
  }
  const input = parseInput(raw);
  if (!input) return error(400, { code: "INVALID_INPUT", message: "Expected { sourceRecordId, text, runId } strings." });

  const result = await inference.summarize(input);
  if (result.outcome !== "allowed") return fromResult(result);
  return Response.json(result.value, { headers: { "Cache-Control": "no-store" } });
}
