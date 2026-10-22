# Tide setup and status (owner: Trí)

State as of 22/10/2026 16:55 (UTC+7). Every line below says whether it was run. Nothing here is
`S2_VERIFIED`.

## Environment (measured)

| Item | Value |
|---|---|
| Integration machine | Trí's laptop, Windows 11 + WSL2 Ubuntu-22.04 + Docker Desktop 28.4.0 |
| TideCloak server | `tideorg/tidecloak-dev:latest` `sha256:3f52d0bc…` (built 19/10/2026), Keycloak 26.7.5 |
| Bootstrap | `tide-foundation/raziel-mcp` @ `b0e1e49`, `templates/shared/bootstrap-tidecloak.sh`; T0 15:53:16 |
| Realm / client | `stideresearch` / `stideresearch-client` (public) |
| Auth URL / ORK | `http://localhost:8080/` / `https://ork1.tideprotocol.com` |
| Licence / IGA | free tier, Active; `iga.attestor=tide`, EdDSA, approver = client role `realm-management/tide-realm-admin`, threshold 1 |
| SDK (package-lock) | `@tidecloak/nextjs` 0.14.40, `@tidecloak/js` 0.14.41, `@tidecloak/react` 0.14.33, `@tidecloak/verify` 0.14.33 |
| SDK ↔ server match | UNKNOWN (server prints only the Keycloak version) |
| Node | v24 |

## Run

1. TideCloak must be running on the same machine (`docker ps` shows `tidecloak`).
2. Put the adapter exported from the realm at `data/tidecloak.json` (gitignored, public ids/keys only;
   never commit it). The adapter lists allowed origins `http://localhost:3000` and `http://localhost:8080`.
3. `npm ci` (then restore `public/silent-check-sso.html` with `git checkout -- public/silent-check-sso.html`,
   `npm ci` overwrites it), `npm run typecheck`.
4. `npm run dev -- -p 3000`. **Use port 3000**: other ports are not registered origins in this adapter.
5. Login is the button on `/`. There is no `/tide` route on this branch.

The adapter only works when the app, TideCloak and the browser are on the same machine
(`localhost:8080` / `localhost:3000`). Another machine needs its own realm or verified URLs.

## Code map

| File | Role |
|---|---|
| `src/app/providers.tsx` | `TideCloakProvider` with DPoP strict ES256, wraps `TideSessionBridge` |
| `src/tide/session-bridge.tsx` | Browser `TideSessionPort`: session, login/logout, `authFetch` (`secureFetch`, token + DPoP), `signPolicy`, `encrypt`, `decrypt` |
| `src/tide/relationship.ts` | `RelationshipAttestation:1` policy build/sign, encrypt/decrypt with the record id as the only tag (from the Tide pack) |
| `src/tide/server.ts` | `TideRequestVerifier`: JWT signature against the adapter JWKS, issuer, `azp`, then DPoP; roles only from verified claims |
| `src/tide/verify-dpop.ts` | RFC 9449 proof check: `DPoP` scheme, embedded jwk, `cnf.jkt`, `ath`, `htm`, `htu`, `iat`, `jti` replay |
| `src/app/api/_lib/guard.ts` | Route guard: Tide ready → verify → authorize, before any body read |

Role per server operation: `write-record` needs `_tide_encryptor`, `store-policy` needs
`tide-realm-admin`, `summarize` needs `_tide_decryptor`; reads need a verified session only (the
decrypt itself is enforced by the ORK). Tide record tags are `rec-A` / `rec-B` / `rec-S`; the
summarize API payload uses `sourceRecordId: "A"` (not changed here).

Error classification (`fromTideError`): `denied` only when the error carries a contract cause
(`subjectId does not match`, `Tags do not contain`, `not found in doken`, role not found). A bare
`THRESHOLD_FAILURE` or a network error is `error`/`UPSTREAM_ERROR`, never a deny.

## Status matrix

| Capability | Mode | Result | Evidence |
|---|---|---|---|
| Realm + licence + IGA + admin linked, multiAdmin | real | PASS (15:53–16:04) | `docker logs tidecloak` |
| Role CR `GRANT_ROLES tide-realm-admin` to Lan | real | PASS, CR `c7bf608d…`, firstAdmin bypass, signed via VVK 16:04:03 | container log |
| `_tide_encryptor` / `_tide_decryptor` for Lan | real | UNKNOWN (not checked in claims) | — |
| Identities AI-reader, Minh, Y | — | NOT_RUN: accounts not created (1/4 identities) | log shows a single realm user |
| Browser login Lan → app client | real | PARTIAL: TideCloak issued a token for `stideresearch-client` to Lan at 16:14:31; no app-side capture | container log |
| API rejects no token / fake Bearer / `alg:none` JWT | real | PASS 9/9 routes → 401 (Triết's checks, 16:40–16:52) | `checks/verification` on `c2/triet-001-fixtures-checks` |
| API accepts real token + DPoP; wrong DPoP rejected; non-admin cannot store policy | real | NOT_RUN | — |
| Policy signing (`RelationshipAttestation:1`) | real | NOT_RUN | — |
| Owner encrypt/decrypt round-trip | real | NOT_RUN | — |
| Minh opens S / Y denied by ORK | real | NOT_RUN | — |
| AI-reader A allow / B ORK deny | real | NOT_RUN | — |

## Limits to state honestly

- The owner is also the realm admin and the admin threshold is 1: this is not "safe against any admin".
- The model receives plaintext of A to summarize; only storage holds ciphertext.
- No ORK allow/deny has been observed. 401/403/503 from the API are not ORK decisions.
