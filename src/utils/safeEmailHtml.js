// LOCATION: src/utils/safeHtml.js
//
// CLIENT-SIDE guard for HTML that is about to be handed to the Quill editor (templates, prefilled drafts).
//
// WHY: Quill 1.3.7's clipboard.convert() assigns the HTML to the .innerHTML of a container that lives INSIDE the page. A browser starts
// loading images created that way and fires their onerror handler — so `<img src=x onerror=…>` given to the editor's `value` prop EXECUTES,
// before Quill has normalised anything. (Verified by reading node_modules/quill/modules/clipboard.js.)  The server already sanitises
// everything it returns (RichTextSanitizer, email profile); this function is the second, independent layer in the browser.
//
// HOW: parse with DOMParser — an INERT document: no script runs, no image loads, no handler fires — then rebuild only allow-listed tags,
// attributes and URL schemes into a fresh tree and serialise that. Fails CLOSED (returns '' on any error). It is deliberately simpler than the
// server allow-list (the server stays the authority); it only needs to be safe, not byte-identical.
//
// Not a replacement for server sanitising and never used for the investor/admin read views (those receive server-sanitised HTML).

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'SPAN', 'DIV', 'BLOCKQUOTE', 'A',
  'H1', 'H2', 'H3', 'H4', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'IMG']);
// removed together with everything inside them
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET', 'SVG', 'MATH', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT',
  'BUTTON', 'OPTION', 'LINK', 'META', 'BASE', 'TEMPLATE', 'NOSCRIPT', 'HEAD', 'TITLE', 'AUDIO', 'VIDEO', 'SOURCE', 'CANVAS', 'XMP', 'PLAINTEXT',
  'NOFRAMES', 'NOEMBED', 'LISTING', 'BGSOUND', 'MARQUEE', 'DIALOG', 'PORTAL']);
const ATTRS = {
  A: ['href'], IMG: ['src', 'alt', 'width', 'height'],
  TABLE: ['width', 'cellpadding', 'cellspacing', 'border', 'align'], TD: ['colspan', 'rowspan', 'width', 'align', 'valign'], TH: ['colspan', 'rowspan', 'width', 'align', 'valign'],
  TR: ['align', 'valign'], P: ['align'], DIV: ['align'], H1: ['align'], H2: ['align'], H3: ['align'], H4: ['align'],
};
const LINK_OK = /^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+)$/i;
const IMG_OK  = /^(https:\/\/[^\s"'<>]+|data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2})$/;
const STYLE_PROPS = new Set(['font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'color', 'background-color', 'text-align', 'line-height',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'border', 'width', 'max-width']);
const STYLE_VALUE_OK = /^[a-z0-9#\s.,%'"()-]{1,120}$/i;
const STYLE_VALUE_BAD = /url\s*\(|expression|javascript|@import|behavior|var\s*\(|\\|\/\*/i;
const MAX_DEPTH = 40, MAX_NODES = 20000;

function cleanStyle(value) {
  const out = [];
  for (const decl of String(value).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (STYLE_PROPS.has(prop) && STYLE_VALUE_OK.test(val) && !STYLE_VALUE_BAD.test(val)) out.push(`${prop}:${val}`);
  }
  return out.join(';');
}

export function safeEmailHtml(html) {
  try {
    if (html === null || html === undefined || String(html).trim() === '') return '';
    if (typeof DOMParser === 'undefined') return '';                          // no inert parser available → fail closed
    const src = new DOMParser().parseFromString(`<body>${String(html)}</body>`, 'text/html');   // INERT: nothing executes or loads
    const doc = document.implementation.createHTMLDocument('');               // a second inert document to build the clean tree in
    const root = doc.createElement('div');
    let count = 0;

    const walk = (from, into, depth) => {
      for (const node of Array.from(from.childNodes)) {
        if (++count > MAX_NODES) throw new Error('too large');
        if (node.nodeType === 3) { into.appendChild(doc.createTextNode(node.nodeValue)); continue; }
        if (node.nodeType !== 1) continue;                                   // comments, processing instructions, … are dropped
        const tag = node.tagName.toUpperCase();
        if (DROP.has(tag) || depth > MAX_DEPTH) continue;
        if (!ALLOWED.has(tag)) { walk(node, into, depth + 1); continue; }   // unknown wrapper: keep its text, drop the tag
        if (tag === 'IMG' && !IMG_OK.test((node.getAttribute('src') || '').trim())) continue;
        if (tag === 'A' && !LINK_OK.test((node.getAttribute('href') || '').trim())) { walk(node, into, depth + 1); continue; }

        const el = doc.createElement(tag.toLowerCase());
        const style = node.getAttribute('style');
        if (style) { const s = cleanStyle(style); if (s) el.setAttribute('style', s); }
        const cls = (node.getAttribute('class') || '').split(/\s+/).filter((c) => /^ql-indent-[1-8]$/.test(c));
        if (cls.length) el.setAttribute('class', cls.join(' '));
        for (const name of ATTRS[tag] || []) {
          const v = node.getAttribute(name);
          if (v !== null && v.length <= 2048) el.setAttribute(name, name === 'href' || name === 'src' ? v.trim() : v);
        }
        if (tag === 'A') { el.setAttribute('rel', 'noopener noreferrer nofollow'); el.setAttribute('target', '_blank'); }
        walk(node, el, depth + 1);
        into.appendChild(el);
      }
    };
    walk(src.body, root, 0);
    return root.innerHTML;
  } catch (e) {
    return '';                                                                // fail CLOSED
  }
}
