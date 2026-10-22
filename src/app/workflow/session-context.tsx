"use client";

// Session seam between the UI (Triệu) and the Tide session adapter (Trí).
// Default is the unconfigured stub, so the UI can never show a fake identity or fake success.
// Trí's real adapter is supplied by wrapping the app: <TideSessionContext.Provider value={realPort}>.
import { createContext, useContext } from "react";
import type { ApiErrorBody, OperationResult, TideSessionPort } from "@/contracts";
import { unconfiguredTideSession } from "@/tide/session";

export const TideSessionContext = createContext<TideSessionPort>(unconfiguredTideSession);

export function useTideSession(): TideSessionPort {
  return useContext(TideSessionContext);
}

/** Call an app API with the session's credentials and map the HTTP answer to an OperationResult. */
export async function apiJson<T>(session: TideSessionPort, operation: string, url: string, init?: RequestInit): Promise<OperationResult<T>> {
  const sent = await session.authFetch(url, init);
  if (sent.outcome !== "allowed") return sent;
  const res = sent.value;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body: handled below by status
  }
  if (res.ok) return { outcome: "allowed", value: body as T };
  const err = (body ?? {}) as Partial<ApiErrorBody>;
  const cause = err.message ?? `HTTP ${res.status}`;
  if (res.status === 503 && err.code === "INTEGRATION_NOT_READY") {
    return { outcome: "not-ready", operation, module: err.module ?? "tide", code: "INTEGRATION_NOT_READY", cause };
  }
  if (res.status === 403) return { outcome: "denied", operation, cause };
  return { outcome: "error", operation, code: err.code ?? "INTERNAL_ERROR", cause: `HTTP ${res.status}: ${cause}` };
}
