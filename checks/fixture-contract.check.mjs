// Fixture contract check (owner: Triết). No server needed:
//   node checks/fixture-contract.check.mjs
//   SRC_DIR=../other-checkout/src node checks/fixture-contract.check.mjs   (scan another build)
// Checks the synthetic A/B/S fixtures are distinct and consistent, and that no production
// source under src/ imports them or embeds their markers. Exit code 1 on any FAIL.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = { PASS: 0, FAIL: 0, NOT_RUN: 0 };

function record(status, name, detail = "") {
  results[status] += 1;
  console.log(`${status} ${name}${detail ? `: ${detail}` : ""}`);
}
async function check(name, fn) {
  try {
    const skip = await fn();
    if (typeof skip === "string") record("NOT_RUN", name, skip);
    else record("PASS", name);
  } catch (e) {
    record("FAIL", name, e instanceof Error ? e.message : String(e));
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}
function load(name) {
  return JSON.parse(readFileSync(join(ROOT, "fixtures", name), "utf-8"));
}

let A, B, S;
try {
  A = load("A.synthetic.json");
  B = load("B.synthetic.json");
  S = load("S.expected.synthetic.json");
} catch (e) {
  console.log(`FAIL load fixtures: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
  process.exit();
}

await check("A and B are distinct synthetic datasets with their own markers", () => {
  for (const [n, f] of [["A", A], ["B", B]]) {
    expect(f.synthetic === true, `${n}.synthetic must be true`);
    expect(f.kind === "source-plaintext", `${n}.kind must be source-plaintext`);
    expect(typeof f.text === "string" && f.text.includes(f.marker), `${n}.text must contain its marker`);
    expect(f.text.startsWith("SYNTHETIC"), `${n}.text must be labelled SYNTHETIC`);
  }
  expect(A.recordId === "rec-A" && B.recordId === "rec-B", "recordIds must be rec-A / rec-B");
  expect(A.marker !== B.marker, "markers must differ");
  expect(!A.text.includes(B.marker) && !B.text.includes(A.marker), "A and B must not contain each other's marker");
  expect(A.facts.students === 24 && A.facts.completed === 18 && A.facts.completionRatePct === 75, "A facts must be 24/18/75");
  expect(Math.round((A.facts.completed / A.facts.students) * 100) === A.facts.completionRatePct, "A rate inconsistent");
  expect(B.facts.devices === 9 && B.facts.needMaintenance === 4, "B facts must be 9/4");
  expect(A.grantedTo.includes("ai-reader") && !B.grantedTo.includes("ai-reader"), "AI-reader must be granted A only");
});

await check("S is expected plaintext derived from A, not ciphertext or model output", () => {
  expect(S.synthetic === true && S.kind === "expected-plaintext", "S must be synthetic expected-plaintext");
  expect(S.recordId === "rec-S" && S.sourceRecordId === "rec-A", "S must be rec-S sourced from rec-A");
  expect(S.grantedTo.includes("minh") && S.deniedTo.includes("y"), "S must grant Minh and deny Y");
  expect(/NOT model output/.test(S.note) && /NOT ciphertext/.test(S.note), "S.note must say it is not model output / ciphertext");
});

await check("S has A claims but no B marker", () => {
  for (const claim of S.requiredClaims) expect(S.text.includes(claim), `S.text missing claim ${claim}`);
  for (const claim of ["24", "18", "75%"]) expect(S.requiredClaims.includes(claim), `requiredClaims missing ${claim}`);
  const forbidden = new Set([...S.forbiddenMarkers, B.marker]);
  for (const m of forbidden) expect(!S.text.toLowerCase().includes(m.toLowerCase()), `S.text contains forbidden ${m}`);
});

await check("production sources do not import fixtures or embed their markers", () => {
  // SRC_DIR lets the same check scan another checkout (e.g. the integration branch).
  const src = process.env.SRC_DIR ?? join(ROOT, "src");
  if (!existsSync(src)) return "src/ not found (run from the repo root that has package.json + src/)";
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(m?[jt]sx?|json)$/.test(name)) files.push(p);
    }
  })(src);
  expect(files.length > 0, "no source files found under src/");
  const hits = [];
  for (const p of files) {
    const body = readFileSync(p, "utf-8");
    if (/fixtures\//.test(body) || /\.synthetic\.json/.test(body)) hits.push(`${p} imports fixtures`);
    for (const m of [A.marker, B.marker]) if (body.includes(m)) hits.push(`${p} contains ${m}`);
  }
  expect(hits.length === 0, hits.map((h) => h.replace(ROOT, ".")).join("; "));
});

console.log(`fixture-contract: ${results.PASS} passed, ${results.FAIL} failed, ${results.NOT_RUN} NOT_RUN`);
process.exitCode = results.FAIL > 0 ? 1 : 0;
