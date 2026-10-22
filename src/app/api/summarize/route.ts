// Owner: Tuấn. Tide authentication/authorization implementation belongs to Trí.
// Fixed order: Tide ready -> verify -> authorize -> inference ready -> body -> provider.
import { getInference } from "@/inference";
import { createSummarizeHandler } from "@/inference/http";
import { getTideVerifier } from "@/tide/server";

export const dynamic = "force-dynamic";
export const POST = createSummarizeHandler({ getVerifier: getTideVerifier, getInference });
