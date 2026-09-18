import { useState } from "react";
import RepoAnalyzer from "./RepoAnalyzer.jsx";
import ResumeAnalyzer from "./ResumeAnalyzer.jsx";
import PitchAnalyzer from "./PitchAnalyzer.jsx";
import CalloutChat from "./CalloutChat.jsx";
import SecondOpinionAnalyzer from "./SecondOpinionAnalyzer.jsx";
import ModuleTabs from "./components/ModuleTabs.jsx";
import InputBackground from "./components/InputBackground.jsx";
import FuzzyHeading from "./components/FuzzyHeading.jsx";
import GitHubLink from "./components/GitHubLink.jsx";

const MODULE_ITEMS = [
  { value: "repo", label: "GitHub Repo" },
  { value: "resume", label: "Resume" },
  { value: "pitch", label: "Pitch" },
  { value: "callout", label: "Callout" },
  { value: "second-opinion", label: "Second Opinion" },
];

export default function App() {
  const [tab, setTab] = useState("repo");
  // Lifted here so the one InputBackground instance at the root knows
  // whether the *active* screen currently has a result showing — each
  // analyzer reports its own state up via onHasResultChange.
  const [hasResult, setHasResult] = useState(false);

  function handleTabChange(newTab) {
    setTab(newTab);
    // Switching tabs unmounts the old analyzer and mounts a fresh one with
    // no result yet, so reset immediately rather than waiting a render for
    // the new screen's own effect to report back (avoids a one-frame flash).
    setHasResult(false);
  }

  return (
    <>
      {!hasResult && <InputBackground />}

      <GitHubLink />

      <div className="app">
        <FuzzyHeading />
        <p className="tagline header-tagline">No flattery. No hedging. Just the truth.</p>

        <ModuleTabs items={MODULE_ITEMS} value={tab} onChange={handleTabChange} />

        {tab === "repo" && <RepoAnalyzer onHasResultChange={setHasResult} />}
        {tab === "resume" && <ResumeAnalyzer onHasResultChange={setHasResult} />}
        {tab === "pitch" && <PitchAnalyzer onHasResultChange={setHasResult} />}
        {tab === "callout" && <CalloutChat onHasResultChange={setHasResult} />}
        {tab === "second-opinion" && <SecondOpinionAnalyzer onHasResultChange={setHasResult} />}
      </div>
    </>
  );
}
