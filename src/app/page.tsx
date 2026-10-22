import { StatusPanel } from "./status-panel";
import { Workflow } from "./workflow/workflow";

const FLOW = [
  { step: "A / B", title: "Lan's source datasets", text: "Lan owns both encrypted datasets. The AI-reader is granted A only; B is refused by Tide." },
  { step: "Draft", title: "AI-reader drafts", text: "The AI-reader decrypts A in its own session and a real model writes a draft brief." },
  { step: "Review", title: "Lan reviews", text: "Lan imports the draft, edits it, and decides what is shared." },
  { step: "S", title: "Encrypted brief S", text: "Lan encrypts S into Minh's channel. Minh can open it; Y is refused by Tide." },
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
          Prototype in progress: the status panel below shows which integrations are live right now. Nothing is shown as
          working unless Tide or the AI actually returned it.
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
      <Workflow />
    </main>
  );
}
