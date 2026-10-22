"use client";

import { useEffect, useState, type ReactNode } from "react";
import type {
  DraftBrief,
  EncryptedRecord,
  OperationResult,
  PolicyAccess,
  PolicySubjectType,
  SessionIdentity,
  SignedPolicy,
} from "@/contracts";
import { apiJson, useTideSession } from "./session-context";

const REC = { A: "rec-A", B: "rec-B", S: "rec-S" } as const;
const RECORDS = [REC.A, REC.B, REC.S];

type View<T> = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: OperationResult<T> };
const IDLE = { kind: "idle" } as const;

function ResultLine<T>({ view, ok }: { view: View<T>; ok?: (value: T) => ReactNode }) {
  if (view.kind === "idle") return null;
  if (view.kind === "loading") return <p className="muted" role="status">Working…</p>;
  const r = view.result;
  switch (r.outcome) {
    case "allowed":
      return <div className="ok" role="status">{ok ? ok(r.value) : "Done."}</div>;
    case "denied":
      return <p className="err" role="alert">Denied ({r.operation}): {r.cause}</p>;
    case "not-ready":
      return <p className="warn" role="status">Not run: {r.module} not ready ({r.operation}) — {r.cause}</p>;
    case "error":
      return <p className="err" role="alert">Error {r.code} ({r.operation}): {r.cause}</p>;
  }
}

function SessionBadge({ session }: { session: SessionIdentity | null }) {
  const port = useTideSession();
  if (!session) return <p className="muted" role="status">Checking Tide session…</p>;
  if (session.status === "not-configured") return <p className="warn">Not signed in — Tide not configured. {session.reason}</p>;
  if (session.status === "unauthenticated") {
    return (
      <div className="row">
        <p className="warn">Not signed in.</p>
        {port.login && <button type="button" onClick={() => void port.login?.()}>Sign in with Tide</button>}
      </div>
    );
  }
  return (
    <div className="session">
      <div className="row">
        <p className="ok">
          Signed in with Tide: <code>{session.displayName ?? session.principalId}</code>
          {session.demoAlias && <span className="badge s-ready"> {session.demoAlias}</span>}
        </p>
        {port.logout && <button type="button" onClick={() => void port.logout?.()}>Sign out</button>}
      </div>
      <p className="muted small">
        Roles: {session.roles?.filter((r) => r.startsWith("_tide_") || r === "tide-realm-admin").join(", ") || "none"}
        {session.tideUserKey && (
          <>
            {" · "}your user key (give it to Lan for a User policy):{" "}
            <code>{session.tideUserKey.slice(0, 24)}…</code>{" "}
            <button type="button" onClick={() => void navigator.clipboard.writeText(session.tideUserKey ?? "")}>Copy key</button>
          </>
        )}
      </p>
    </div>
  );
}

