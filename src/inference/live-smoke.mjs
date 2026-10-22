// Sends only this built-in synthetic A. No storage input, Tide token, or real data.
// Run: node --env-file-if-exists=.env.local src/inference/live-smoke.mjs
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getInference } from "./index.ts";

const text = [
  "TÀI LIỆU A — HOÀN TOÀN TỔNG HỢP CHO DEMO C2.",
  "Trong thử nghiệm giả định, nhóm khảo sát ba mẫu nước tại địa điểm X vào ngày 01/10/2026.",
  "Hai mẫu đạt ngưỡng chất lượng nội bộ; mẫu thứ ba chưa có kết quả phân tích.",
  "Chưa có đối chứng và chưa xác minh khả năng đại diện của ba mẫu.",
  "Khuyến nghị của nhóm: hoàn tất phân tích mẫu thứ ba trước khi kết luận.",
].join("\n");
const runId = `c2-tuan-${randomUUID()}`;
const artifactUrl = new URL("./evidence/live-smoke.json", import.meta.url);
const inference = getInference();
const result = await inference.summarize({ sourceRecordId: "A", text, runId });
const status = result.outcome === "allowed" ? "PASS" : result.outcome === "not-ready" ? "NOT_RUN" : "FAIL";
const artifact = {
  check: "TUAN-01", execution: "live-provider", status, recordedAt: new Date().toISOString(),
  fixture: { id: "synthetic-water-study-A-v1", sourceRecordId: "A", sha256: createHash("sha256").update(text).digest("hex") },
  runId,
  result: result.outcome === "allowed" ? {
    outcome: result.outcome, provider: result.value.provider, model: result.value.model,
    createdAt: result.value.createdAt, outputCharacters: result.value.text.length,
    outputSha256: createHash("sha256").update(result.value.text).digest("hex"),
  } : result,
};
await mkdir(new URL("./evidence/", import.meta.url), { recursive: true });
await writeFile(artifactUrl, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(`${status}: live synthetic A smoke; evidence: ${fileURLToPath(artifactUrl)}`);
if (result.outcome !== "allowed") console.log(result.cause);
process.exitCode = status === "PASS" ? 0 : status === "NOT_RUN" ? 2 : 1;
