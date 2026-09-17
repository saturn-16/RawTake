import { useState } from "react";
import RepoAnalyzer from "./RepoAnalyzer.jsx";
import ResumeAnalyzer from "./ResumeAnalyzer.jsx";

export default function App() {
  const [tab, setTab] = useState("repo");

  return (
    <div className="app">
      <h1>RawTake</h1>
      <p className="tagline">No flattery. No hedging. Just the truth.</p>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "repo" ? "active" : ""}`}
          onClick={() => setTab("repo")}
        >
          GitHub Repo
        </button>
        <button
          type="button"
          className={`tab ${tab === "resume" ? "active" : ""}`}
          onClick={() => setTab("resume")}
        >
          Resume
        </button>
      </div>

      {tab === "repo" ? <RepoAnalyzer /> : <ResumeAnalyzer />}
    </div>
  );
}
