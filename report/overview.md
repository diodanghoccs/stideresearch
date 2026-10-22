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
