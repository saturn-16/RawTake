import { useState } from "react";
import { VerdictBody } from "./components/shared.jsx";

export default function PitchAnalyzer() {
  const [pitchText, setPitchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verdict, setVerdict] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/analyze/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitchText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setVerdict(data.verdict);
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
        <div className="form">
          <button type="submit" disabled={loading || !pitchText.trim()}>
            {loading ? "Analyzing..." : "Get Roasted"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {verdict && (
        <div className="result">
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
