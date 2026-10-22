import type { SummarizeInput } from "../contracts/index.ts";

export const MAX_SOURCE_CHARS = 20_000;
export const MAX_BODY_BYTES = 64 * 1024;
const INPUT_FIELDS = new Set(["sourceRecordId", "text", "runId"]);

// The C2 demo grants only A to the AI-reader. This check prevents accidental B
// input; the Tide decrypt flow must still establish the provenance of the text.
export function parseSummarizeInput(raw: unknown): SummarizeInput | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (Object.keys(record).some((field) => !INPUT_FIELDS.has(field))) return null;
  const { sourceRecordId, text, runId } = record;
  if (sourceRecordId !== "A") return null;
  if (typeof text !== "string" || !text.trim() || text.length > MAX_SOURCE_CHARS) return null;
  if (typeof runId !== "string" || !runId.trim() || runId.length > 128) return null;
  return { sourceRecordId, text, runId };
}
