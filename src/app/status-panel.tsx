"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiErrorBody, HealthResponse, ModuleName, ReadinessState } from "@/contracts";

type HealthView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: HealthResponse };

type ProbeView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; status: number; body: ApiErrorBody | Record<string, unknown> };

const LABEL: Record<ModuleName, string> = { tide: "Tide (identity + decrypt)", inference: "AI inference", storage: "Encrypted record storage" };
const STATE_TEXT: Record<ReadinessState, string> = {
  ready: "Ready",
  "not-configured": "Not configured",
  "not-implemented": "Not implemented",
  error: "Error",
};

export function StatusPanel() {
  const [health, setHealth] = useState<HealthView>({ kind: "loading" });
  const [probe, setProbe] = useState<ProbeView>({ kind: "idle" });

  const loadHealth = useCallback(async () => {
    setHealth({ kind: "loading" });
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth({ kind: "loaded", data: (await res.json()) as HealthResponse });
    } catch (e) {
      setHealth({ kind: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  async function runProbe() {
    setProbe({ kind: "loading" });
    try {
      // Empty probe: no source text is sent. Shows the real fail-closed response.
      const res = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setProbe({ kind: "done", status: res.status, body: await res.json() });
    } catch (e) {
      setProbe({ kind: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
  }

  return (
    <section aria-labelledby="status-h">
      <div className="row">
        <h2 id="status-h">Integration status</h2>
        <button type="button" onClick={() => void loadHealth()} disabled={health.kind === "loading"}>
          Refresh
        </button>
      </div>

      {health.kind === "loading" && <p className="muted" role="status">Checking /api/health…</p>}
      {health.kind === "error" && (
        <p className="err" role="alert">
          Could not reach /api/health: {health.message}
        </p>
      )}
      {health.kind === "loaded" && (
        <ul className="modules">
          {(Object.keys(LABEL) as ModuleName[]).map((m) => {
            const r = health.data.modules[m];
            return (
              <li key={m}>
                <div className="row">
                  <strong>{LABEL[m]}</strong>
                  <span className={`badge s-${r.state}`}>{STATE_TEXT[r.state]}</span>
                </div>
                <p className="muted">
                  <code>{r.implementation}</code>
                  {r.persistent === false && " · not persistent"} — {r.detail}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {health.kind === "loaded" && <p className="muted small">Checked at {health.data.checkedAt}</p>}

      <div className="probe">
        <div className="row">
          <h3>Summarize endpoint</h3>
          <button type="button" onClick={() => void runProbe()} disabled={probe.kind === "loading"}>
            {probe.kind === "loading" ? "Calling…" : "Call /api/summarize"}
          </button>
        </div>
        {probe.kind === "idle" && <p className="muted">Sends an empty request to show how the endpoint answers right now.</p>}
        {probe.kind === "error" && <p className="err" role="alert">Request failed: {probe.message}</p>}
        {probe.kind === "done" && (
          <p className={probe.status === 200 ? "ok" : "warn"} role="status">
            HTTP {probe.status}
            {"code" in probe.body && ` · ${String(probe.body.code)}`}
            {"message" in probe.body && ` — ${String(probe.body.message)}`}
          </p>
        )}
      </div>
    </section>
  );
}
