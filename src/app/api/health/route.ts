// Liveness (always 200 while the process serves) + per-module readiness. Never returns env values.
import type { HealthResponse } from "@/contracts";
import { getInference } from "@/inference";
import { getStorage } from "@/storage";
import { getTideVerifier } from "@/tide/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const body: HealthResponse = {
    status: "live",
    checkedAt: new Date().toISOString(),
    modules: {
      tide: getTideVerifier().readiness(),
      inference: getInference().readiness(),
      storage: getStorage().readiness(),
    },
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
