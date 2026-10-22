// Signed-policy API (owner: Triệu).
// POST: admins only ("store-policy", checked by the Tide verifier on the server); grantedBy is taken
//       from the verified session, never from the body.
// GET ?recordId=: any verified caller with "read-policy" gets the policies of that record.
//   DEMO DECISION (AP-RA07): not filtered to the caller, so Y can load Minh's policy and show the
//   ORK refusing it. A policy grants nothing by itself, but this does disclose who can read which
//   record. Filter by subject before using this beyond the demo.
import { getPolicyStore } from "@/storage";
import { apiError, apiOk, fromResult, guard, isRecordId } from "../_lib/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const g = await guard(request, "read-policy");
  if (!g.ok) return g.response;
  const recordId = new URL(request.url).searchParams.get("recordId");
  if (!isRecordId(recordId)) return apiError(400, { code: "INVALID_INPUT", message: "recordId query parameter required." });

  const result = await getPolicyStore().listForRecord(recordId);
  return result.outcome === "allowed" ? apiOk(result.value) : fromResult(result);
}

export async function POST(request: Request) {
  const g = await guard(request, "store-policy");
  if (!g.ok) return g.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, { code: "INVALID_INPUT", message: "Body must be JSON." });
  }
  if (typeof body === "object" && body !== null && !isRecordId((body as { recordId?: unknown }).recordId)) {
    return apiError(400, { code: "INVALID_INPUT", message: "Invalid record id." });
  }
  const result = await getPolicyStore().put(body, g.session.principalId);
  return result.outcome === "allowed" ? apiOk(result.value, 201) : fromResult(result);
}
