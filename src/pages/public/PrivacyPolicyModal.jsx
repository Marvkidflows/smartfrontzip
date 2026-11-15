import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { PolicyBody, DraftNotice, SUMMARY } from './privacyPolicyContent';
import './PrivacyPolicy.css';

const FOCUSABLE = 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Full Data Privacy Policy in an accessible dialog, so a registering user can
 * read it WITHOUT leaving the form (and losing what they typed).
 * Shows the same shared content as the /privacy-policy page.
 */
export default function PrivacyPolicyModal({ open, onClose, meta }) {
  const dialogRef = useRef(null);
  const closeRef  = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();   // return focus to the button that opened the dialog
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="policy-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={dialogRef}
        className="policy-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
      >
        <header className="policy-modal__header">
          <div>
            <h2 id="policy-modal-title">Data Privacy Policy</h2>
            {meta?.version && <p className="policy-modal__version">Version {meta.version}</p>}
          </div>
          <button ref={closeRef} type="button" className="policy-modal__close" onClick={onClose} aria-label="Close privacy policy">
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="policy-modal__body">
          <DraftNotice approved={!!meta?.approved} />

          <ul className="policy-modal__summary">
            {SUMMARY.map(item => (
              <li key={item.key}><strong>{item.title}:</strong> {item.text}</li>
            ))}
          </ul>

          <PolicyBody headingLevel={3} idPrefix="modal-" />
        </div>

        <footer className="policy-modal__footer">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
            Open as a separate page<span className="sr-only"> (new tab)</span>
          </a>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close and continue</button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