/** Loads the signed policies of one record and lets the user pick one. */
function PolicyPicker({ recordId, value, onChange }: { recordId: string; value: SignedPolicy | null; onChange: (p: SignedPolicy | null) => void }) {
  const session = useTideSession();
  const [view, setView] = useState<View<SignedPolicy[]>>(IDLE);
  const policies = view.kind === "done" && view.result.outcome === "allowed" ? view.result.value : [];

  async function load() {
    setView({ kind: "loading" });
    onChange(null);
    const result = await apiJson<SignedPolicy[]>(session, "read-policy", `/api/policies?recordId=${encodeURIComponent(recordId)}`);
    setView({ kind: "done", result });
    if (result.outcome === "allowed" && result.value.length > 0) onChange(result.value[0]);
  }

  return (
    <div className="picker">
      <div className="row">
        <label>
          Policy for <code>{recordId}</code>{" "}
          <select
            value={value?.policyId ?? ""}
            onChange={(e) => onChange(policies.find((p) => p.policyId === e.target.value) ?? null)}
            disabled={policies.length === 0}
          >
            {policies.length === 0 && <option value="">(none loaded)</option>}
            {policies.map((p) => (
              <option key={p.policyId} value={p.policyId}>
                {p.subjectLabel ?? p.subjectId.slice(0, 12)} · {p.subjectType} · {p.access}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} disabled={view.kind === "loading"}>
          Load policies
        </button>
      </div>
      <ResultLine view={view} ok={(list) => (list.length ? `${list.length} policy(ies) loaded.` : "No policy stored for this record yet.")} />
    </div>
  );
}

function useDecrypt() {
  const session = useTideSession();
  return async (recordId: string, policy: SignedPolicy | null): Promise<OperationResult<{ recordId: string; plaintext: string }>> => {
    const rec = await apiJson<EncryptedRecord>(session, "read-record", `/api/records/${encodeURIComponent(recordId)}`);
    if (rec.outcome !== "allowed") return rec;
    if (!policy) return { outcome: "error", operation: "decrypt", code: "INVALID_INPUT", cause: "Pick a policy first." };
    return session.decrypt({ record: rec.value, policy });
  };
}

function useEncryptAndStore() {
  const session = useTideSession();
  return async (recordId: string, plaintext: string, policy: SignedPolicy | null): Promise<OperationResult<EncryptedRecord>> => {
    if (!policy) return { outcome: "error", operation: "encrypt", code: "INVALID_INPUT", cause: "Pick a policy first." };
    if (!plaintext.trim()) return { outcome: "error", operation: "encrypt", code: "INVALID_INPUT", cause: "Nothing to encrypt." };
    const enc = await session.encrypt({ assignmentId: recordId, plaintext, policy });
    if (enc.outcome !== "allowed") return enc;
    // Only the ciphertext envelope leaves the browser.
    return apiJson<EncryptedRecord>(session, "write-record", `/api/records/${encodeURIComponent(recordId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enc.value),
    });
  };
}

function GrantStep() {
  const session = useTideSession();
  const [recordId, setRecordId] = useState<string>(REC.A);
  const [subjectType, setSubjectType] = useState<PolicySubjectType>("User");
  const [subjectId, setSubjectId] = useState("");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [access, setAccess] = useState<PolicyAccess>("read");
  const [view, setView] = useState<View<SignedPolicy>>(IDLE);

  async function grant() {
    setView({ kind: "loading" });
    const signed = await session.signPolicy({ recordId, subjectType, subjectId: subjectId.trim(), subjectLabel: subjectLabel.trim() || undefined, access });
    if (signed.outcome !== "allowed") return setView({ kind: "done", result: signed });
    const stored = await apiJson<SignedPolicy>(session, "store-policy", "/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signed.value),
    });
    setView({ kind: "done", result: stored });
  }

  return (
    <Step n="1" who="Lan (admin)" title="Grant a record to a subject">
      <p className="muted">Signs a RelationshipAttestation policy in the Tide enclave, then stores the signed bytes. Plan: A→Lan rw, B→Lan rw, A→AI-reader read, S→Lan write, S→Minh read. No B→AI-reader, no S→Y.</p>
      <div className="grid">
        <label>Record <select value={recordId} onChange={(e) => setRecordId(e.target.value)}>{RECORDS.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Subject type <select value={subjectType} onChange={(e) => setSubjectType(e.target.value as PolicySubjectType)}><option>User</option><option>Group</option><option>Role</option></select></label>
        <label>Subject id <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="from the Tide helper" /></label>
        <label>Label <input value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} placeholder="e.g. Minh" /></label>
        <label>Access <select value={access} onChange={(e) => setAccess(e.target.value as PolicyAccess)}><option>read</option><option>write</option><option>read-write</option></select></label>
      </div>
      <button type="button" onClick={() => void grant()} disabled={view.kind === "loading" || !subjectId.trim()}>Sign in enclave &amp; store</button>
      <ResultLine view={view} ok={(p) => `Stored policy ${p.policyId} (${p.recordId} → ${p.subjectLabel ?? p.subjectType}, ${p.access}).`} />
    </Step>
  );
}

function SeedStep() {
  const encryptAndStore = useEncryptAndStore();
  const [recordId, setRecordId] = useState<string>(REC.A);
  const [text, setText] = useState("");
  const [policy, setPolicy] = useState<SignedPolicy | null>(null);
  const [view, setView] = useState<View<EncryptedRecord>>(IDLE);

  return (
    <Step n="2" who="Lan" title="Encrypt synthetic sources A and B">
      <div className="row">
        <label>Record <select value={recordId} onChange={(e) => { setRecordId(e.target.value); setPolicy(null); }}><option>{REC.A}</option><option>{REC.B}</option></select></label>
      </div>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the synthetic source text (stays in this browser until encrypted)" />
      <PolicyPicker key={recordId} recordId={recordId} value={policy} onChange={setPolicy} />
      <button type="button" onClick={async () => { setView({ kind: "loading" }); setView({ kind: "done", result: await encryptAndStore(recordId, text, policy) }); }} disabled={view.kind === "loading"}>
        Encrypt &amp; store {recordId}
      </button>
      <ResultLine view={view} ok={(r) => `Stored ciphertext for ${r.recordId} (v${r.version}).`} />
    </Step>
  );
}

function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function AiReaderStep() {
  const session = useTideSession();
  const decrypt = useDecrypt();
  const [policyA, setPolicyA] = useState<SignedPolicy | null>(null);
  const [policyB, setPolicyB] = useState<SignedPolicy | null>(null);
  const [openA, setOpenA] = useState<View<{ recordId: string; plaintext: string }>>(IDLE);
  const [openB, setOpenB] = useState<View<{ recordId: string; plaintext: string }>>(IDLE);
  const [draft, setDraft] = useState<View<DraftBrief>>(IDLE);
  const textA = openA.kind === "done" && openA.result.outcome === "allowed" ? openA.result.value.plaintext : null;

  async function summarize() {
    if (!textA) return;
    setDraft({ kind: "loading" });
    const result = await apiJson<DraftBrief>(session, "summarize", "/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // InferencePort contract (plan base §5, Tuấn's input.ts) names the source "A"; the Tide tag stays REC.A.
      body: JSON.stringify({ sourceRecordId: "A", text: textA, runId: crypto.randomUUID() }),
    });
    setDraft({ kind: "done", result });
  }

  return (
    <Step n="3" who="AI-reader" title="Open A, draft with AI — and try B">
      <PolicyPicker recordId={REC.A} value={policyA} onChange={setPolicyA} />
      <button type="button" onClick={async () => { setOpenA({ kind: "loading" }); setDraft(IDLE); setOpenA({ kind: "done", result: await decrypt(REC.A, policyA) }); }}>Decrypt A</button>
      <ResultLine view={openA} ok={(v) => <details><summary>Decrypted {v.recordId} ({v.plaintext.length} chars, this browser only)</summary><pre>{v.plaintext}</pre></details>} />
      <div className="row">
        <button type="button" onClick={() => void summarize()} disabled={!textA || draft.kind === "loading"}>Summarize A with AI</button>
      </div>
      <ResultLine
        view={draft}
        ok={(d) => (
          <div>
            <p>Draft from <code>{d.provider}/{d.model}</code>, run <code>{d.runId}</code>.</p>
            <pre>{d.text}</pre>
            <button type="button" onClick={() => downloadJson(`draft-${d.runId}.json`, d)}>Download draft JSON for Lan</button>
          </div>
        )}
      />
      <hr />
      <p className="muted">Negative test: the AI-reader has no policy for B. Pick Lan&apos;s B policy and try; Tide should refuse.</p>
      <PolicyPicker recordId={REC.B} value={policyB} onChange={setPolicyB} />
      <button type="button" onClick={async () => { setOpenB({ kind: "loading" }); setOpenB({ kind: "done", result: await decrypt(REC.B, policyB) }); }}>Try to decrypt B</button>
      <ResultLine view={openB} ok={(v) => `Unexpected: ${v.recordId} decrypted (${v.plaintext.length} chars). Check the policy and identity.`} />
    </Step>
  );
}

function isDraft(v: unknown): v is DraftBrief {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Record<string, unknown>;
  return ["sourceRecordId", "text", "model", "provider", "runId", "createdAt"].every((k) => typeof d[k] === "string");
}

function PublishStep() {
  const encryptAndStore = useEncryptAndStore();
  const [draft, setDraft] = useState<DraftBrief | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [policy, setPolicy] = useState<SignedPolicy | null>(null);
  const [view, setView] = useState<View<EncryptedRecord>>(IDLE);

  async function importFile(file: File | undefined) {
    setImportError(null);
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isDraft(parsed)) throw new Error("Not a draft JSON exported by step 3.");
      setDraft(parsed);
      setText(parsed.text);
    } catch (e) {
      setDraft(null);
      setImportError(e instanceof Error ? e.message : "Could not read file");
    }
  }

  return (
    <Step n="4" who="Lan" title="Review the draft and publish brief S">
      <label>Import draft JSON <input type="file" accept="application/json,.json" onChange={(e) => void importFile(e.target.files?.[0])} /></label>
      {importError && <p className="err" role="alert">{importError}</p>}
      {draft && <p className="muted">Draft run <code>{draft.runId}</code> from <code>{draft.sourceRecordId}</code> ({draft.provider}/{draft.model}). Edit before publishing.</p>}
      <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reviewed brief S (plaintext stays in this browser; only ciphertext is stored)" disabled={!draft} />
      <PolicyPicker recordId={REC.S} value={policy} onChange={setPolicy} />
      <button type="button" onClick={async () => { setView({ kind: "loading" }); setView({ kind: "done", result: await encryptAndStore(REC.S, text, policy) }); }} disabled={!draft || view.kind === "loading"}>
        Encrypt &amp; publish S
      </button>
      <ResultLine view={view} ok={(r) => `Published ${r.recordId} as ciphertext (v${r.version}).`} />
    </Step>
  );
}

function OpenBriefStep() {
  const decrypt = useDecrypt();
  const [policy, setPolicy] = useState<SignedPolicy | null>(null);
  const [view, setView] = useState<View<{ recordId: string; plaintext: string }>>(IDLE);
  return (
    <Step n="5" who="Minh / Y" title="Open brief S">
      <p className="muted">Minh uses his own policy. Y loads the same ciphertext with Minh&apos;s policy; Tide should refuse because Y is not its subject.</p>
      <PolicyPicker recordId={REC.S} value={policy} onChange={setPolicy} />
      <button type="button" onClick={async () => { setView({ kind: "loading" }); setView({ kind: "done", result: await decrypt(REC.S, policy) }); }}>Open S</button>
      <ResultLine view={view} ok={(v) => <pre>{v.plaintext}</pre>} />
    </Step>
  );
}

function Step({ n, who, title, children }: { n: string; who: string; title: string; children: ReactNode }) {
  return (
    <article className="step-card">
      <h3>
        <span className="step">{n}</span> {title} <span className="muted small">· {who}</span>
      </h3>
      {children}
    </article>
  );
}

export function Workflow() {
  const session = useTideSession();
  const [identity, setIdentity] = useState<SessionIdentity | null>(null);
  useEffect(() => {
    void session.getSession().then(setIdentity);
  }, [session]);

  return (
    <section aria-labelledby="wf-h">
      <h2 id="wf-h">Run the workflow</h2>
      <SessionBadge session={identity} />
      <p className="muted small">One app for every role: open it in a separate browser profile per Tide account. Results below are whatever Tide and the server actually return.</p>
      <GrantStep />
      <SeedStep />
      <AiReaderStep />
      <PublishStep />
      <OpenBriefStep />
    </section>
  );
}
