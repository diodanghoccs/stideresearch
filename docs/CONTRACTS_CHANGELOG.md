# Contracts changelog (`src/contracts/index.ts`)

Owner: Triệu. Every change is announced here so Trí / Tuấn / Triết can adapt.

## 2026-10-22 15:15 — policies in the session port (branch `c2/trieu-app`)

Why: Planner B's base review noted `TideSessionPort.encrypt` had no policy parameter; RelationshipAttestation:1 needs a signed policy on every encrypt/decrypt, and the UI needs a way to call protected routes with the session's token + DPoP.

| Change | Who must act |
|---|---|
| New `SignedPolicy`, `PolicyRequest`, `PolicySubjectType`, `PolicyAccess` | Trí: map the Tide helper output (`signRelationshipPolicy`) to `SignedPolicy` (`policyB64` = signed bytes in base64) |
| `TideSessionPort.encrypt({ assignmentId, plaintext, policy })`, `decrypt({ record, policy })` now take a `SignedPolicy` | Trí: implement with `encryptForRecord` / `decryptForRecord`; return `denied` only for a real ORK refusal, with the ORK `cause` |
| New `TideSessionPort.signPolicy(PolicyRequest)` | Trí: admin's browser builds + signs (enclave approval); for `User` subjects use the grantee's user key |
| New `TideSessionPort.authFetch(url, init)` | Trí: attach token + DPoP proof from the SDK; unconfigured returns not-ready and sends nothing |
| `GuardedOperation` adds `read-policy`, `store-policy` | Trí: `authorize()` must allow `store-policy` only to `tide-realm-admin` (Lan); `read-policy`, `read-record` to any verified user; `write-record` to Lan |
| New `PolicyStorePort` (in-memory `InMemoryPolicyStore`) | — (Triệu) |

The unconfigured stub in `src/tide/session.ts` was updated by Triệu only to match the new signatures (still not-ready everywhere). Tuấn: no change to `InferencePort`; the UI now calls `/api/summarize` through `authFetch`, so the verifier must accept the AI-reader's token there.

New routes (Triệu), all behind `guard()` = Tide ready → verify → authorize, fail closed (503 until Tide is wired):

| Route | Operation | Notes |
|---|---|---|
| `GET /api/records/:recordId` | `read-record` | returns the ciphertext envelope only |
| `PUT /api/records/:recordId` | `write-record` | body = envelope, `recordId` must match URL; store rejects any extra field (e.g. plaintext) |
| `GET /api/policies?recordId=` | `read-policy` | **demo decision (AP-RA07):** returns all policies of the record so Y can try Minh's policy; discloses who can read what |
| `POST /api/policies` | `store-policy` | admin only via `authorize`; `grantedBy` taken from the verified session; shape-checked only (signature checked by ORKs on use) |

Triết: `checks/base-smoke.mjs` still passes (it probes `POST /api/records`, which stays 404). New checks for these routes belong in `checks/`.

## 2026-10-22 16:14 — Tide wired against the real realm adapter (branch `c2/trieu-app`)

Done by Triệu's dev after Trí exported `data/tidecloak.json` (realm `stideresearch`, client `stideresearch-client`, origin `http://localhost:3000`). Code follows the official pack template `nextjs-customer-portal` and helper `relationship-attestation/relationship.ts` (copied verbatim to `src/tide/relationship.ts`).

- Contracts: `SessionIdentity.authenticated` adds `roles?`, `tideUserKey?`; `TideSessionPort` adds optional `login()` / `logout()`.
- `src/tide/server.ts`: real verifier — embedded-JWKS JWT check (issuer, azp, iat) + RFC 9449 DPoP proof check (`src/tide/verify-dpop.ts`, verbatim from the pack); roles: `write-record` needs `_tide_encryptor`, `store-policy` needs `tide-realm-admin`, `summarize` needs `_tide_decryptor`; reads/policy reads need any verified user. Missing adapter → not-configured.
- `src/tide/session-bridge.tsx`: real session port on `useTideCloak()` (`secureFetch`, login/logout) + `signRelationshipPolicy` / `encryptForRecord` / `decryptForRecord`. A `THRESHOLD_FAILURE` or contract message is reported as `denied` with the ORK cause.
- `src/app/providers.tsx` + `layout.tsx`: `TideCloakProvider` with `useDPoP: { mode: "strict", alg: "ES256" }`; `public/tide_dpop_auth.html` (byte-exact from `@tidecloak/js`, sha256 9d7844b9… = pack known-good), `public/silent-check-sso.html`, `/auth/redirect` page; `next.config.ts` webpack fixes, CSP and `/tide_dpop` rewrite.
- `jose` 5.10.0 pinned as a direct dependency (was already in the lockfile transitively).
- Triết: `checks/base-smoke.mjs` assumed Tide not configured; with the adapter present `/api/summarize` now answers **401** (not 503) without a valid token. Update the check.
