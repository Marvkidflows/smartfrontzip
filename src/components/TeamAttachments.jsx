// MarvFlow team dashboard — attachments (images AND documents). Shared by:
//   • pages/marvflow/MarvflowRequestDetail.jsx   (MarvFlow team replies)
//   • pages/shared/DevRequestDetail.jsx          (Admin / Financial replies)
//   • pages/shared/DevRequests.jsx               (Admin / Financial new request)
//
// Images keep their existing behaviour (uploaded by the server to the image host, shown via attachment_url).
// Documents (PDF, DOCX, XLSX, TXT, MD) are private: they are only ever fetched through the authenticated API
// (axios sends the bearer token) and opened/downloaded from a short-lived blob URL — never from a public link.
//
// The checks below are a convenience for the user; the SERVER is the authority and re-validates everything.
import { useState, useRef, useEffect, useCallback } from 'react';
import { FiPaperclip, FiX, FiFileText, FiDownload, FiEye, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Keep in step with the server (config/team_documents.php, TEAM_DOCUMENT_MAX_KB — default 10 MB; images 5 MB).
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPT_ATTR = 'image/*,.pdf,.docx,.xlsx,.txt,.md';
const DOCUMENT_EXT = ['pdf', 'docx', 'xlsx', 'txt', 'md'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

export function formatBytes(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

/** Returns an error message, or null when the file looks acceptable. */
export function validateAttachment(file) {
  if (!file) return null;
  const ext = extOf(file.name);
  const isImage = IMAGE_EXT.includes(ext);
  if (!isImage && !DOCUMENT_EXT.includes(ext)) {
    if (['doc', 'xls'].includes(ext)) return 'Legacy .doc / .xls files are not accepted. Please save the file as .docx or .xlsx.';
    if (['docm', 'xlsm'].includes(ext)) return 'Macro-enabled documents are not accepted. Please save the file as .docx or .xlsx.';
    return ext
      ? `Unsupported file type (.${ext}). Allowed: images (JPG, PNG, GIF, WEBP, BMP) and documents (PDF, DOCX, XLSX, TXT, MD).`
      : 'This file has no extension, so its type cannot be determined.';
  }
  if (file.size === 0) return 'This file is empty.';
  const limit = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > limit) return `This file is too large (${formatBytes(file.size)}). The limit is ${formatBytes(limit)}.`;
  return null;
}

/** Turn an axios error into one clear sentence (network failure, validation, size, permission, …). */
export function describeUploadError(err, fallback = 'The upload failed. Please try again.') {
  if (!err?.response) return 'Network error — nothing was sent. Check your connection and try again.';
  const { status, data } = err.response;
  if (status === 422) return data?.errors?.attachment?.[0] || data?.message || fallback;
  if (status === 413) return 'The file is too large for the server.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You are not authorised to do this.';
  return data?.message || fallback;
}

/** State for ONE attachment slot: pick → (validate) → uploading → success | error. */
export function useAttachmentState() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');     // idle | ready | uploading | success | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const clear = useCallback(() => { clearTimeout(timer.current); setFile(null); setStatus('idle'); setProgress(0); setError(''); }, []);
  const pick = useCallback((f) => {
    clearTimeout(timer.current);
    const msg = validateAttachment(f);
    if (msg) { setFile(null); setStatus('error'); setError(msg); return false; }
    setFile(f); setStatus('ready'); setProgress(0); setError('');
    return true;
  }, []);
  const begin = useCallback(() => { setStatus('uploading'); setProgress(0); setError(''); }, []);
  const onProgress = useCallback((e) => { if (e?.total) setProgress(Math.min(100, Math.round((e.loaded * 100) / e.total))); }, []);
  const succeed = useCallback(() => { setStatus('success'); setProgress(100); timer.current = setTimeout(clear, 1800); }, [clear]);
  const fail = useCallback((message) => { setStatus('error'); setError(message); }, []);   // keeps the file so the user can retry

  return { file, status, progress, error, pick, clear, begin, onProgress, succeed, fail };
}

// ── Picker button (opens the file dialog) ─────────────────────────────────────
export function AttachmentButton({ id, onPick, disabled, label, className = 'btn btn-ghost btn-sm', style }) {
  return (
    <>
      <input type="file" id={id} accept={ACCEPT_ATTR} style={{ display: 'none' }} disabled={disabled}
        onChange={(e) => { onPick(e.target.files?.[0] || null); e.target.value = ''; }} />
      <label htmlFor={id} className={className} title="Attach an image or document (PDF, DOCX, XLSX, TXT, MD)"
        aria-disabled={disabled} style={{ flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
        <FiPaperclip size={14} />{label ? <span style={{ marginLeft: 6 }}>{label}</span> : null}
      </label>
    </>
  );
}

// ── Selected file: name, type, size, progress / success / failure ─────────────
export function AttachmentStatus({ att, disabled }) {
  if (!att.file && !att.error) return null;
  const ext = att.file ? extOf(att.file.name).toUpperCase() : '';
  const failed = att.status === 'error';
  const colour = failed ? 'var(--danger, #dc2626)' : att.status === 'success' ? 'var(--success, #16a34a)' : 'var(--gray-600)';

  return (
    <div role={failed ? 'alert' : 'status'} style={{ fontSize: '0.8rem', marginTop: '0.5rem', border: `1px solid ${failed ? 'var(--danger, #dc2626)' : 'var(--gray-200)'}`, borderRadius: 8, padding: '0.45rem 0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colour }}>
        {failed ? <FiAlertCircle size={14} /> : att.status === 'success' ? <FiCheckCircle size={14} /> : <FiFileText size={14} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {att.file && (
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <strong>{att.file.name}</strong> <span style={{ color: 'var(--gray-500)' }}>· {ext || 'FILE'} · {formatBytes(att.file.size)}</span>
            </div>
          )}
          <div>
            {att.status === 'uploading' && `Uploading… ${att.progress}%`}
            {att.status === 'success' && 'Uploaded'}
            {att.status === 'ready' && 'Ready to send'}
            {failed && att.error}
          </div>
        </div>
        {att.status !== 'uploading' && !disabled && (
          <button type="button" onClick={att.clear} aria-label="Remove attachment" className="btn btn-ghost btn-sm" style={{ padding: '0.15rem 0.35rem' }}><FiX size={13} /></button>
        )}
      </div>
      {att.status === 'uploading' && (
        <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 4, marginTop: 6 }}>
          <div style={{ height: 4, width: `${att.progress}%`, background: 'var(--primary, #2563eb)', borderRadius: 4, transition: 'width .2s' }} />
        </div>
      )}
    </div>
  );
}

/** Full-width field for forms (new request): button + status. */
export function AttachmentField({ id, att, disabled }) {
  return (
    <div>
      <AttachmentButton id={id} onPick={att.pick} disabled={disabled} label="Attach image or document" />
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
        Images up to 5 MB · PDF, DOCX, XLSX, TXT, MD up to 10 MB
      </div>
      <AttachmentStatus att={att} disabled={disabled} />
    </div>
  );
}

// ── Existing image attachment (stored on the image host; unchanged behaviour) with a thumbnail preview ──
export function ImageAttachmentLink({ url, compact }) {
  const [broken, setBroken] = useState(false);
  if (!url) return null;
  if (broken) {
    return <a href={url} target="_blank" rel="noreferrer" style={compact ? { fontSize: '0.78rem', color: 'inherit', textDecoration: 'underline' } : undefined} className={compact ? undefined : 'btn btn-ghost btn-sm'}>
      <FiPaperclip size={13} /> View attachment</a>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open image" style={{ display: 'inline-block', marginTop: '0.5rem' }}>
      <img src={url} alt="Attachment preview" loading="lazy" onError={() => setBroken(true)}
        style={{ maxWidth: compact ? 160 : 220, maxHeight: compact ? 120 : 160, borderRadius: 8, border: '1px solid var(--gray-200)', display: 'block' }} />
    </a>
  );
}

async function blobErrorMessage(err) {
  const status = err?.response?.status;
  if (!err?.response) return 'Network error — the file could not be retrieved. Please try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403 || status === 404) return 'You do not have access to this file, or it is no longer available.';
  try { const t = await err.response.data?.text?.(); return JSON.parse(t)?.message || 'The file could not be retrieved.'; } catch { return 'The file could not be retrieved.'; }
}

// ── Documents attached to a request / reply: name, type, size, preview (PDF) and download ──
// fetchFile(attachmentId, inline) must return an axios response with responseType 'blob' (see the service layer).
export function AttachmentList({ items, fetchFile, compact }) {
  const [busy, setBusy] = useState(null);
  if (!items || items.length === 0) return null;

  const run = async (a, mode) => {
    if (busy) return;
    setBusy(`${a.id}:${mode}`);
    const win = mode === 'preview' ? window.open('', '_blank') : null;     // open synchronously so pop-up blockers allow it
    try {
      const res = await fetchFile(a.id, mode === 'preview');
      const url = URL.createObjectURL(new Blob([res.data], { type: a.mime }));
      if (mode === 'preview') {
        if (win) win.location.href = url; else window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url; link.download = a.name; document.body.appendChild(link); link.click(); link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      win?.close();
      toast.error(await blobErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '0.6rem' }}>
      {items.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: compact ? '0.78rem' : '0.85rem',
          border: compact ? 'none' : '1px solid var(--gray-200)', borderRadius: 8, padding: compact ? 0 : '0.45rem 0.6rem' }}>
          <FiFileText size={compact ? 13 : 16} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }} title={a.name}>{a.name}</div>
            <div style={{ opacity: 0.75, fontSize: '0.74rem' }}>{a.type} · {formatBytes(a.size)}{a.uploaded_by ? ` · ${a.uploaded_by}` : ''}</div>
          </div>
          {a.previewable && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => run(a, 'preview')} title="Open preview">
              <FiEye size={13} /> {compact ? '' : 'Preview'}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => run(a, 'download')} title="Download">
            {busy === `${a.id}:download` ? <span className="spinner" /> : <FiDownload size={13} />} {compact ? '' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}
