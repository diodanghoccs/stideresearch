# STideResearch

## Project overview

**STideResearch lets a research team use AI on its data while the AI can only decrypt the dataset it was granted, and lets the owner share the AI's brief with exactly one collaborator, enforced by TideCloak rather than by the app.**

### Vision & originality
An AI research assistant with its own identity and its own, narrow decryption rights. The AI is treated like a collaborator granted one dataset, not a backend that sees everything.

### Trust constraint insight
Today, letting an AI tool summarise research data means uploading it to a server that can read all of it; anyone running or breaching it sees everything. Sharing results is the same: a button in an app decides who reads what. With per-record decryption checked by a decentralised network, the server stores only ciphertext and cannot hand out access.

### Value & impact
Small research teams and NGOs holding sensitive notes get AI summaries without exposing unrelated datasets, and share a brief with an outside partner without the raw data. Example: Lan grants the AI dataset A but not B, reviews the AI draft, and only Minh can open the final brief.

### Why TideCloak matters
Every person and the AI-reader sign in with Tide. Records are encrypted under RelationshipAttestation policies (one subject × one record) approved by an admin in the Tide enclave. Tide's ORK network checks the caller on every encrypt and decrypt, so the app server never holds a key and cannot grant itself access.

### Prototype & storytelling
One app, one screen, each role in its own Tide session: the AI-reader opens A and is refused B, a real model drafts a brief, Lan reviews and encrypts it, Minh opens it and Y is refused. A live status panel shows which integrations actually ran.

## Prototype status

Updated by the team before submission. Only rows marked **verified** were observed running; everything else is not claimed.

| Part | Status (22/10 15:20) |
|---|---|
| App, UI, protected routes, ciphertext-only storage | Built; with the realm adapter present every protected route answers 401 without a valid Tide token + DPoP proof |
| Tide realm + sign-in for Lan / AI-reader / Minh / Y | Realm exported (Trí); provider + server verifier wired — sign-in not yet run end to end |
| Policy signing + ORK allow/deny (A allowed, B refused; Minh allowed, Y refused) | Not verified yet |
| AI draft from a real model | Not verified yet (Tuấn) |
| Demo video `demo.mp4` | Not recorded yet — script in `report/demo-script.md` |

## Run it

Requires Node.js ≥ 22.18 and npm (one lockfile: `package-lock.json`).

```bash
npm ci
npm run typecheck
npm run build
npm run start -- -p 3000
```

Dev mode: `npm run dev` (uses `--webpack`, required by the Tide SDK on Next 16).

Tide: the app needs `data/tidecloak.json`, the adapter exported from your TideCloak realm (gitignored, never commit it). Realm setup follows the official Tide Agent Pack (`tide-foundation/raziel-mcp`, script `templates/shared/bootstrap-tidecloak.sh`); the realm client URL must match the URL you open the app on. Environment variable names are in `.env.example` (server-only, no secrets in the repo).

Checks:

```bash
npm run check:storage
BASE_URL=http://localhost:3000 npm run check:smoke
```

## How it works

```
Browser (one Tide session per person)          Next.js server (no Tide keys)
  sign in with Tide                     ──▶     verify token + DPoP on every route
  sign policy (admin, Tide enclave)     ──▶     POST /api/policies   (admin only)
  encrypt / decrypt with policy + tag   ◀─▶     GET|PUT /api/records/:id  (ciphertext only)
  AI-reader sends decrypted A text      ──▶     POST /api/summarize → model → draft
                 ▲
                 └── Tide ORK network checks subject + role on every encrypt/decrypt
```

| Folder | What | Owner |
|---|---|---|
| `src/contracts/` | Shared types and ports (`docs/CONTRACTS_CHANGELOG.md`) | Triệu |
| `src/tide/` | Tide session adapter + server verifier | Trí |
| `src/inference/`, `src/app/api/summarize/` | Model adapter | Tuấn |
| `src/storage/`, `src/app/api/records/`, `src/app/api/policies/`, `src/app/workflow/` | Ciphertext + policy store, protected routes, workflow UI | Triệu |
| `checks/`, `fixtures/` | Checks and synthetic A/B data | Triết |

## Limits (honest list)

- Demo data is synthetic; one project, two sources, one brief.
- Storage is in server memory: lost on restart, and it can only check the envelope shape, not that ciphertext is real.
- Lan is both data owner and the admin who approves grants; a single admin can grant herself access.
- `GET /api/policies` returns all policies of a record to any signed-in user so the Y refusal can be shown; this reveals who can read what.
- The AI-reader's decrypted text is sent to the model provider; Tide limits what the AI-reader can decrypt, not what the provider sees.
- Draft hand-off from AI-reader to Lan is a downloaded JSON file (plaintext on that machine).

## Team

RMIT Hackathon 2026, Challenge 2 — Trí, Tuấn, Triết, Triệu.
