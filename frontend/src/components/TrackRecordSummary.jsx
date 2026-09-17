export default function TrackRecordSummary({ trackRecord }) {
  if (!trackRecord || !trackRecord.isRecheck) return null;

  const { resolved, partiallyResolved, unresolved, items } = trackRecord;

  return (
    <section className="track-record">
      <h3>Since your last check</h3>
      <p className="track-record-tally">
        {resolved} fixed, {partiallyResolved} partially fixed, {unresolved} still open
      </p>
      {items.length === 0 ? (
        <p>No previously tracked issues to check against this time.</p>
      ) : (
        <ul className="track-record-list">
          {items.map((item, i) => (
            <li key={i} className={`track-record-item ${item.status}`}>
              <div className="track-record-status">
                {item.status === "resolved" && "Fixed"}
                {item.status === "partially_resolved" && "Partially fixed"}
                {item.status === "unresolved" && "Still open"}
              </div>
              <div className="track-record-claim">{item.claim}</div>
              <div className="track-record-note">{item.note}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
