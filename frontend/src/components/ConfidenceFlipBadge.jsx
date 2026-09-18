import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// A confidence badge that flips like a stamped coin to reveal its level.
// `flip` triggers the reveal (pass true once the preceding reveal beat is
// done). Reduced motion skips straight to the revealed face.
export default function ConfidenceFlipBadge({ level, flip }) {
  const reducedMotion = usePrefersReducedMotion();
  const revealed = reducedMotion || flip;

  return (
    <div className="confidence-flip-wrap">
      <motion.div
        className="confidence-flip-inner"
        initial={false}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <div className="confidence-flip-face confidence-flip-front">CONF</div>
        <div className={`confidence-flip-face confidence-flip-back confidence-flip-${level}`}>
          {level}
        </div>
      </motion.div>
    </div>
  );
}
