// LOCATION: src/components/RichComposer.jsx
//
// The professional composer for the EXISTING message centers (Admin ↔ Investor, Financial ↔ Investor incl. broadcasts, investor replies,
// Admin ↔ Financial staff channel) and — with variant="email" — the Admin/Financial Email Center.
//
//  • Full toolbar: font family & size, bold/italic/underline/strike, text colour & highlight, alignment, bulleted/numbered lists, indent,
//    line spacing, paragraph spacing, hyperlinks, undo/redo, clear formatting. variant="email" adds headings and images.
//  • An explicit SEND button. Ctrl+Enter (⌘+Enter on Mac) sends. Enter and Shift+Enter both start a new line: Quill 1.x has no separate
//    "soft break", so each line is a paragraph and "Para spacing" controls the gap between lines. The old "Enter sends" behaviour is gone.
//  • Self-contained: it registers the SAME inline-style formats as MarvflowRichEditor (so saved HTML matches the server allow-list and looks the
//    same everywhere) but does not import or modify that file — the MarvFlow messaging system stays untouched.
//
// Formatting here is convenience only. The server sanitises everything on write and again on read (RichTextSanitizer); this component is never
// the security boundary.
import { useMemo, useRef, useState, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';
import 'react-quill/dist/quill.snow.css';
import './MarvflowRichEditor.css';            // editor look (CSS only — no code shared with MarvFlow)
import './richMessage.css';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Verdana', 'Tahoma', 'Courier'];
const FONT_SIZES    = ['12px', '14px', '16px', '18px', '24px', '32px'];
const LINE_HEIGHTS  = ['1', '1.15', '1.5', '2', '2.5'];
const PARA_SPACING  = ['0px', '8px', '16px', '24px'];

export const PLAIN_LIMIT = 5000;                         // characters of plain text per message (as the channels already enforced)
export const IMAGE_MAX_BYTES = 700 * 1024;               // ≈ 930 KB once base64-encoded, under the server's 1 MB data-URI cap
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

let registered = false;
function registerFormats() {
  if (registered) return;
  const Parchment = Quill.import('parchment');
  const Font  = Quill.import('attributors/style/font');   Font.whitelist = FONT_FAMILIES;
  const Size  = Quill.import('attributors/style/size');   Size.whitelist = FONT_SIZES;
  const Align = Quill.import('attributors/style/align');
  const LineHeight  = new Parchment.Attributor.Style('lineheight', 'line-height',  { scope: Parchment.Scope.BLOCK, whitelist: LINE_HEIGHTS });
  const ParaSpacing = new Parchment.Attributor.Style('paraspacing', 'margin-bottom', { scope: Parchment.Scope.BLOCK, whitelist: PARA_SPACING });
  Quill.register(Font, true); Quill.register(Size, true); Quill.register(Align, true);
  Quill.register(LineHeight, true); Quill.register(ParaSpacing, true);
  const icons = Quill.import('ui/icons');
  icons.undo = '<span class="mfm-glyph" aria-hidden="true">↶</span>';
  icons.redo = '<span class="mfm-glyph" aria-hidden="true">↷</span>';
  registered = true;
}

const BASE_FORMATS  = ['font', 'size', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'align', 'list', 'indent', 'lineheight', 'paraspacing', 'link'];
const EMAIL_FORMATS = [...BASE_FORMATS, 'header', 'image'];

/** Image insertion: an https:// link, or (empty answer) a PNG/JPEG/GIF/WebP file ≤ 700 KB embedded in the email. Unsupported → a clear message. */
function imageHandler() {
  const quill = this.quill;
  const url = window.prompt('Image web address (must start with https://).\n\nLeave empty to upload an image file instead (PNG, JPEG, GIF or WebP, up to 700 KB).');
  if (url === null) return;

  const finish = (src) => {
    const alt = window.prompt('Short description of the image (shown by email programs that block images). Optional:') || '';
    const range = quill.getSelection(true);
    quill.insertEmbed(range.index, 'image', src, 'user');
    try { const [leaf] = quill.getLeaf(range.index + 1); if (alt && leaf?.domNode) leaf.domNode.setAttribute('alt', alt.slice(0, 200)); } catch { /* alt is optional */ }
    quill.setSelection(range.index + 1);
  };

  if (url.trim() !== '') {
    if (!/^https:\/\/[^\s"'<>]+$/i.test(url.trim())) { toast.error('Only https:// image links are supported.'); return; }
    finish(url.trim());
    return;
  }

  const input = document.createElement('input');
  input.type = 'file'; input.accept = IMAGE_TYPES.join(',');
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { toast.error('Only PNG, JPEG, GIF or WebP images can be added (no SVG).'); return; }
    if (file.size > IMAGE_MAX_BYTES) { toast.error('That image is larger than 700 KB. Please use a smaller image or an https:// image link.'); return; }
    const reader = new FileReader();
    reader.onload = () => finish(String(reader.result));
    reader.onerror = () => toast.error('The image could not be read.');
    reader.readAsDataURL(file);
  };
  input.click();
}

/**
 * @param value      current HTML (controlled)
 * @param onChange   (html, plainText)
 * @param onSend     called by the Send button and by Ctrl/⌘+Enter (parent does the request)
 * @param sending    request in flight → editor and button disabled
 * @param variant    'message' (default) | 'email'
 * @param limit      max characters of plain text (messages: 5,000; the email variant has none)
 * @param hideSend   render only the editor (used where the page already has its own submit area)
 */
export default function RichComposer({ value, onChange, onSend, sending = false, disabled = false, variant = 'message', placeholder = 'Write your message…',
                                       limit, sendLabel = 'Send', hideSend = false, footer = null, className = '' }) {
  registerFormats();
  const email = variant === 'email';
  const max = limit === undefined ? (email ? null : PLAIN_LIMIT) : limit;
  const [text, setText] = useState('');
  const wrapRef = useRef(null);
  const sendRef = useRef(onSend);
  sendRef.current = onSend;

  useEffect(() => { if (!value) setText(''); }, [value]);        // parent cleared the editor after a send

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ font: [false, ...FONT_FAMILIES] }, { size: [false, ...FONT_SIZES] }],
        ...(email ? [[{ header: [1, 2, 3, false] }]] : []),
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ lineheight: [false, ...LINE_HEIGHTS] }, { paraspacing: [false, ...PARA_SPACING] }],
        email ? ['link', 'image'] : ['link'],
        ['undo', 'redo', 'clean'],
      ],
      handlers: {
        undo() { this.quill.history.undo(); },
        redo() { this.quill.history.redo(); },
        ...(email ? { image: imageHandler } : {}),
      },
    },
    history: { delay: 600, maxStack: 200, userOnly: true },
  }), [email]);

  const over  = max !== null && text.length > max;
  const empty = email ? !value || value === '<p><br></p>' : text.trim() === '';
  const canSend = !sending && !disabled && !empty && !over;

  // Ctrl/⌘+Enter sends. Captured on the wrapper so it runs before Quill's own Enter handling (which would otherwise add a line).
  const onKeyDownCapture = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); e.stopPropagation();
      if (canSend && sendRef.current) sendRef.current();
    }
  };

  return (
    <div className={`rc ${className}`} ref={wrapRef} onKeyDownCapture={onKeyDownCapture}>
      <div className="mfm-editor">
        <ReactQuill
          theme="snow" value={value} readOnly={sending || disabled} placeholder={placeholder}
          modules={modules} formats={email ? EMAIL_FORMATS : BASE_FORMATS}
          onChange={(html, _d, _s, editor) => { const t = editor.getText().replace(/\n$/, ''); setText(t); onChange(html, t.trim()); }}
        />
      </div>
      {email && (
        <p className="rc__hint">
          Images: PNG, JPEG, GIF or WebP up to 700 KB, or an https:// link. Uploaded images are attached inline when the email is sent so Gmail and Outlook show them;
          linked images may be blocked by some email programs until the reader allows them, so add a short description. Links must start with https:// or mailto:
        </p>
      )}
      <div className="rc__foot">
        <span className={`rc__count${over ? ' rc__count--over' : ''}`} aria-live="polite">
          {max !== null ? `${text.length.toLocaleString()} / ${max.toLocaleString()} characters` : ''}
          {max !== null ? ' · ' : ''}Ctrl+Enter to send
        </span>
        {footer}
        {!hideSend && (
          <button type="button" className="btn btn-primary" onClick={() => canSend && onSend && onSend()} disabled={!canSend} style={{ minWidth: 120, minHeight: 40 }}>
            {sending ? <><span className="spinner" /> Sending…</> : <><FiSend size={14} /> {sendLabel}</>}
          </button>
        )}
      </div>
    </div>
  );
}
