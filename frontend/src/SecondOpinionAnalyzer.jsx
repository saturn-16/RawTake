import { useEffect, useState } from "react";
import { Confidence } from "./components/shared.jsx";
import LatticeLoader from "./components/reactbits/LatticeLoader.jsx";

const MODULES = [
  { key: "repo", label: "GitHub Repo", listUrl: "/api/analyze/repo", endpoint: (id) => `/api/analyze/repo/${id}/second-opinion` },
  { key: "resume", label: "Resume", listUrl: "/api/analyze/resume", endpoint: (id) => `/api/analyze/resume/${id}/second-opinion` },
  { key: "pitch", label: "Pitch", listUrl: "/api/analyze/pitch", endpoint: (id) => `/api/analyze/pitch/${id}/second-opinion` },
  {
    key: "callout",
    label: "Callout Conversation",
    listUrl: "/api/callout/conversations",
    endpoint: (id) => `/api/callout/conversations/${id}/second-opinion`,
  },
];

export default function SecondOpinionAnalyzer({ onHasResultChange }) {
  const [moduleKey, setModuleKey] = useState("repo");
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [pastedResponse, setPastedResponse] = useState("");
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const loading = status === "working";
  const [error, setError] = useState(null);
  const [verdict, setVerdict] = useState(null);

  const currentModule = MODULES.find((m) => m.key === moduleKey);

  useEffect(() => {
    setItems([]);
    setSelectedId("");
    setVerdict(null);
    setItemsLoading(true);
    fetch(currentModule.listUrl)
      .then((res) => res.json())
      .then((data) => {
        if (moduleKey === "callout") {
          setItems(
            (data.conversations || []).map((c) => ({
              id: c.id,
              label: c.title || `Conversation #${c.id}`,
              createdAt: c.createdAt,
            }))
          );
        } else {
          setItems(data.analyses || []);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setItemsLoading(false));
  }, [moduleKey]);

  useEffect(() => {
    onHasResultChange?.(!!verdict);
  }, [verdict, onHasResultChange]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedId || !pastedResponse.trim()) return;
    setStatus("working");
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch(currentModule.endpoint(selectedId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedResponse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed.");
      setVerdict(data.verdict);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <>
      <p className="tagline">
        Pick a past analysis or conversation, paste what another AI said about the same thing,
        and get it fact-checked against the real evidence already gathered.
      </p>

      <div className="form">
        <select value={moduleKey} onChange={(e) => setModuleKey(e.target.value)}>
          {MODULES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={itemsLoading || items.length === 0}
        >
          <option value="">
            {itemsLoading ? "Loading..." : items.length === 0 ? "No analyses yet" : "Select one..."}
          </option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="resume-form">
        <textarea
          placeholder="Paste the other AI's response about this same thing (ChatGPT, Gemini, Copilot, etc.)..."
          value={pastedResponse}
          onChange={(e) => setPastedResponse(e.target.value)}
          rows={10}
          required
        />
        <div className="form">
          <button type="submit" disabled={loading || !selectedId || !pastedResponse.trim()}>
            Fact-Check It
          </button>
        </div>
      </form>

      {status !== "idle" && (
        <LatticeLoader
          status={status}
          label="Checking"
          doneLabel="Checked in"
          errorLabel="Check failed after"
          color="#f2f1ed"
          doneColor="#3b82c4"
          errorColor="#e0332a"
          cellSize={6}
          fontSize={13}
        />
      )}

      {error && <div className="error">{error}</div>}

      {verdict && (
        <div className="result">
          <section className="verdict">
            <h3>Accurate? Honest?</h3>
            <p>{verdict.verdict.summary}</p>
            <p>
              <strong>Accurate against evidence:</strong>{" "}
              {verdict.verdict.accurateAgainstEvidence ? "Yes" : "No"}
            </p>
            <p>
              <strong>Honest in delivery:</strong>{" "}
              {verdict.verdict.wasHonestInDelivery ? "Yes" : "No"}
            </p>
            <Confidence level={verdict.verdict.confidence} />
          </section>

          <section className="critiques">
            <h3>Where it fell short</h3>
            {verdict.critiques.length === 0 && <p>No real problems found — it held up.</p>}
            <ul>
              {verdict.critiques.map((c, i) => (
                <li key={i} className="critique">
                  <div className="critique-claim">{c.claim}</div>
                  {c.evidenceCheck && (
                    <div className="critique-citation">evidence: {c.evidenceCheck}</div>
                  )}
                  <Confidence level={c.confidence} />
                </li>
              ))}
            </ul>
          </section>

          {verdict.whatItGotRight.length > 0 && (
            <section className="positives">
              <h3>What it actually got right</h3>
              <ul>
                {verdict.whatItGotRight.map((p, i) => (
                  <li key={i}>
                    {p.claim} <span className="critique-citation">({p.evidenceCheck})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
