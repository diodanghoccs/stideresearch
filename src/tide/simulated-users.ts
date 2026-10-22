// Plan C (official UNLOCKED fallback when Tide's network is overloaded): simulated identities.
// Active ONLY when NEXT_PUBLIC_TIDE_MODE=simulated. Everything produced in this mode is labelled
// SIMULATED in the UI and API; nothing here is a Tide token, a Tide key or an ORK decision.
export const SIMULATED_MODE = process.env.NEXT_PUBLIC_TIDE_MODE === "simulated";

export type SimAlias = "lan" | "ai-reader" | "minh" | "y";

export const SIM_USERS: Record<SimAlias, { name: string; roles: string[] }> = {
  lan: { name: "Lan", roles: ["_tide_encryptor", "_tide_decryptor", "tide-realm-admin"] },
  "ai-reader": { name: "AI-reader", roles: ["_tide_decryptor"] },
  minh: { name: "Minh", roles: ["_tide_decryptor"] },
  y: { name: "Y", roles: ["_tide_decryptor"] },
};

export const simUserKey = (alias: SimAlias) => `sim-userkey-${alias}`;

export function isSimAlias(value: string | null | undefined): value is SimAlias {
  return !!value && Object.prototype.hasOwnProperty.call(SIM_USERS, value);
}
