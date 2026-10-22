// Local tests only. Never calls a model and never alters the deployed verifier.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const paths = ["adapter.test.mjs", "http.test.mjs"].map((name) => fileURLToPath(new URL(name, import.meta.url)));
const result = spawnSync(process.execPath, ["--no-warnings", "--test", "--test-reporter=tap", ...paths], { encoding: "utf8" });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.error) console.error("Could not start local inference checks.");
const artifact = {
  check: "TUAN-local-adapter-and-handler", execution: "simulated-ports",
  realProviderCalled: false, realTideAuthenticationVerified: false,
  status: result.status === 0 ? "PASS" : "FAIL", recordedAt: new Date().toISOString(),
  tests: Number(result.stdout?.match(/^# tests (\d+)$/m)?.[1] ?? 0),
  passed: Number(result.stdout?.match(/^# pass (\d+)$/m)?.[1] ?? 0),
  failed: Number(result.stdout?.match(/^# fail (\d+)$/m)?.[1] ?? 0),
};
mkdirSync(new URL("./evidence/", import.meta.url), { recursive: true });
writeFileSync(new URL("./evidence/local-checks.json", import.meta.url), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
process.exitCode = result.status === 0 ? 0 : 1;
