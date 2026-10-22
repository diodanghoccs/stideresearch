# STideResearch

## Project overview

**STideResearch is a research assistant where the AI gets its own Tide identity and can be granted one dataset only, and where a reviewed brief is shared with exactly one collaborator: designed so that TideCloak, not the app server, decides who can decrypt each record.**

### Vision & originality
An AI research assistant treated as a collaborator with its own identity and a narrow, per-record grant, not a backend that reads everything.

### Trust constraint insight
Using AI on research data today means uploading it to a server that reads all of it; anyone running or breaching that server sees everything, and an app button decides who reads what. If each record's decryption is authorised by a decentralised network against a signed policy, the server only stores ciphertext and cannot hand out access by itself.

### Value & impact
Small research teams and NGOs could get AI drafts from one dataset without exposing unrelated ones, and share a brief with an outside partner without sharing raw data. Example: Lan grants the AI dataset A but not B, reviews its draft, and only Minh can open the final brief.

### Why TideCloak matters
Every person, and the AI-reader, signs in with Tide; the API verifies Tide tokens and DPoP proofs. Records are designed to be encrypted under RelationshipAttestation policies (one subject × one record) approved by an admin in the Tide enclave, so Tide's ORK network checks the caller on every decrypt and no app server holds a key.

### Prototype & storytelling
Running today: a licensed Tide realm with governance (IGA), Tide sign-in issuing tokens to the app, and an API that rejects missing or forged tokens. The policy, encryption and AI-draft code is in the repo but has not yet run against the network; the status table lists what ran.

## Prototype status

Only rows marked **verified** were observed running. Everything else is built but not claimed. Details and evidence: `docs/tide-setup.md`, `checks/verification/`.

| Part | Status (22/10/2026 17:10, UTC+7) |
|---|---|
| Tide realm `stideresearch`: licence, IGA (`iga.attestor=tide`), admin linked | **Verified** on the integration machine (15:53–16:04) |
| Sign-in with Tide from the app | Partial: TideCloak issued a token to the app's client for the admin (Lan) at 16:14; no app-side capture |
| Protected API rejects a missing token, a fake Bearer token and an `alg:none` JWT | **Verified**: 9/9 routes answered 401 (`checks/integration-gate.check.mjs`, 16:48) |
| API accepting a real token + DPoP proof; role checks with a real session | Not run |
| Tide accounts for AI-reader, Minh and Y | Not created (1 of 4 identities) |
| Policy signing, encrypt/decrypt, ORK allow/deny (A allowed / B refused, Minh allowed / Y refused) | Not run; code in `src/tide/` |
| AI draft from a real model | Not run; adapter in `src/inference/` needs a model and key on the server |

Demo video: `demo.mp4` in the repository root shows only the parts above that ran.

## Run it

Requires Node.js ≥ 22.18, npm, and a TideCloak realm on the same machine.

1. Export the adapter from your realm to `data/tidecloak.json` (gitignored; never commit it). The build needs this file. Realm setup follows the official Tide Agent Pack (`tide-foundation/raziel-mcp`, `templates/shared/bootstrap-tidecloak.sh`).
2. Install and build:

```bash
npm ci
git checkout -- public/silent-check-sso.html
npm run typecheck
npm run build
```

`npm ci` rewrites `public/silent-check-sso.html`; the checkout line restores the committed copy.

3. Start on **port 3000** (the only app origin registered in this realm's adapter):

```bash
npm run start -- -p 3000
```

Open `http://localhost:3000` and use "Sign in with Tide". `/tide` shows the identity claims of the signed-in user (roles, user key presence), never a token.

Optional AI drafts: put `INFERENCE_PROVIDER=openai`, `INFERENCE_MODEL` and `INFERENCE_API_KEY` in `.env.local` (server-only; see `src/inference/README.md`). Without them the AI step answers "not ready".

Checks (server running on port 3000 for the HTTP ones):

```bash
npm run check:storage
node checks/fixture-contract.check.mjs
BASE_URL=http://localhost:3000 npm run check:gate
```

`npm run check:smoke` is for the base scaffold only: once Tide is configured it fails by design (it expects 503, the integrated app answers 401). See `checks/RUNBOOK.md`.

## How it works

```
Browser (one Tide session per person)          Next.js server (no Tide keys)
  sign in with Tide                     ──▶     verify token + DPoP on every route
  sign policy (admin, Tide enclave)     ──▶     POST /api/policies   (admin only)
  encrypt / decrypt with policy + tag   ◀─▶     GET|PUT /api/records/:id  (ciphertext only)
  AI-reader sends decrypted A text      ──▶     POST /api/summarize → model → draft
                 ▲
                 └── designed: Tide ORK network checks subject + role on every encrypt/decrypt
                     (not yet observed in this prototype)
```

| Folder | What | Owner |
|---|---|---|
| `src/contracts/` | Shared types and ports (`docs/CONTRACTS_CHANGELOG.md`) | Triệu |
| `src/tide/`, `src/app/tide/`, `docs/tide-setup.md` | Tide session adapter, server verifier (JWT + DPoP), diagnostics page, setup notes | Trí |
| `src/inference/`, `src/app/api/summarize/` | Model adapter and guarded summarize endpoint | Tuấn |
| `src/storage/`, `src/app/api/records/`, `src/app/api/policies/`, `src/app/workflow/` | Ciphertext + policy store, protected routes, workflow UI | Triệu |
| `checks/`, `fixtures/` | Checks, test matrix, synthetic A/B/S data | Triết |

## Limits (honest list)

- Demo data is synthetic; one project, two sources, one brief.
- Storage is in server memory: lost on restart, and it can only check the envelope shape, not that ciphertext is real.
- Lan is both data owner and the realm admin, and the admin approval threshold is 1: a single admin can grant herself access.
- The app server receives the AI-reader's decrypted A text and forwards it to the model provider. The server checks only the label `A`; it cannot prove the text came from A.
- `GET /api/policies` returns all policies of a record to any signed-in user so the Y refusal can be shown; this reveals who can read what.
- Draft hand-off from AI-reader to Lan is a downloaded JSON file (plaintext on that machine).

## Team

RMIT Hackathon 2026, Challenge 2: Trí, Tuấn, Triết, Triệu.
