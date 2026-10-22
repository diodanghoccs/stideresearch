# Demo video script — 120 s, real parts only (`demo.mp4`, < 100 MB)

Owner: Triệu. Recorded on Trí's machine (the only machine with the realm). Show **only what actually runs**; for everything else, show the code and say "designed" or "not yet run". No simulation, no staged results.

## Before recording (checklist)

- [ ] TideCloak running (`docker ps` shows `tidecloak`), app started with `npm run start -- -p 3000`, opened at `http://localhost:3000`.
- [ ] Signed out at the start, so the Tide sign-in is visible.
- [ ] Optional: if `INFERENCE_*` is configured and one real summarize call succeeded, you may show the AI step; otherwise do not show it as working.
- [ ] Nothing secret on screen: no token, invite link, admin password, API key, `.env.local` or `data/tidecloak.json` content.
- [ ] Screen recorder (Xbox Game Bar: Win+Alt+R, or OBS), 1080p; check the file is under 100 MB before committing.

## Shot list

| Time | Screen | Voice-over (EN) |
|---|---|---|
| 0–20 s | Home page header and workflow A→draft→S | "Research teams want AI to summarise their data, but an AI tool usually gets access to everything. STideResearch gives the AI its own identity and a grant for one dataset, and shares the reviewed brief with one collaborator." |
| 20–35 s | Status table in README or the app's status panel | "Today, trust sits with whoever runs the server. We want decryption decided per record by Tide's network, so the server only ever stores ciphertext." |
| 35–60 s | "Sign in with Tide" → Tide login → back in the app signed in; then `/tide` showing the claims (roles, user key present) | "This is a real TideCloak realm with Tide's governance switched on. The admin, Lan, signs in with Tide; the app reads her identity from a Tide-issued token." |
| 60–80 s | Terminal: `BASE_URL=http://localhost:3000 npm run check:gate` → 401 results | "Every protected route verifies the Tide token and its DPoP proof on the server. Missing or forged tokens, even an unsigned JWT claiming admin roles, are rejected." |
| 80–105 s | Editor: `src/tide/relationship.ts` and `src/tide/session-bridge.tsx` (encrypt/decrypt with a policy), workflow steps on the page | "Records are designed to be encrypted under RelationshipAttestation policies, one subject per record, approved by an admin in the Tide enclave. The AI-reader would get A but not B; Minh would open the brief and Y would not. This part is built but not yet run against the network." |
| 105–120 s | README "Limits" | "What changes: an AI and a collaborator can be given exactly one record, without trusting the app server. Limits today: synthetic data, in-memory storage, and Lan is also the only admin." |

If a later run proves more (for example Lan's encrypt/decrypt round-trip or Y being refused by the network), replace the 80–105 s shot with that real result and update the README status table at the same time.
