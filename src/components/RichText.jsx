// LOCATION: src/components/RichText.jsx
//
// Displays one message. The ONLY place (besides the MarvFlow pages) that injects HTML:
//   • `html` present  → formatted message. The server has ALREADY sanitised it twice (on write and again on read); it is rendered as-is.
//   • otherwise       → the legacy plain-text `text`, rendered as TEXT (React escapes it) with its line breaks preserved.
import './richMessage.css';
import safeHtml from '../utils/safeHtml';

export default function RichText({ html, text, className = '' }) {
  if (html) return <div className={`rt-body ${className}`} dangerouslySetInnerHTML={{ __html: safeHtml(html) }} />;
  return <div className={`rt-body rt-plain ${className}`}>{text}</div>;
}
