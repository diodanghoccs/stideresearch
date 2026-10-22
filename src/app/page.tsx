import { StatusPanel } from "./status-panel";

const FLOW = [
  { step: "A", title: "Source dataset A", text: "Encrypted research notes. Only the AI-reader principal is granted A (B is denied)." },
  { step: "Draft", title: "AI-reader drafts", text: "The AI-reader decrypts A through Tide and a real model writes a draft brief." },
  { step: "Review", title: "Lan reviews", text: "The owner reviews the draft in the app before anything is shared." },
  { step: "S", title: "Encrypted brief S", text: "Lan encrypts S into Minh's channel. Minh can open it; Y is denied by Tide." },
];

export default function Home() {
  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">RMIT Hackathon 2026 · Challenge 2</p>
        <h1>STideResearch</h1>
        <p className="lead">
          An AI research assistant whose reader only decrypts the dataset it was granted, then shares the brief in an
          encrypted channel for one collaborator. TideCloak enforces who can decrypt each record.
        </p>
        <p className="notice" role="note">
          Base scaffold: Tide and AI are not connected yet. Nothing on this page is protected by Tide.
        </p>
      </header>

      <section aria-labelledby="flow-h">
        <h2 id="flow-h">Workflow A → draft → S</h2>
        <ol className="flow">
          {FLOW.map((f) => (
            <li key={f.step}>
              <span className="step">{f.step}</span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <StatusPanel />
    </main>
  );
}
