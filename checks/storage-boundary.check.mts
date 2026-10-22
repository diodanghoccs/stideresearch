// Storage boundary check (owner after base: Triết). Runs with Node type stripping:
//   node checks/storage-boundary.check.mts
// Uses synthetic envelopes only; the "ciphertext" strings are placeholders, not real encryption.
import assert from "node:assert/strict";
import { InMemoryEncryptedRecordStore } from "../src/storage/memory-store.ts";

const store = new InMemoryEncryptedRecordStore();
const envelope = {
  recordId: "rec-synthetic-1",
  assignmentId: "dataset-A",
  ciphertext: "opaque-placeholder-not-real-ciphertext",
  policyRef: "policy-placeholder",
  version: 1,
  createdAt: "2026-10-22T07:00:00.000Z",
};

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

await check("readiness says in-memory and not persistent", async () => {
  const r = store.readiness();
  assert.equal(r.implementation, "in-memory-dev");
  assert.equal(r.persistent, false);
});

for (const field of ["plaintext", "text", "content", "privateKey"]) {
  await check(`rejects envelope with extra field "${field}"`, async () => {
    const res = await store.put({ ...envelope, [field]: "secret A text" });
    assert.equal(res.outcome, "error");
    assert.equal(res.outcome === "error" && res.code, "INVALID_INPUT");
  });
}

await check("rejects empty ciphertext / bad version / non-object", async () => {
  for (const bad of [{ ...envelope, ciphertext: "" }, { ...envelope, version: 0 }, null, "x", []]) {
    const res = await store.put(bad);
    assert.equal(res.outcome, "error");
  }
});

await check("stores and returns only envelope fields", async () => {
  const put = await store.put(envelope);
  assert.equal(put.outcome, "allowed");
  const got = await store.get(envelope.recordId);
  assert.equal(got.outcome, "allowed");
  assert.deepEqual(got.outcome === "allowed" && Object.keys(got.value).sort(), Object.keys(envelope).sort());
});

await check("missing record is NOT_FOUND, not denied", async () => {
  const res = await store.get("does-not-exist");
  assert.equal(res.outcome, "error");
  assert.equal(res.outcome === "error" && res.code, "NOT_FOUND");
});

console.log(`storage-boundary: ${passed} checks passed`);
