import type { ApiErrorBody, InferencePort, ModuleName, OperationErrorCode, OperationResult, TideRequestVerifier } from "../contracts/index.ts";
import { MAX_BODY_BYTES, parseSummarizeInput } from "./input.ts";

interface Dependencies {
  getVerifier(): TideRequestVerifier;
  getInference(): InferencePort;
}

function error(status: number, body: ApiErrorBody) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function notReady(module: ModuleName, message: string) {
  return error(503, { code: "INTEGRATION_NOT_READY", module, message });
}

const STATUS_BY_CODE: Record<OperationErrorCode, number> = {
  INTEGRATION_NOT_READY: 503, UNAUTHENTICATED: 401, FORBIDDEN: 403,
  INVALID_INPUT: 400, NOT_FOUND: 404, UPSTREAM_ERROR: 502, INTERNAL_ERROR: 500,
};

function fromResult(result: Exclude<OperationResult<unknown>, { outcome: "allowed" }>) {
  switch (result.outcome) {
    case "not-ready": return notReady(result.module, result.cause);
    case "denied": return error(403, { code: "FORBIDDEN", message: result.cause });
    case "error": return error(STATUS_BY_CODE[result.code], { code: result.code, message: result.cause });
  }
}

async function readBoundedBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } catch {
    void reader.cancel().catch(() => {});
    throw new Error("Invalid request body.");
  } finally {
    reader.releaseLock();
  }
}

// Tests inject ports locally to exercise control flow, not real Tide credentials.
// The production route supplies only the real getters, with no mock/auth toggle.
export function createSummarizeHandler(deps: Dependencies) {
  return async function summarize(request: Request): Promise<Response> {
    try {
      const verifier = deps.getVerifier();
      const tide = verifier.readiness();
      if (tide.state !== "ready") return notReady("tide", tide.detail);

      const session = await verifier.verify(request);
      if (session.status === "not-configured") return notReady("tide", session.reason);
      if (session.status !== "authenticated") return error(401, { code: "UNAUTHENTICATED", message: "No verified Tide session." });

      const authz = await verifier.authorize(session, "summarize");
      if (authz.outcome !== "allowed") return fromResult(authz);

      const inference = deps.getInference();
      const ready = inference.readiness();
      if (ready.state !== "ready") return notReady("inference", ready.detail);

      let raw: unknown;
      try {
        const body = await readBoundedBody(request);
        if (body === null) return error(413, { code: "INVALID_INPUT", message: "Body exceeds 64 KiB." });
        raw = JSON.parse(body);
      } catch {
        return error(400, { code: "INVALID_INPUT", message: "Body must be valid UTF-8 JSON." });
      }
      const input = parseSummarizeInput(raw);
      if (!input) return error(400, { code: "INVALID_INPUT", message: "Expected { sourceRecordId: 'A', text, runId }; text must be nonempty and at most 20,000 characters, runId nonempty and at most 128 characters, with no extra fields." });

      try {
        const result = await inference.summarize(input);
        if (result.outcome !== "allowed") return fromResult(result);
        return Response.json(result.value, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return error(502, { code: "UPSTREAM_ERROR", message: "Inference request failed." });
      }
    } catch {
      // The verifier owns real authentication decisions; arbitrary failures are
      // internal errors, never invented denials or an authenticated fallback.
      return error(500, { code: "INTERNAL_ERROR", message: "Summarize request could not be verified or processed." });
    }
  };
}
