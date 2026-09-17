import { useState } from "react";
import RepoAnalyzer from "./RepoAnalyzer.jsx";
import ResumeAnalyzer from "./ResumeAnalyzer.jsx";
import PitchAnalyzer from "./PitchAnalyzer.jsx";
import CalloutChat from "./CalloutChat.jsx";
import SecondOpinionAnalyzer from "./SecondOpinionAnalyzer.jsx";

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
        <button
          type="button"
          className={`tab ${tab === "pitch" ? "active" : ""}`}
          onClick={() => setTab("pitch")}
        >
          Pitch
        </button>
        <button
          type="button"
          className={`tab ${tab === "callout" ? "active" : ""}`}
          onClick={() => setTab("callout")}
        >
          Callout
        </button>
        <button
          type="button"
          className={`tab ${tab === "second-opinion" ? "active" : ""}`}
          onClick={() => setTab("second-opinion")}
        >
          Second Opinion
        </button>
      </div>

      {tab === "repo" && <RepoAnalyzer />}
      {tab === "resume" && <ResumeAnalyzer />}
      {tab === "pitch" && <PitchAnalyzer />}
      {tab === "callout" && <CalloutChat />}
      {tab === "second-opinion" && <SecondOpinionAnalyzer />}
    </div>
  );
}
