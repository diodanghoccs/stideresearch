// Integration gate (owner: Triết). Needs a running server:
//   BASE_URL=http://localhost:3210 node checks/integration-gate.check.mjs
// Calls every protected API WITHOUT a valid Tide identity and checks it fails closed and leaks
// nothing. Unlike base-smoke.mjs it does not expect Tide/AI to be "not ready": it works on the
// base AND on the integrated app.
//
// Reading the result:
//   401 = verifier active and rejected the caller (meaningful auth evidence)
//   503 = module not ready (fail-closed only; NOT evidence of authorization or ORK deny)
//   404 = route absent (NOT_RUN, never counted as an authorization pass)
// None of this is an ORK decrypt decision; A/B and Minh/Y need real Tide sessions (see test-matrix).
const BASE = (process.env.BASE_URL ?? "http://localhost:3210").replace(/\/$/, "");
const MARKERS = ["A_ONLY_LANTERN_24", "B_ONLY_COBALT_9"];
const results = { PASS: 0, FAIL: 0, NOT_RUN: 0 };
const codes = [];

function record(status, name, detail = "") {
  results[status] += 1;
  console.log(`${status} ${name}${detail ? ` — ${detail}` : ""}`);
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

// A syntactically valid but unsigned JWT (alg "none"); a real verifier must reject it.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const FORGED = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "forged", azp: "stideresearch-client", realm_access: { roles: ["_tide_decryptor", "_tide_encryptor"] }, resource_access: { "realm-management": { roles: ["tide-realm-admin"] } }, exp: 4102444800 })}.`;

const SUMMARY_BODY = JSON.stringify({ sourceRecordId: "A", text: "SYNTHETIC gate probe text A_ONLY_LANTERN_24", runId: "gate-1" });
const ENVELOPE = JSON.stringify({ recordId: "rec-gate", assignmentId: "rec-gate", ciphertext: "placeholder-not-ciphertext", policyRef: "placeholder", version: 1, createdAt: new Date().toISOString() });

let tideState = "unknown";
try {
  const res = await fetch(`${BASE}/api/health`);
  expect(res.status === 200, `status ${res.status}`);
  const body = await res.json();
  expect(body.status === "live", "status != live");
  const text = JSON.stringify(body);
  expect(!/password|secret|api[_-]?key"\s*:|bearer|eyJ[A-Za-z0-9_-]{10,}/i.test(text), "health body looks like it leaks a secret/token");
  tideState = body.modules?.tide?.state ?? "unknown";
  const m = body.modules ?? {};
  record("PASS", "GET /api/health live, no secret in body",
    `tide=${m.tide?.state} (${m.tide?.implementation}), inference=${m.inference?.state} (${m.inference?.implementation}), storage=${m.storage?.state} persistent=${m.storage?.persistent}`);
} catch (e) {
  record("FAIL", "GET /api/health", e instanceof Error ? e.message : String(e));
  console.log(`integration-gate: cannot reach ${BASE}; is the server running?`);
  tideState = "unreachable";
}
// With Tide ready the verifier must answer 401; otherwise 503 fail-closed is the only acceptable answer.
const DENY = tideState === "ready" ? [401] : [503];

const CASES = [
  { name: "POST /api/summarize, no identity", method: "POST", path: "/api/summarize", body: SUMMARY_BODY },
  { name: "POST /api/summarize, made-up bearer", method: "POST", path: "/api/summarize", body: SUMMARY_BODY, auth: "Bearer not-a-real-token" },
  { name: "POST /api/summarize, forged unsigned JWT with all roles", method: "POST", path: "/api/summarize", body: SUMMARY_BODY, auth: `DPoP ${FORGED}`, dpop: FORGED },
  { name: "GET /api/records/rec-A, no identity (P02)", method: "GET", path: "/api/records/rec-A" },
  { name: "GET /api/records/rec-B, forged JWT (P02)", method: "GET", path: "/api/records/rec-B", auth: `Bearer ${FORGED}` },
  { name: "PUT /api/records/rec-gate, no identity (P01)", method: "PUT", path: "/api/records/rec-gate", body: ENVELOPE },
  { name: "PUT /api/records/rec-gate, forged JWT with _tide_encryptor (P01)", method: "PUT", path: "/api/records/rec-gate", body: ENVELOPE, auth: `Bearer ${FORGED}` },
  { name: "GET /api/policies?recordId=rec-S, no identity", method: "GET", path: "/api/policies?recordId=rec-S" },
  { name: "POST /api/policies, forged JWT with tide-realm-admin", method: "POST", path: "/api/policies", body: JSON.stringify({ recordId: "rec-S" }), auth: `Bearer ${FORGED}` },
];

// Do not process.exit() with sockets open: it crashes Node on Windows (see docs/BASE_HANDOFF.md).
for (const c of tideState === "unreachable" ? [] : CASES) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (c.auth) headers.Authorization = c.auth;
    if (c.dpop) headers.DPoP = c.dpop;
    const res = await fetch(`${BASE}${c.path}`, { method: c.method, headers, body: c.body });
    const text = await res.text();
    codes.push(res.status);
    if (res.status === 404 || res.status === 405) {
      record("NOT_RUN", c.name, `${res.status}: route absent in this build (not an authorization result)`);
      continue;
    }
    expect(res.status < 200 || res.status >= 300, `returned ${res.status} (success) without a valid identity`);
    for (const m of MARKERS) expect(!text.includes(m), `response echoes fixture marker ${m}`);
    expect(!/"(text|plaintext|ciphertext|model)"\s*:/.test(text), "response body carries data fields");
    expect(DENY.includes(res.status), `status ${res.status}, expected ${DENY.join("/")} with tide=${tideState}`);
    record("PASS", c.name, `${res.status}${res.status === 503 ? " fail-closed only (module not ready)" : " rejected by verifier"}`);
  } catch (e) {
    record("FAIL", c.name, e instanceof Error ? e.message : String(e));
  }
}

const n401 = codes.filter((s) => s === 401).length;
console.log(`auth evidence: ${n401}/${codes.length} protected calls answered 401 by the verifier; tide=${tideState}`);
console.log(`integration-gate: ${results.PASS} passed, ${results.FAIL} failed, ${results.NOT_RUN} NOT_RUN`);
process.exitCode = results.FAIL > 0 ? 1 : 0;
