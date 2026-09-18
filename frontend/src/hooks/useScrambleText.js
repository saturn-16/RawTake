import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/\\";

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

// Reveals `text` left-to-right over `duration`ms, showing random glyphs for
// not-yet-locked characters (a "declassifying" decode effect) rather than a
// plain typewriter. Whitespace is preserved as whitespace throughout so the
// text never breaks its line-wrap shape while scrambling. `active` gates
// when the effect starts (e.g. wait for a prior animation beat to finish).
export function useScrambleText(text, { active = true, duration = 600 } = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => (reducedMotion || !active ? text : ""));
  const [done, setDone] = useState(reducedMotion);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    if (reducedMotion) {
      setDisplay(text);
      setDone(true);
      return undefined;
    }

    setDone(false);
    const startTime = performance.now();
    const length = text.length;

    function tick(now) {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const lockedCount = Math.floor(ratio * length);

      let next = "";
      for (let i = 0; i < length; i++) {
        const ch = text[i];
        if (i < lockedCount || ch === " " || ch === "\n") {
          next += ch;
        } else {
          next += randomChar();
        }
      }
      setDisplay(next);

      if (ratio < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
        setDone(true);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active, duration, reducedMotion]);

  return { display, done, reducedMotion };
}
