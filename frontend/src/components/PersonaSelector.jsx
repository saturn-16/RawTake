const PERSONAS = [
  { value: "technical", label: "Technical" },
  { value: "recruiter", label: "Recruiter" },
  { value: "decision_maker", label: "Decision Maker" },
];

export function PersonaSelector({ value, onChange }) {
  return (
    <div className="form">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {PERSONAS.map((p) => (
          <option key={p.value} value={p.value}>
            View as: {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PersonaBadge({ persona }) {
  const label = PERSONAS.find((p) => p.value === persona)?.label || persona;
  return <span className="persona-badge">Viewed as: {label}</span>;
}
