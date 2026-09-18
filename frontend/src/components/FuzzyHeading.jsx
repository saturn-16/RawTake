import FuzzyText from "./reactbits/FuzzyText.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// The RAWTAKE wordmark — a constant low-grade static hiss, sharpening on
// hover, like a signal that isn't quite locked in. Falls back to the plain
// static heading under reduced motion, same as every other effect here.
export default function FuzzyHeading() {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <h1>RAWTAKE</h1>;
  }

  return (
    <h1 className="fuzzy-heading">
      <FuzzyText
        fontFamily="inherit"
        fontWeight={900}
        fontSize="2.75rem"
        color="#f2f1ed"
        enableHover
        baseIntensity={0.12}
        hoverIntensity={0.45}
        fuzzRange={18}
        direction="horizontal"
        transitionDuration={8}
      >
        RAWTAKE
      </FuzzyText>
    </h1>
  );
}
