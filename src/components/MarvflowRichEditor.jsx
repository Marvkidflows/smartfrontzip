// LOCATION: src/components/MarvflowRichEditor.jsx
//
// Professional rich-text editor for MarvFlow → SSI email. Reuses the project's existing `react-quill` (Quill 1.3.7, as
// the Email Center does) — no new editor library. It extends the stock toolbar with everything Management asked for:
// font family & size, bold/italic/underline/strikethrough, text colour & highlight, alignment, bulleted/numbered lists,
// indentation, line & paragraph spacing, hyperlinks, undo/redo and clear-formatting. Formatting applies to the message
// BODY only: the recipient and subject are ordinary form fields outside this component.
//
// Every format is stored as an INLINE STYLE (or the editor's own `ql-indent-N` class) so a message looks identical
// wherever it is displayed, and so it matches the server allow-list exactly (RichTextSanitizer). The server still
// sanitises everything — this component is convenience, never security.
import { useMemo, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import 'react-quill/dist/quill.snow.css';
import './MarvflowRichEditor.css';

export const FONT_FAMILIES = ['Arial', 'Georgia', 'Verdana', 'Tahoma', 'Courier'];
export const FONT_SIZES    = ['12px', '14px', '16px', '18px', '24px', '32px'];
export const LINE_HEIGHTS  = ['1', '1.15', '1.5', '2', '2.5'];
export const PARA_SPACING  = ['0px', '8px', '16px', '24px'];

let registered = false;
function registerFormats() {
  if (registered) return;
  const Parchment = Quill.import('parchment');

  // Quill defaults font/size/align to CSS CLASSES; switch them to inline styles so the saved HTML is self-contained.
  const Font = Quill.import('attributors/style/font');           // font-family: Georgia
  Font.whitelist = FONT_FAMILIES;
  const Size = Quill.import('attributors/style/size');           // font-size: 14px
  Size.whitelist = FONT_SIZES;
  const Align = Quill.import('attributors/style/align');         // text-align: center
  const LineHeight  = new Parchment.Attributor.Style('lineheight', 'line-height',  { scope: Parchment.Scope.BLOCK, whitelist: LINE_HEIGHTS });
  const ParaSpacing = new Parchment.Attributor.Style('paraspacing', 'margin-bottom', { scope: Parchment.Scope.BLOCK, whitelist: PARA_SPACING });

  Quill.register(Font, true);
  Quill.register(Size, true);
  Quill.register(Align, true);
  Quill.register(LineHeight, true);
  Quill.register(ParaSpacing, true);

  // Colour/highlight (inline styles) and indent (ql-indent-N class) already behave the way the server expects.
  // Toolbar icons for the two custom buttons:
  const icons = Quill.import('ui/icons');
  icons.undo = '<span class="mfm-glyph" aria-hidden="true">↶</span>';
  icons.redo = '<span class="mfm-glyph" aria-hidden="true">↷</span>';
  registered = true;
}

const FORMATS = ['font', 'size', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'align', 'list', 'indent', 'lineheight', 'paraspacing', 'link'];

/**
 * @param value     current HTML
 * @param onChange  (html, plainText) — plainText lets the page know whether the message is really empty
 */
export default function MarvflowRichEditor({ value, onChange, disabled = false, placeholder = 'Write your message…' }) {
  registerFormats();
  const [expanded, setExpanded] = useState(false);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        // `false` = the "Default" entry (no format). Without it Quill shows the FIRST value as if it were already applied.
        [{ font: [false, ...FONT_FAMILIES] }, { size: [false, ...FONT_SIZES] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ lineheight: [false, ...LINE_HEIGHTS] }, { paraspacing: [false, ...PARA_SPACING] }],
        ['link'],
        ['undo', 'redo', 'clean'],
      ],
      handlers: {
        undo() { this.quill.history.undo(); },
        redo() { this.quill.history.redo(); },
      },
    },
    history: { delay: 600, maxStack: 200, userOnly: true },
  }), []);

  return (
    <div className={`mfm-editor${expanded ? ' mfm-editor--expanded' : ''}`}>
      <ReactQuill
        theme="snow" value={value} readOnly={disabled} placeholder={placeholder}
        modules={modules} formats={FORMATS}
        onChange={(html, _delta, _source, editor) => onChange(html, editor.getText().trim())}
      />
      <div className="mfm-editor__foot">
        <span>Links must start with https:// or mailto:</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded((e) => !e)} aria-pressed={expanded}
          aria-label={expanded ? 'Collapse the editor' : 'Expand the editor'} style={{ minHeight: 36 }}>
          {expanded ? <><FiMinimize2 size={13} /> Collapse</> : <><FiMaximize2 size={13} /> Expand</>}
        </button>
      </div>
    </div>
  );
}
