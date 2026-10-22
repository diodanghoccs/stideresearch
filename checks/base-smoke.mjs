// HTTP smoke check against a running server (owner after base: Triết).
//   BASE_URL=http://localhost:3000 node checks/base-smoke.mjs
// Verifies the base fails closed while Tide/AI are not connected. Exit code 1 on any failure.
const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${name}: ${e instanceof Error ? e.message : e}`);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

await check("GET / renders STideResearch", async () => {
  const res = await fetch(`${BASE}/`);
  expect(res.status === 200, `status ${res.status}`);
  expect((await res.text()).includes("STideResearch"), "page title missing");
});

await check("GET /api/health is live, Tide/AI readiness not faked", async () => {
  const res = await fetch(`${BASE}/api/health`);
  expect(res.status === 200, `status ${res.status}`);
  const body = await res.json();
  expect(body.status === "live", "status != live");
  expect(body.modules.tide.state !== "ready", `tide.state=${body.modules.tide.state}`);
  expect(body.modules.inference.state !== "ready", `inference.state=${body.modules.inference.state}`);
  expect(body.modules.storage.persistent === false, "storage must report persistent=false");
});

await check("POST /api/summarize fails closed with 503 INTEGRATION_NOT_READY", async () => {
  const res = await fetch(`${BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceRecordId: "A", text: "synthetic text", runId: "smoke-1" }),
  });
  expect(res.status === 503, `status ${res.status}`);
  const body = await res.json();
  expect(body.code === "INTEGRATION_NOT_READY", `code=${body.code}`);
  expect(!("text" in body) && !("model" in body), "response looks like a draft");
});

await check("POST /api/summarize with a made-up bearer token is not a bypass", async () => {
  const res = await fetch(`${BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer not-a-real-token" },
    body: JSON.stringify({ sourceRecordId: "A", text: "synthetic text", runId: "smoke-2" }),
  });
  expect(res.status === 503, `status ${res.status}`);
});

await check("GET /api/summarize is 405", async () => {
  const res = await fetch(`${BASE}/api/summarize`);
  expect(res.status === 405, `status ${res.status}`);
});

await check("no public record write route", async () => {
  for (const path of ["/api/records", "/api/storage", "/api/record"]) {
    const res = await fetch(`${BASE}${path}`, { method: "POST", body: "{}" });
    expect(res.status === 404, `${path} -> ${res.status}`);
  }
});

console.log(failed ? `base-smoke: ${failed} FAILED` : "base-smoke: all checks passed");
// exitCode instead of process.exit(): exiting with open fetch sockets crashes Node on Windows (libuv assert).
process.exitCode = failed ? 1 : 0;
