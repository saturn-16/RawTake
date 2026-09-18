import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";
import { useScrambleText } from "../hooks/useScrambleText.js";
import ConfidenceFlipBadge from "./ConfidenceFlipBadge.jsx";

// Timing beats (ms) for the staged reveal — see the design plan. Kept as
// named constants so the sequence reads like a script, not magic numbers.
const STAMP_DELAY = 350;
const VERDICT_DECODE_DELAY = 550;
const VERDICT_DECODE_DURATION = 600;
const CONFIDENCE_FLIP_DELAY = 1100;
const CRITIQUES_START_DELAY = 1300;
const CRITIQUE_STAGGER = 180;

function useDelayedFlag(delayMs, reducedMotion) {
  const [flag, setFlag] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) {
      setFlag(true);
      return undefined;
    }
    const t = setTimeout(() => setFlag(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, reducedMotion]);
  return flag;
}

function WeakestPointStamp({ text, reducedMotion }) {
  const armed = useDelayedFlag(STAMP_DELAY, reducedMotion);

  if (reducedMotion) {
    return (
      <section className="weakest verdict-stamp">
        <h3>Weakest point</h3>
        <p>{text}</p>
      </section>
    );
  }

  return (
    <section className="weakest verdict-stamp-wrap">
      <h3>Weakest point</h3>
      {armed && (
        <>
          <motion.div
            className="verdict-stamp-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0] }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
          <motion.p
            className="verdict-stamp"
            initial={{ scale: 1.4, rotate: -3, opacity: 0, x: 0 }}
            animate={{ scale: 1, rotate: -1.5, opacity: 1, x: [0, -3, 3, -1, 0] }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {text}
          </motion.p>
        </>
      )}
    </section>
  );
}

function VerdictDecode({ summary, trustLabel, trustValue, confidence, reducedMotion }) {
  const decodeActive = useDelayedFlag(VERDICT_DECODE_DELAY, reducedMotion);
  const { display } = useScrambleText(summary, {
    active: decodeActive,
    duration: VERDICT_DECODE_DURATION,
  });
  const badgeArmed = useDelayedFlag(CONFIDENCE_FLIP_DELAY, reducedMotion);

  return (
    <section className="verdict">
      <h3>Verdict</h3>
      <p className="verdict-decode-text">{decodeActive ? display : " "}</p>
      {decodeActive && (
        <motion.p
          initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {trustLabel}:{" "}
          <span className={`trust-badge ${trustValue ? "yes" : "no"}`}>
            {trustValue ? "Yes" : "No"}
          </span>{" "}
          <ConfidenceFlipBadge level={confidence} flip={badgeArmed} />
        </motion.p>
      )}
    </section>
  );
}

function CritiqueEntry({ c, index, reducedMotion }) {
  return (
    <motion.li
      className="critique"
      initial={reducedMotion ? false : { opacity: 0, y: 12, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{
        delay: reducedMotion ? 0 : (CRITIQUES_START_DELAY + index * CRITIQUE_STAGGER) / 1000,
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="critique-claim">{c.claim}</div>
      <motion.div
        className="critique-citation"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: reducedMotion ? 0 : (CRITIQUES_START_DELAY + index * CRITIQUE_STAGGER + 50) / 1000,
          duration: 0.2,
        }}
      >
        source: {c.citation}
      </motion.div>
      <div className="critique-severity">{c.severity}</div>
      <span className={`confidence confidence-${c.confidence}`}>{c.confidence} confidence</span>
    </motion.li>
  );
}

// The centerpiece animated moment: a repo verdict delivered in stages
// (stamp impact -> decode -> confidence flip -> critiques cascading in),
// rather than popped in all at once. Fully static (no motion at all) under
// prefers-reduced-motion.
export default function VerdictReveal({ verdict, trustLabel, trustValue }) {
  const reducedMotion = usePrefersReducedMotion();
  const critiquesDelayTotal = CRITIQUES_START_DELAY + verdict.critiques.length * CRITIQUE_STAGGER;
  const laterContentArmed = useDelayedFlag(critiquesDelayTotal + 150, reducedMotion);

  return (
    <>
      <WeakestPointStamp text={verdict.weakestPoint} reducedMotion={reducedMotion} />

      <VerdictDecode
        summary={verdict.verdict.summary}
        trustLabel={trustLabel}
        trustValue={trustValue}
        confidence={verdict.verdict.confidence}
        reducedMotion={reducedMotion}
      />

      <section className="critiques">
        <h3>Critiques</h3>
        <ul>
          {verdict.critiques.map((c, i) => (
            <CritiqueEntry key={i} c={c} index={i} reducedMotion={reducedMotion} />
          ))}
        </ul>
      </section>

      {verdict.positives.length > 0 && (
        <motion.section
          className="positives"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: laterContentArmed ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3>Genuine positives</h3>
          <ul>
            {verdict.positives.map((p, i) => (
              <li key={i} className="positive-entry">
                <div className="positive-claim">{p.claim}</div>
                <div className="critique-citation">source: {p.citation}</div>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      <motion.section
        className="comprehension"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: laterContentArmed ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3>Prove you understand what you built</h3>
        <ol>
          {verdict.comprehensionQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </motion.section>
    </>
  );
}
