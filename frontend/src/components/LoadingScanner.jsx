import { motion } from "framer-motion";

const MOCK_LINES = [
  "README.md",
  "package.json",
  "src/index.js",
  "commit history",
  "test coverage",
  "folder structure",
];

// Loading state styled as evidence being cross-examined: a scan-line sweeps
// down a list of redacted placeholder rows, "developing" each into legible
// text as it passes. Pure CSS/Framer Motion looping animation — respects
// reduced motion by rendering a static (non-scanning) version instead.
export default function LoadingScanner({ label = "CROSS-EXAMINING..." }) {
  return (
    <div className="loading-scanner">
      <div className="loading-scanner-label">{label}</div>
      <div className="loading-scanner-frame">
        {MOCK_LINES.map((line, i) => (
          <div key={i} className="loading-scanner-row">
            <span className="loading-scanner-bar" style={{ animationDelay: `${i * 0.35}s` }}>
              {line}
            </span>
          </div>
        ))}
        <motion.div
          className="loading-scanner-sweep"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
