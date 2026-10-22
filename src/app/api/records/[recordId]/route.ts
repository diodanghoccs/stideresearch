// Encrypted record API (owner: Triệu). Stores and returns ciphertext envelopes only.
// GET needs "read-record", PUT needs "write-record"; both fail closed until Tide is wired.
import { getStorage } from "@/storage";
import { apiError, apiOk, fromResult, guard, isRecordId } from "../../_lib/guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ recordId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const g = await guard(request, "read-record");
  if (!g.ok) return g.response;
  const { recordId } = await params;
  if (!isRecordId(recordId)) return apiError(400, { code: "INVALID_INPUT", message: "Invalid record id." });

  const result = await getStorage().get(recordId);
  return result.outcome === "allowed" ? apiOk(result.value) : fromResult(result);
}

export async function PUT(request: Request, { params }: Ctx) {
  const g = await guard(request, "write-record");
  if (!g.ok) return g.response;
  const { recordId } = await params;
  if (!isRecordId(recordId)) return apiError(400, { code: "INVALID_INPUT", message: "Invalid record id." });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, { code: "INVALID_INPUT", message: "Body must be JSON." });
  }
  if (typeof body !== "object" || body === null || (body as { recordId?: unknown }).recordId !== recordId) {
    return apiError(400, { code: "INVALID_INPUT", message: "Body recordId must match the URL." });
  }
  // The store rejects anything but the envelope fields (no plaintext, no extra keys).
  const result = await getStorage().put(body);
  return result.outcome === "allowed" ? apiOk(result.value, 201) : fromResult(result);
}
