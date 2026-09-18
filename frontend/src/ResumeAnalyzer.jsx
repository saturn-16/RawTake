import { useEffect, useState } from "react";
import { VerdictBody } from "./components/shared.jsx";
import TrackRecordSummary from "./components/TrackRecordSummary.jsx";
import { PersonaSelector, PersonaBadge } from "./components/PersonaSelector.jsx";

export default function ResumeAnalyzer({ onHasResultChange }) {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [persona, setPersona] = useState("technical");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [trackRecord, setTrackRecord] = useState(null);
  const [extracting, setExtracting] = useState(false);

  const [priorAnalyses, setPriorAnalyses] = useState([]);
  const [compareToAnalysisId, setCompareToAnalysisId] = useState("");

  useEffect(() => {
    fetch("/api/analyze/resume")
      .then((res) => res.json())
      .then((data) => setPriorAnalyses(data.analyses || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    onHasResultChange?.(!!verdict);
  }, [verdict, onHasResultChange]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/analyze/resume/extract", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read that PDF.");
      setResumeText(data.text);
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVerdict(null);
    setTrackRecord(null);
    try {
      const res = await fetch("/api/analyze/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          targetRole: targetRole || undefined,
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
        <div className="resume-upload">
          <label htmlFor="resume-pdf" className="resume-upload-label">
            {extracting ? "Reading PDF..." : "Upload PDF"}
          </label>
          <input
            id="resume-pdf"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={extracting}
          />
          <span className="resume-upload-or">or paste text below</span>
        </div>
        <textarea
          placeholder="Paste your resume or LinkedIn profile text here..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={12}
          required
        />
        <div className="form">
          <input
            type="text"
            placeholder="Target role (optional, e.g. Software Engineer)"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
        </div>
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
          <button type="submit" disabled={loading || !resumeText.trim()}>
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
            trustLabel="Would advance to interview"
            trustValue={verdict.verdict.wouldAdvanceToInterview}
          />
        </div>
      )}
    </>
  );
}
