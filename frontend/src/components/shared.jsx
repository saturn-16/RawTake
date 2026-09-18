export function Confidence({ level }) {
  return <span className={`confidence confidence-${level}`}>{level} confidence</span>;
}

export function Critique({ c }) {
  return (
    <li className="critique">
      <div className="critique-claim">{c.claim}</div>
      <div className="critique-citation">source: {c.citation}</div>
      <div className="critique-severity">{c.severity}</div>
      <Confidence level={c.confidence} />
    </li>
  );
}

export function VerdictBody({ verdict, trustLabel, trustValue }) {
  return (
    <>
      <section className="weakest">
        <h3>Weakest point</h3>
        <p>{verdict.weakestPoint}</p>
      </section>

      <section className="verdict">
        <h3>Verdict</h3>
        <p>{verdict.verdict.summary}</p>
        <p>
          {trustLabel}:{" "}
          <span className={`trust-badge ${trustValue ? "yes" : "no"}`}>
            {trustValue ? "Yes" : "No"}
          </span>
        </p>
        <Confidence level={verdict.verdict.confidence} />
      </section>

      <section className="critiques">
        <h3>Critiques</h3>
        <ul>
          {verdict.critiques.map((c, i) => (
            <Critique key={i} c={c} />
          ))}
        </ul>
      </section>

      {verdict.positives.length > 0 && (
        <section className="positives">
          <h3>Genuine positives</h3>
          <ul>
            {verdict.positives.map((p, i) => (
              <li key={i} className="positive-entry">
                <div className="positive-claim">{p.claim}</div>
                <div className="critique-citation">source: {p.citation}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="comprehension">
        <h3>Prove you understand what you wrote</h3>
        <ol>
          {verdict.comprehensionQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
