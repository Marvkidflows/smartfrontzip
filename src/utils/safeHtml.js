// LOCATION: src/utils/safeHtml.js
//
// F-11 defence-in-depth. The server already sanitises every HTML input path (App\Services\RichTextSanitizer) on write AND read. This is a second,
// independent allow-list applied in the browser immediately before any dangerouslySetInnerHTML, so a server regression, an old unsanitised row or a
// local preview of staff-typed content can never execute script in an investor's or staff member's session (and therefore cannot read the auth token).
// No dependency: it uses the browser's DOMParser, which does NOT execute scripts or load resources while parsing. Fails closed (returns '').

const TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'span', 'div', 'blockquote', 'a',
  'h1', 'h2', 'h3', 'h4', 'hr', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'svg', 'math', 'form', 'input',
  'textarea', 'select', 'button', 'option', 'link', 'meta', 'base', 'template', 'noscript', 'head', 'title', 'audio', 'video', 'source', 'canvas',
  'picture', 'xml', 'xmp', 'plaintext', 'noframes', 'noembed', 'listing', 'marquee', 'dialog', 'portal']);
const ATTRS = {
  '*': ['style', 'class', 'align'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  table: ['width', 'cellpadding', 'cellspacing', 'border'],
  td: ['colspan', 'rowspan', 'width', 'valign'], th: ['colspan', 'rowspan', 'width', 'valign'], tr: ['valign'],
};
const MAX_LEN = 2_000_000;
const MAX_NODES = 50_000;

export function isSafeUrl(value, { image = false } = {}) {
  const v = String(value ?? '').replace(/[\u0000-\u0020\u00a0]+/g, '');          // browsers ignore control chars/whitespace inside schemes
  if (!v) return false;
  if (image) return /^https:\/\//i.test(v) || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(v);
  return /^(https?:\/\/|mailto:)/i.test(v);
}

// R-F11: inline styles are filtered per DECLARATION against a property ALLOWLIST. Layout/positioning properties (position, top/left/right/bottom, z-index,
// display, float, overflow, transform, opacity, pointer-events, cursor, content, filter …) are deliberately absent: they are what a click-jacking /
// full-screen phishing overlay (position:fixed; inset:0; z-index:9999) is made of. url(), expression(), @import, escapes and comments are never allowed.
const STYLE_PROPS = new Set(['color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-align', 'text-decoration',
  'line-height', 'vertical-align', 'width', 'height', 'max-width', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-collapse', 'list-style-type']);
const STYLE_FORBIDDEN = /(url\s*\(|expression|javascript|vbscript|@import|behavior|-moz-binding|\\|\/\*|<|>)/i;

/** Returns only the allowed declarations of a style attribute, normalised ('' when nothing survives). */
export function sanitizeStyle(value) {
  const v = String(value ?? '');
  if (STYLE_FORBIDDEN.test(v)) return '';
  const out = [];
  for (const decl of v.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!STYLE_PROPS.has(prop) || val === '' || !/^[\w\s#.,%()\-'"]*$/.test(val)) continue;
    out.push(`${prop}:${val}`);
  }
  return out.join(';');
}

/** True only when EVERY declaration in the value is allowed (nothing would be dropped). */
export function isSafeStyle(value) {
  const v = String(value ?? '').trim().replace(/;+\s*$/, '');
  if (!v) return false;
  const kept = sanitizeStyle(v);
  return kept !== '' && kept.split(';').length === v.split(';').filter((d) => d.trim() !== '').length;
}

function clean(node, state) {
  for (const child of Array.from(node.childNodes)) {
    if (++state.n > MAX_NODES) throw new Error('too many nodes');
    if (child.nodeType === 3) continue;                                            // text
    if (child.nodeType !== 1) { node.removeChild(child); continue; }              // comments, PIs …
    const tag = child.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) { node.removeChild(child); continue; }
    if (!TAGS.has(tag)) {                                                          // unknown wrapper: keep its (cleaned) children
      clean(child, state);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      node.removeChild(child);
      continue;
    }
    const allowed = new Set([...(ATTRS['*']), ...(ATTRS[tag] || [])]);
    for (const a of Array.from(child.attributes)) {
      const name = a.name.toLowerCase();
      let ok = allowed.has(name) && !name.startsWith('on');
      if (ok && name === 'href') ok = isSafeUrl(a.value);
      if (ok && name === 'src') ok = isSafeUrl(a.value, { image: true });
      if (ok && name === 'style') { const cs = sanitizeStyle(a.value); if (cs) child.setAttribute('style', cs); else ok = false; }
      if (ok && name === 'class') ok = /^[a-z0-9 _-]+$/i.test(a.value) && a.value.split(/\s+/).every((c) => /^(ql-|rt-|mfm-)/.test(c) || c === '');
      if (ok && name === 'target') ok = a.value === '_blank';
      if (!ok) child.removeAttribute(a.name);
    }
    if (tag === 'a') { child.setAttribute('rel', 'noopener noreferrer nofollow'); if (child.getAttribute('target')) child.setAttribute('target', '_blank'); }
    clean(child, state);
  }
}

export function safeHtml(html) {
  try {
    const src = String(html ?? '');
    if (!src || src.length > MAX_LEN) return '';
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${src}`, 'text/html');
    clean(doc.body, { n: 0 });
    return doc.body.innerHTML;
  } catch {
    return '';                                                                     // fail closed
  }
}

export default safeHtml;
export { safeEmailHtml } from './safeEmailHtml';   // kept for AdminEmailCenter (original file, unchanged)
