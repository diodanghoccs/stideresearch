# Demo video script — 120 s (`demo.mp4`, < 100 MB)

Owner: Triệu. Record **only what actually ran**. Cut waiting/login time, never stage a result. If the team switched to S1 (no AI-reader), use the S1 variant at the end and say so on screen.

## Before recording (checklist)

- [ ] Tide realm up on the integration machine (Trí), app opened at the same origin the realm client allows.
- [ ] Four Tide accounts, each in its **own browser profile**: Lan (admin), AI-reader, Minh, Y.
- [ ] Policies signed in step 1: A→Lan rw, B→Lan rw, A→AI-reader read, S→Lan write, S→Minh read (no B→AI-reader, no S→Y).
- [ ] Synthetic A/B text from Triết's fixtures encrypted in step 2.
- [ ] Inference configured (Tuấn) — otherwise the AI step shows "Not run" and must be described as such.
- [ ] Nothing secret on screen: no raw JWT, invite link, admin password, API key, `data/tidecloak.json`.
- [ ] Screen recorder at 1080p, ~30 fps; check the file stays under 100 MB.

## Shot list

| Time | Screen | Voice-over (EN) |
|---|---|---|
| 0–15 s | Home page header + workflow A→draft→S | "Research teams want AI to summarise their data, but giving an AI tool access usually means giving it everything. STideResearch lets an AI read only what it was granted, and share the result with one collaborator." |
| 15–45 s | AI-reader profile: step 3 → Decrypt A (allowed) → Try to decrypt B (denied, show Tide's cause) | "This is the AI-reader's own Tide identity. It can decrypt dataset A. When it tries dataset B, the Tide network refuses — the server never had a key to leak." |
| 45–75 s | Summarize A → draft shown → Download JSON; Lan profile: step 4 import, edit, Encrypt & publish S | "A real model drafts the brief from A only. Lan reviews and edits it, then encrypts it into Minh's channel. Only ciphertext is stored." |
| 75–100 s | Minh profile: step 5 Open S (allowed). Y profile: same ciphertext + Minh's policy → denied | "Minh opens the brief. Y has the same ciphertext and the same policy, and is still refused, because Tide checks who is asking on every decryption." |
| 100–120 s | Status panel + short text card of limits | "TideCloak enforces who can decrypt each record across its network. Limits today: demo data, in-memory storage, Lan is also the admin who grants access." |

## Variant S1 (only if the AI-reader gate failed and Triệu chose S1)

Drop the 15–45 s AI-reader shots. Either Lan drafts with AI in her own session (say that the model sees what Lan sends, Tide does not restrict the model) or the brief is hand-written (say so). Keep the Minh/Y shots.
