// Inference boundary. Owner after base: Tuấn.
// Base ships only a not-implemented adapter: it never returns a sample summary.
import type { DraftBrief, InferencePort, ModuleReadiness, OperationResult, SummarizeInput } from "@/contracts";

function readiness(): ModuleReadiness {
  // Only checks presence; the value is never returned.
  const configured = Boolean(process.env.INFERENCE_PROVIDER?.trim());
  return configured
    ? {
        module: "inference",
        state: "not-implemented",
        implementation: "not-implemented-inference",
        detail: "INFERENCE_PROVIDER is set but no real adapter exists yet (owner: Tuấn).",
      }
    : {
        module: "inference",
        state: "not-configured",
        implementation: "not-implemented-inference",
        detail: "INFERENCE_PROVIDER is not set and no real adapter exists yet (owner: Tuấn).",
      };
}

export const notImplementedInference: InferencePort = {
  readiness,
  async summarize(_input: SummarizeInput): Promise<OperationResult<DraftBrief>> {
    return {
      outcome: "not-ready",
      operation: "summarize",
      module: "inference",
      code: "INTEGRATION_NOT_READY",
      cause: readiness().detail,
    };
  },
};

export function getInference(): InferencePort {
  return notImplementedInference;
}
