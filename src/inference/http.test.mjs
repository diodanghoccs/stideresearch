// Handler unit tests with simulated ports. They do not verify real Tide auth.
import assert from "node:assert/strict";
import test from "node:test";
import { createSummarizeHandler } from "./http.ts";

const input = { sourceRecordId: "A", text: "Dữ liệu A tổng hợp dùng cho kiểm thử.", runId: "unit-handler" };
const draft = { ...input, model: "unit-model", provider: "unit-only", createdAt: "2026-10-22T08:00:00.000Z" };

function harness(options = {}) {
  const events = [];
  const verifier = {
    readiness() { events.push("tide-ready"); return { module: "tide", state: options.tideState ?? "ready", implementation: "unit-only", detail: "unit test" }; },
    async verify() { events.push("verify"); if (options.verifyThrows) throw new Error("private verifier diagnostic"); return options.session ?? { status: "authenticated", principalId: "unit-only", verifiedBy: "tide" }; },
    async authorize() { events.push("authorize"); return options.authz ?? { outcome: "allowed", value: undefined }; },
  };
  const inference = {
    readiness() { events.push("inference-ready"); return { module: "inference", state: options.inferenceState ?? "ready", implementation: "unit-only", detail: "unit test" }; },
    async summarize(value) { events.push("provider"); assert.deepEqual(value, input); if (options.inferenceThrows) throw new Error("private provider diagnostic"); return options.result ?? { outcome: "allowed", value: draft }; },
  };
  const handler = createSummarizeHandler({
    getVerifier: () => verifier,
    getInference() { events.push("get-inference"); return inference; },
  });
  function request(body = JSON.stringify(input), headers = {}) {
    const real = new Request("http://unit.test/api/summarize", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
    return new Proxy(real, { get(target, property) { if (property === "body") events.push("body"); return Reflect.get(target, property, target); } });
  }
  return { handler, events, request };
}

test("UTF-8 source split across stream chunks is preserved", async () => {
  const { handler } = harness();
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } });
  const request = new Request("http://unit.test/api/summarize", { method: "POST", body, duplex: "half" });
  const response = await handler(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), draft);
});

for (const [name, options, status] of [
  ["unready Tide", { tideState: "not-implemented" }, 503],
  ["unauthenticated caller", { session: { status: "unauthenticated" } }, 401],
  ["unconfigured verifier", { session: { status: "not-configured", reason: "unit test" } }, 503],
  ["forbidden caller", { authz: { outcome: "denied", operation: "summarize", cause: "unit denial" } }, 403],
  ["verifier exception", { verifyThrows: true }, 500],
  ["unready inference", { inferenceState: "not-configured" }, 503],
]) {
  test(`${name} stops before body and provider`, async () => {
    const { handler, request, events } = harness(options);
    const response = await handler(request());
    assert.equal(response.status, status);
    assert.ok(!events.includes("body"));
    assert.ok(!events.includes("provider"));
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.ok(!(await response.text()).includes("private"));
  });
}

test("simulated authorized ports preserve auth-before-body-before-provider order", async () => {
  const { handler, request, events } = harness();
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), draft);
  assert.ok(events.indexOf("verify") < events.indexOf("authorize"));
  assert.ok(events.indexOf("authorize") < events.indexOf("get-inference"));
  assert.ok(events.indexOf("inference-ready") < events.indexOf("body"));
  assert.ok(events.indexOf("body") < events.indexOf("provider"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

for (const [name, body] of [
  ["malformed JSON", "{"], ["array", "[]"],
  ["record B", JSON.stringify({ ...input, sourceRecordId: "B" })],
  ["extra credential", JSON.stringify({ ...input, token: "unit-only" })],
  ["oversized text", JSON.stringify({ ...input, text: "x".repeat(20_001) })],
]) {
  test(`${name} returns 400 before the provider`, async () => {
    const { handler, request, events } = harness();
    const response = await handler(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "INVALID_INPUT");
    assert.ok(!events.includes("provider"));
  });
}

test("oversized body is rejected with or without Content-Length", async () => {
  for (const [body, headers] of [["{}", { "Content-Length": "65537" }], ["x".repeat(65_537), {}]]) {
    const { handler, request, events } = harness();
    const response = await handler(request(body, headers));
    assert.equal(response.status, 413);
    assert.ok(!events.includes("provider"));
  }
});

test("provider error and unexpected exception produce sanitized 502", async () => {
  for (const options of [{ result: { outcome: "error", operation: "summarize", code: "UPSTREAM_ERROR", cause: "Provider returned HTTP 429." } }, { inferenceThrows: true }]) {
    const { handler, request } = harness(options);
    const response = await handler(request());
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.code, "UPSTREAM_ERROR");
    assert.ok(!JSON.stringify(body).includes("private"));
  }
});
