import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VerdictBody } from "./components/shared.jsx";
import TrackRecordSummary from "./components/TrackRecordSummary.jsx";
import { PersonaSelector, PersonaBadge } from "./components/PersonaSelector.jsx";
import LoadingScanner from "./components/LoadingScanner.jsx";
import VerdictReveal from "./components/VerdictReveal.jsx";
import LatticeLoader from "./components/reactbits/LatticeLoader.jsx";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion.js";

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

export default function RepoAnalyzer({ onHasResultChange }) {
  const reducedMotion = usePrefersReducedMotion();
  const [repoUrl, setRepoUrl] = useState("");
  const [persona, setPersona] = useState("technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [analysisId, setAnalysisId] = useState(null);
  const [repoName, setRepoName] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [revealKey, setRevealKey] = useState(0);
  const [trackRecord, setTrackRecord] = useState(null);
  const [previousVerdict, setPreviousVerdict] = useState(null);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [disputeHistory, setDisputeHistory] = useState([]);
  const [heldPulseKey, setHeldPulseKey] = useState(0);

  const [disputeMessage, setDisputeMessage] = useState("");
  const [disputeStatus, setDisputeStatus] = useState("idle"); // idle | working | done | error
  const disputeLoading = disputeStatus === "working";
  const [disputeError, setDisputeError] = useState(null);

  useEffect(() => {
    onHasResultChange?.(!!verdict);
  }, [verdict, onHasResultChange]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysisId(null);
    setRepoName(null);
    setVerdict(null);
    setTrackRecord(null);
    setPreviousVerdict(null);
    setLastOutcome(null);
    setDisputeHistory([]);
    try {
      const res = await fetch("/api/analyze/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, persona }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysisId(data.analysisId);
      setRepoName(data.repo);
      setVerdict(data.verdict);
      setRevealKey((k) => k + 1);
      setTrackRecord(data.trackRecord);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDispute(e) {
    e.preventDefault();
    if (!disputeMessage.trim()) return;
    setDisputeStatus("working");
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
        setRevealKey((k) => k + 1);
      } else {
        setHeldPulseKey((k) => k + 1);
      }
      setLastOutcome({
        classification: data.classification,
        reasoning: data.reasoning,
        changeExplanation: data.changeExplanation,
        verdictHeld: data.verdictHeld,
      });
      setDisputeMessage("");
      setDisputeStatus("done");

      const historyRes = await fetch(`/api/analyze/repo/${analysisId}/disputes`);
      const historyData = await historyRes.json();
      if (historyRes.ok) {
        setDisputeHistory(historyData.disputes.slice(0, -1));
      }
    } catch (err) {
      setDisputeError(err.message);
      setDisputeStatus("error");
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

      <PersonaSelector value={persona} onChange={setPersona} />

      {error && <div className="error">{error}</div>}

      {loading && <LoadingScanner label="CROSS-EXAMINING REPOSITORY..." />}

      {verdict && (
        <div className="result">
          <h2>{repoName}</h2>
          <PersonaBadge persona={verdict.persona} />

          <TrackRecordSummary trackRecord={trackRecord} />

          {previousVerdict && (
            <motion.div
              className="superseded-verdict"
              initial={reducedMotion ? false : { opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="superseded-label">Previous verdict (superseded)</div>
              <div className="superseded-body">
                <VerdictBody
                  verdict={previousVerdict}
                  trustLabel="Would trust for placement"
                  trustValue={previousVerdict.verdict.wouldTrustForPlacement}
                />
              </div>
            </motion.div>
          )}

          <motion.div
            key={`held-${heldPulseKey}`}
            animate={
              heldPulseKey > 0 && !reducedMotion
                ? { boxShadow: ["0 0 0 0 rgba(224,51,42,0)", "0 0 0 6px rgba(224,51,42,0.35)", "0 0 0 0 rgba(224,51,42,0)"] }
                : {}
            }
            transition={{ duration: 0.6 }}
          >
            <VerdictReveal
              key={revealKey}
              verdict={verdict}
              trustLabel="Would trust for placement"
              trustValue={verdict.verdict.wouldTrustForPlacement}
            />
          </motion.div>

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
            {disputeStatus !== "idle" && (
              <LatticeLoader
                status={disputeStatus}
                label="Weighing"
                doneLabel="Verdict held in"
                errorLabel="Classification failed after"
                color="#f2f1ed"
                doneColor="#3b82c4"
                errorColor="#e0332a"
                cellSize={6}
                fontSize={13}
              />
            )}
            {disputeError && <div className="error">{disputeError}</div>}
          </section>
        </div>
      )}
    </>
  );
}
