import MoltenMetal from "./reactbits/MoltenMetal.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// A slow, low-opacity ember texture behind the input/landing state only —
// unmounted the moment a result exists, so it never competes with citation
// legibility on a result screen. Fully disabled under reduced motion rather
// than reduced further, since a moving WebGL background is exactly the kind
// of effect that setting is meant to suppress.
export default function InputBackground() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return (
    <div className="input-background" aria-hidden="true">
      <MoltenMetal
        color1="#7a1f1a"
        color2="#e0332a"
        color3="#f2f1ed"
        colorMode="ember"
        speed={0.15}
        opacity={0.3}
        mouseInteraction={false}
        grain={false}
      />
    </div>
  );
}
