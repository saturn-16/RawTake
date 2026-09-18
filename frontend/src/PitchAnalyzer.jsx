import { useEffect, useState } from "react";
import { VerdictBody } from "./components/shared.jsx";
import TrackRecordSummary from "./components/TrackRecordSummary.jsx";
import { PersonaSelector, PersonaBadge } from "./components/PersonaSelector.jsx";

export default function PitchAnalyzer({ onHasResultChange }) {
  const [pitchText, setPitchText] = useState("");
  const [persona, setPersona] = useState("technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [trackRecord, setTrackRecord] = useState(null);

  const [priorAnalyses, setPriorAnalyses] = useState([]);
  const [compareToAnalysisId, setCompareToAnalysisId] = useState("");

  useEffect(() => {
    fetch("/api/analyze/pitch")
      .then((res) => res.json())
      .then((data) => setPriorAnalyses(data.analyses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    onHasResultChange?.(!!verdict);
  }, [verdict, onHasResultChange]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerdict(null);
    setTrackRecord(null);
    try {
      const res = await fetch("/api/analyze/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitchText,
          compareToAnalysisId: compareToAnalysisId || undefined,
          persona,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setVerdict(data.verdict);
      setTrackRecord(data.trackRecord);
      setPriorAnalyses((prev) => [{ id: data.analysisId, label: "(just analyzed)" }, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="resume-form">
        <textarea
          placeholder="Paste your project pitch here (e.g. what you'd say in a placement interview)..."
          value={pitchText}
          onChange={(e) => setPitchText(e.target.value)}
          rows={10}
          required
        />
        {priorAnalyses.length > 0 && (
          <div className="form">
            <select
              value={compareToAnalysisId}
              onChange={(e) => setCompareToAnalysisId(e.target.value)}
            >
              <option value="">Not a re-check (fresh analysis)</option>
              {priorAnalyses.map((a) => (
                <option key={a.id} value={a.id}>
                  Compare to: {a.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form">
          <button type="submit" disabled={loading || !pitchText.trim()}>
            {loading ? "Analyzing..." : "Get Roasted"}
          </button>
        </div>
      </form>

      <PersonaSelector value={persona} onChange={setPersona} />

      {error && <div className="error">{error}</div>}

      {verdict && (
        <div className="result">
          <PersonaBadge persona={verdict.persona} />

          <TrackRecordSummary trackRecord={trackRecord} />

          <VerdictBody
            verdict={verdict}
            trustLabel="Would impress interviewer"
            trustValue={verdict.verdict.wouldImpressInterviewer}
          />
        </div>
      )}
    </>
  );
}
