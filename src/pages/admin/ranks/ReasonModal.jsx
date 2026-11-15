import { useState } from 'react';

// Small confirm dialog that collects a reason. Reuses the existing .adm-modal styles.
export default function ReasonModal({
  title, intro, confirmLabel = 'Confirm', required = true, minLength = 5, danger = false,
  extra = null, busy = false, error = '', onConfirm, onClose,
}) {
  const [reason, setReason] = useState('');
  const tooShort = required && reason.trim().length < minLength;

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {intro && <p className="rk-muted">{intro}</p>}
        {extra}
        <label className="rk-label" htmlFor="rk-reason">Reason{required ? ' (required)' : ' (optional)'}</label>
        <textarea id="rk-reason" className="rk-input" rows={3} value={reason} maxLength={1000}
          onChange={(e) => setReason(e.target.value)} placeholder="Explain the decision — it is saved in the audit log." />
        {required && tooShort && reason.length > 0 && <div className="rk-error">At least {minLength} characters.</div>}
        {error && <div className="rk-error" role="alert">{error}</div>}
        <div className="adm-modal-footer">
          <button type="button" className="rk-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`rk-btn ${danger ? 'rk-btn--danger' : 'rk-btn--primary'}`}
            disabled={busy || tooShort} onClick={() => onConfirm(reason.trim())}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
