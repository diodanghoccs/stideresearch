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
