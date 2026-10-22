// Local transport doubles only: these tests never contact a provider.
import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAiInference } from "./index.ts";

const env = { INFERENCE_PROVIDER: "openai", INFERENCE_MODEL: "test-model", INFERENCE_API_KEY: "test-key" };
const input = { sourceRecordId: "A", text: "Tài liệu tổng hợp A: ba mẫu nước, hai mẫu đạt chuẩn.", runId: "unit-adapter" };
const completed = () => ({
  status: "completed", model: "test-model-snapshot",
  output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Ý chính: hai mẫu đạt chuẩn. Điểm chưa chắc: mẫu thứ ba. Nguồn: A." }] }],
});

test("missing configuration returns not-ready without contacting the provider", async () => {
  const adapter = createOpenAiInference({ env: {}, fetch: () => assert.fail("provider must not run") });
  assert.equal(adapter.readiness().state, "not-configured");
  assert.equal((await adapter.summarize(input)).outcome, "not-ready");
});

test("unsupported provider reports error without exposing its value", async () => {
  const adapter = createOpenAiInference({ env: { ...env, INFERENCE_PROVIDER: "private-value" }, fetch: () => assert.fail("provider must not run") });
  assert.equal(adapter.readiness().state, "error");
  assert.equal((await adapter.summarize(input)).outcome, "not-ready");
  assert.ok(!JSON.stringify(adapter.readiness()).includes("private-value"));
});

test("request is one stateless, tool-free call and preserves actual model and run metadata", async () => {
  let calls = 0;
  const adapter = createOpenAiInference({ env, fetch: async (url, options) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, "test-model");
    assert.equal(body.input, input.text);
    assert.equal(body.store, false);
    assert.deepEqual(body.tools, []);
    assert.ok(body.instructions.includes("Nguồn: A"));
    assert.equal(body.metadata, undefined);
    assert.equal(body.previous_response_id, undefined);
    return Response.json(completed());
  } });
  const result = await adapter.summarize(input);
  assert.equal(result.outcome, "allowed");
  assert.deepEqual(Object.keys(result.value).sort(), ["sourceRecordId", "text", "model", "provider", "runId", "createdAt"].sort());
  assert.equal(result.value.sourceRecordId, "A");
  assert.equal(result.value.runId, input.runId);
  assert.equal(result.value.model, "test-model-snapshot");
  assert.equal(result.value.provider, "openai");
  assert.ok(!Number.isNaN(Date.parse(result.value.createdAt)));
  assert.equal(calls, 1);
});

for (const [name, raw] of [
  ["null", null], ["array", []], ["record B", { ...input, sourceRecordId: "B" }],
  ["empty source", { ...input, text: "  " }], ["oversized source", { ...input, text: "a".repeat(20_001) }],
  ["empty run", { ...input, runId: " " }], ["oversized run", { ...input, runId: "a".repeat(129) }],
  ["extra credential", { ...input, token: "not-accepted" }],
]) {
  test(`rejects ${name} before the provider`, async () => {
    const adapter = createOpenAiInference({ env, fetch: () => assert.fail("provider must not run") });
    const result = await adapter.summarize(raw);
    assert.equal(result.outcome, "error");
    assert.equal(result.code, "INVALID_INPUT");
  });
}

for (const status of [401, 429, 500]) {
  test(`provider HTTP ${status} is sanitized and never retried`, async () => {
    let calls = 0;
    const adapter = createOpenAiInference({ env, fetch: async () => { calls++; return new Response("secret diagnostic", { status }); } });
    const result = await adapter.summarize(input);
    assert.equal(result.code, "UPSTREAM_ERROR");
    assert.equal(result.cause, `Provider returned HTTP ${status}.`);
    assert.ok(!JSON.stringify(result).includes("secret"));
    assert.equal(calls, 1);
  });
}

for (const [name, body] of [
  ["incomplete response", { ...completed(), status: "incomplete" }],
  ["empty output", { ...completed(), output: [] }],
  ["missing model metadata", { ...completed(), model: "" }],
  ["refusal", { ...completed(), output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "private diagnostic" }] }] }],
]) {
  test(`${name} is an upstream error, never a draft`, async () => {
    const adapter = createOpenAiInference({ env, fetch: async () => Response.json(body) });
    const result = await adapter.summarize(input);
    assert.equal(result.outcome, "error");
    assert.equal(result.code, "UPSTREAM_ERROR");
    assert.ok(!("value" in result));
  });
}

test("invalid provider JSON and transport exceptions do not expose diagnostics", async () => {
  for (const transport of [async () => new Response("private malformed JSON"), async () => { throw new Error("private diagnostic"); }]) {
    const adapter = createOpenAiInference({ env, fetch: transport });
    const result = await adapter.summarize(input);
    assert.equal(result.code, "UPSTREAM_ERROR");
    assert.ok(!JSON.stringify(result).includes("private"));
  }
});

test("provider timeout aborts the call and returns an explicit error", async () => {
  let aborted = false;
  const adapter = createOpenAiInference({ env, timeoutMs: 20, fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
    // Keep the test alive until the unref'd AbortSignal timer fires.
    const keepAlive = setTimeout(() => reject(new Error("timeout did not abort")), 1000);
    signal.addEventListener("abort", () => { clearTimeout(keepAlive); aborted = true; reject(signal.reason); }, { once: true });
  }) });
  const result = await adapter.summarize(input);
  assert.equal(aborted, true);
  assert.equal(result.code, "UPSTREAM_ERROR");
  assert.equal(result.cause, "Provider request timed out.");
});
