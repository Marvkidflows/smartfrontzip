// LOCATION: src/components/EmailPreviewFrame.jsx
//
// Email preview that CANNOT execute script, whatever HTML it is given. It renders inside an <iframe sandbox=""> (no allow-scripts, no
// allow-same-origin, no popups, no forms, no top navigation) with a CSP meta that forbids scripts and everything except inline styles and
// https/data images. This replaces the two `dangerouslySetInnerHTML` previews in the Email Center, which injected the editor's state straight
// into the page. A preview is a convenience; it must never be a way to run code in an admin's session.
import { useMemo } from 'react';

const CSP = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'";
const STYLES = 'html,body{margin:0}body{padding:14px;font:14px/1.7 Arial,Helvetica,sans-serif;color:#1e293b;overflow-wrap:anywhere}'
  + 'p{margin:0 0 .6em}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}a{color:#2563eb}hr{border:0;border-top:1px solid #cbd5e1}';

export default function EmailPreviewFrame({ html, placeholder = '<p style="color:#CBD5E1">Your message will appear here…</p>', height = 360 }) {
  const doc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><style>${STYLES}</style></head><body>${html || placeholder}</body></html>`,
    [html, placeholder],
  );
  return (
    <iframe
      title="Email preview" sandbox="" referrerPolicy="no-referrer" loading="lazy" srcDoc={doc}
      style={{ width: '100%', height, border: 0, background: '#fff', display: 'block' }}
    />
  );
}
