// TASK 3 — public contact form and newsletter sign-up. NEW FILE; not mounted anywhere automatically.
// Usage:  import { PublicContactForm, NewsletterSignup } from './MailingForms';   <PublicContactForm />  /  <NewsletterSignup />
import { useState } from 'react';
import toast from 'react-hot-toast';
import { publicMailing } from '../../services/mailingApi';

const err = (e) => { const d = e?.response?.data; return e?.response?.status === 429 ? 'Too many requests. Please try again later.' : (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || 'Could not send. Please try again.'; };

export function PublicContactForm() {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', subscribe_newsletter: false, website: '' });
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true);
    try { await publicMailing.contact(f); setDone(true); } catch (x) { toast.error(err(x)); } finally { setBusy(false); }
  };
  if (done) return <div className="adm-card"><h3>Thank you</h3><p>Your message has been received. We will reply by email.</p></div>;
  return (
    <form onSubmit={submit} className="ml-form">
      <div className="form-group"><label className="form-label">Your name</label><input className="form-control" required maxLength={120} value={f.name} onChange={set('name')} /></div>
      <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-control" required maxLength={190} value={f.email} onChange={set('email')} /></div>
      <div className="form-group"><label className="form-label">Subject</label><input className="form-control" maxLength={150} value={f.subject} onChange={set('subject')} /></div>
      <div className="form-group"><label className="form-label">Message</label><textarea className="form-control" rows={6} required minLength={10} maxLength={5000} value={f.message} onChange={set('message')} /></div>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
      <label style={{ fontSize: '.85rem' }}><input type="checkbox" checked={f.subscribe_newsletter} onChange={set('subscribe_newsletter')} /> Also send me the SSI newsletter (you will be asked to confirm by email; unsubscribe any time).</label>
      <p className="ml-muted">Please do not include passwords or PINs. We use your details only to answer your enquiry.</p>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

export function NewsletterSignup() {
  const [email, setEmail] = useState(''); const [website, setWebsite] = useState(''); const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { const r = await publicMailing.subscribe({ email, website, purposes: ['public_newsletter'] }); setMsg(r.data.message); setEmail(''); } catch (x) { toast.error(err(x)); }
  };
  return (
    <form onSubmit={submit} className="ml-form">
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <input type="email" required className="form-control" style={{ flex: 1, minWidth: 220 }} placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} />
        <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></div>
        <button className="btn btn-primary">Subscribe</button>
      </div>
      {msg && <p className="ml-muted">{msg}</p>}
    </form>
  );
}
