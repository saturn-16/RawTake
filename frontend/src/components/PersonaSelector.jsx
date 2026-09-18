import JellyRadio from "./reactbits/JellyRadio.jsx";

const PERSONAS = [
  { value: "technical", label: "Technical" },
  { value: "recruiter", label: "Recruiter" },
  { value: "decision_maker", label: "Decision Maker" },
];

export function PersonaSelector({ value, onChange }) {
  return (
    <div className="persona-selector-wrap">
      <span className="persona-selector-label">View as</span>
      <JellyRadio
        items={PERSONAS}
        value={value}
        onChange={onChange}
        ariaLabel="Persona lens"
        size="sm"
        chipColor="#131417"
        activeColor="#f2f1ed"
        activeTextColor="#08090b"
        textColor="#9a9a9e"
        radius={4}
        bounce={0.05}
        jelly={0}
        swell={0.08}
        barge={2}
        shrink={0.02}
        stagger={12}
        className="persona-jelly"
      />
    </div>
  );
}

export function PersonaBadge({ persona }) {
  const label = PERSONAS.find((p) => p.value === persona)?.label || persona;
  return <span className="persona-badge">Viewed as: {label}</span>;
}
