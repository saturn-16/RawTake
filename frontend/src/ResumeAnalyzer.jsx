import { useState } from "react";
import { VerdictBody } from "./components/shared.jsx";

export default function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [extracting, setExtracting] = useState(false);

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
    try {
      const res = await fetch("/api/analyze/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, targetRole: targetRole || undefined }),
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
          <button type="submit" disabled={loading || !resumeText.trim()}>
            {loading ? "Analyzing..." : "Get Roasted"}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {verdict && (
        <div className="result">
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
