import { useState } from "react";
import { VerdictBody } from "./components/shared.jsx";

function DisputeHistory({ disputes }) {
  const [open, setOpen] = useState(false);
  if (disputes.length === 0) return null;

  return (
    <div className="dispute-history">
      <button type="button" className="dispute-history-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} {disputes.length} previous dispute{disputes.length === 1 ? "" : "s"}
      </button>
      {open && (
        <ul className="dispute-history-list">
          {disputes.map((d) => (
            <li
              key={d.id}
              className={`dispute-history-item ${d.verdictHeld ? "held" : "revised"}`}
            >
              <div className="dispute-history-message">&ldquo;{d.userMessage}&rdquo;</div>
              <div className="dispute-history-outcome">
                {d.verdictHeld ? "Held firm" : "Verdict revised"} &mdash; {d.reasoning}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RepoAnalyzer() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [analysisId, setAnalysisId] = useState(null);
  const [repoName, setRepoName] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [previousVerdict, setPreviousVerdict] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [disputeHistory, setDisputeHistory] = useState([]);

  const [disputeMessage, setDisputeMessage] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysisId(null);
    setRepoName(null);
    setVerdict(null);
    setPreviousVerdict(null);
    setLastOutcome(null);
    setDisputeHistory([]);
    try {
      const res = await fetch("/api/analyze/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysisId(data.analysisId);
      setRepoName(data.repo);
      setVerdict(data.verdict);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDispute(e) {
    e.preventDefault();
    if (!disputeMessage.trim()) return;
    setDisputeLoading(true);
    setDisputeError(null);
    try {
      const res = await fetch(`/api/analyze/repo/${analysisId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: disputeMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispute failed.");

      if (!data.verdictHeld) {
        setPreviousVerdict(verdict);
        setVerdict(data.verdict);
      }
      setLastOutcome({
        classification: data.classification,
        reasoning: data.reasoning,
        changeExplanation: data.changeExplanation,
        verdictHeld: data.verdictHeld,
      });
      setDisputeMessage("");

      const historyRes = await fetch(`/api/analyze/repo/${analysisId}/disputes`);
      const historyData = await historyRes.json();
      if (historyRes.ok) {
        setDisputeHistory(historyData.disputes.slice(0, -1));
      }
    } catch (err) {
      setDisputeError(err.message);
    } finally {
      setDisputeLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Get Roasted"}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {verdict && (
        <div className="result">
          <h2>{repoName}</h2>

          {previousVerdict && (
            <div className="superseded-verdict">
              <div className="superseded-label">Previous verdict (superseded)</div>
              <div className="superseded-body">
                <VerdictBody
                  verdict={previousVerdict}
                  trustLabel="Would trust for placement"
                  trustValue={previousVerdict.verdict.wouldTrustForPlacement}
                />
              </div>
            </div>
          )}

          <VerdictBody
            verdict={verdict}
            trustLabel="Would trust for placement"
            trustValue={verdict.verdict.wouldTrustForPlacement}
          />

          {lastOutcome && (
            <div className={`dispute-outcome ${lastOutcome.verdictHeld ? "held" : "revised"}`}>
              <div className="dispute-outcome-label">
                {lastOutcome.verdictHeld ? "Verdict held" : "Verdict updated"}
              </div>
              <p>{lastOutcome.reasoning}</p>
              {lastOutcome.changeExplanation && <p>{lastOutcome.changeExplanation}</p>}
            </div>
          )}

          <DisputeHistory disputes={disputeHistory} />

          <section className="dispute-box">
            <h3>Push back</h3>
            <form onSubmit={handleDispute} className="form">
              <input
                type="text"
                placeholder="Think this is wrong? Tell us why."
                value={disputeMessage}
                onChange={(e) => setDisputeMessage(e.target.value)}
                disabled={disputeLoading}
              />
              <button type="submit" disabled={disputeLoading || !disputeMessage.trim()}>
                {disputeLoading ? "..." : "Dispute"}
              </button>
            </form>
            {disputeLoading && (
              <p className="dispute-loading">Checking your claim against the repo...</p>
            )}
            {disputeError && <div className="error">{disputeError}</div>}
          </section>
        </div>
      )}
    </>
  );
}
