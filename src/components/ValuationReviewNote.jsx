// Shown on a downgrade review when the shortfall MAY be caused by currency valuation (a record that is unverified, stale or unresolved).
// It must never read as a definitive failure: it says Financial verification is needed first and that nothing has been changed.
export default function ValuationReviewNote({ note }) {
  if (!note) return null;
  return (
    <div className="rk-banner rk-banner--info" role="note" aria-label="Possible currency valuation issue" style={{ marginTop: 8 }}>
      <strong>This may be a currency-valuation issue, not a failed requirement.</strong>
      <div>{note.message}</div>
      <ul>
        {note.unverified > 0 && <li>{note.unverified} without a verified USD valuation</li>}
        {note.stale > 0 && <li>{note.stale} with a stale valuation (the amount changed after it was verified)</li>}
        {note.unresolved > 0 && <li>{note.unresolved} with unresolved currency details (in the reconciliation queue)</li>}
      </ul>
      <div style={{ marginTop: 4 }}>Next step: ask the Financial Team to verify these records. The rank stays unchanged until an administrator decides.</div>
    </div>
  );
}
