// ── PLANS PAGE ────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import { publicPlanService } from '../../services/api';
import './PublicPages.css';

const PLAN_COLORS = ['var(--royal)', 'var(--gold)', '#8B5CF6', '#0EA5E9', '#EC4899'];

export function PlansPage() {
  // Real, live-configured plans — replaces the previous hardcoded
  // marketing copy, which quoted different names/minimums/rates than
  // what admins actually configure (see PublicPlanController). A
  // returning-percentage figure here is the ACTUAL total return over the
  // plan's duration, not a monthly-compounding claim — don't reintroduce
  // "X% Monthly" phrasing without confirming that's really how payouts work.
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    publicPlanService.getPlans()
      .then(res => { setPlans(res.data.plans || []); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="pub-page">
      <section className="pub-hero pub-hero--sm">
        <div className="pub-hero__overlay" />
        <div className="container pub-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent:'center' }}>Investment Plans</div>
          <h1 className="pub-page-title">Choose Your Perfect Plan</h1>
          <p className="pub-page-sub">Flexible investment tiers designed to match your financial goals and risk tolerance</p>
        </div>
      </section>

      <section style={{ padding:'5rem 0', background:'var(--gray-50)' }}>
        <div className="container">
          {status === 'loading' && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}>Loading plans…</div>
          )}

          {status === 'error' && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}>
              <FiAlertTriangle size={28} />
              <p style={{ marginTop:'0.5rem' }}>Couldn't load investment plans right now. Please try again shortly.</p>
            </div>
          )}

          {status === 'ready' && plans.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}>No investment plans are available right now.</div>
          )}

          {status === 'ready' && plans.length > 0 && (
            <div className="pub-plans-grid">
              {plans.map((p, i) => (
                <div key={p.id} className={`pub-plan-card ${p.is_featured ? 'pub-plan-featured' : ''}`}>
                  {p.is_featured && <div className="pub-plan-ribbon">Most Popular</div>}
                  <div className="pub-plan-top" style={{ '--pc': PLAN_COLORS[i % PLAN_COLORS.length] }}>
                    <h3>{p.name}</h3>
                    {p.description && <p>{p.description}</p>}
                  </div>
                  <div className="pub-plan-price">${p.min_amount.toLocaleString()} <span>minimum</span></div>
                  <div className="pub-plan-range">{p.max_amount ? `Up to $${p.max_amount.toLocaleString()}` : 'No maximum'}</div>
                  <div className="pub-plan-return">{p.profit_percent}% <span>total return</span></div>
                  <div className="pub-plan-duration">
                    📅 {p.duration_months ? `${p.duration_months}-month` : `${p.duration_days}-day`} investment period
                  </div>
                  <Link to="/register" className={`btn ${p.is_featured ? 'btn-gold' : 'btn-primary'} btn-lg`} style={{ width:'100%', justifyContent:'center', marginTop:'auto' }}>
                    Get Started <FiArrowRight />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* COMPARISON NOTE */}
          <div className="pub-plan-note">
            <h3>All plans include</h3>
            <div className="pub-plan-note__grid">
              {['256-bit SSL Security','Segregated Fund Protection','Real-time Dashboard','Mobile App Access','Email Support','Transparent Reporting'].map(f => (
                <div key={f} className="pub-plan-note__item"><FiCheckCircle style={{color:'var(--success)'}}/> {f}</div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── FAQ PAGE ──────────────────────────────────────────────────────────────────
const FAQS = [
  { cat:'Getting Started', items:[
    { q:'How do I create an account?', a:'Sign up in minutes at our registration page. Complete the 4-step process with your personal info, contact details, email/password, and optional referral code.' },
    { q:'What is the minimum investment?', a:'Minimums vary by plan — see our Plans page for current amounts and terms across all available tiers.' },
    { q:'How do I verify my account?', a:'Account verification happens automatically after completing registration. Email verification may be required depending on your region.' },
  ]},
  { cat:'Investments', items:[
    { q:'How does Smart System generate returns?', a:'Investors choose from fixed-term investment plans, each with a set minimum, duration, and total return that\u2019s clearly shown before you invest. See our Plans page for current terms.' },
    { q:'What are daily tasks?', a:'Daily tasks are simple activities like checking market updates or completing educational modules. Each earns bonus rewards on top of your regular returns.' },
    { q:'Can I have multiple investment plans?', a:'Yes! You can invest in multiple plans simultaneously to diversify your portfolio and maximize returns across different strategies.' },
  ]},
  { cat:'Deposits & Withdrawals', items:[
    { q:'What payment methods are accepted?', a:'We accept Bitcoin (BTC), Ethereum (ETH), USDT, and bank transfers. More methods are being added regularly.' },
    { q:'How long do deposits take to process?', a:'Deposits are reviewed by our team after you submit proof of payment. You\u2019ll receive a notification as soon as it\u2019s confirmed.' },
    { q:'Can I withdraw my funds anytime?', a:'Yes! You can request a withdrawal at any time from your dashboard. Requests are reviewed and processed by our team.' },
    { q:'Are there withdrawal fees?', a:'We do not currently charge a fee on withdrawals — you receive the full amount you request.' },
  ]},
  { cat:'Security', items:[
    { q:'Is my investment secure?', a:'Security is a top priority — we use bank-level 256-bit SSL encryption and strict account access controls to help keep your account and data safe.' },
    { q:'What happens if I lose my password?', a:'Use the "Forgot Password" link on the login page. A secure reset link will be sent to your registered email address.' },
  ]},
];

export function FaqPage() {
  return (
    <div className="pub-page">
      <section className="pub-hero pub-hero--sm">
        <div className="pub-hero__overlay" />
        <div className="container pub-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent:'center' }}>Help Center</div>
          <h1 className="pub-page-title">Frequently Asked Questions</h1>
          <p className="pub-page-sub">Find answers to common questions about our platform</p>
        </div>
      </section>

      <section style={{ padding:'5rem 0' }}>
        <div className="container" style={{ maxWidth:'860px' }}>
          {FAQS.map(cat => (
            <div key={cat.cat} className="faq-cat">
              <h2 className="faq-cat-title">{cat.cat}</h2>
              <div className="faq-items-pub">
                {cat.items.map(item => (
                  <details key={item.q} className="faq-details">
                    <summary className="faq-summary">{item.q} <span>+</span></summary>
                    <div className="faq-answer-pub">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
          <div className="faq-cta-box">
            <h3>Still have questions?</h3>
            <p>Our support team is ready to help you 24/7</p>
            <Link to="/contact" className="btn btn-primary">Contact Support <FiArrowRight /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── CONTACT PAGE ──────────────────────────────────────────────────────────────
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent! We\'ll respond within 24 hours.');
      setForm({ name:'', email:'', subject:'', message:'' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally { setSending(false); }
  };

  return (
    <div className="pub-page">
      <section className="pub-hero pub-hero--sm">
        <div className="pub-hero__overlay" />
        <div className="container pub-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent:'center' }}>Get In Touch</div>
          <h1 className="pub-page-title">Contact Us</h1>
          <p className="pub-page-sub">Our team is available 24/7 to assist you</p>
        </div>
      </section>

      <section style={{ padding:'5rem 0' }}>
        <div className="container">
          <div className="contact-grid">
            {/* FORM */}
            <div className="card">
              <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--navy)', marginBottom:'1.5rem' }}>Send Us a Message</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-control" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-control" required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="john@email.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" required value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="How can we help?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={6} required value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Tell us more about your inquiry…" style={{ resize:'vertical' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={sending}>
                  {sending ? <span className="spinner" /> : <><FiSend /> Send Message</>}
                </button>
              </form>
            </div>

            {/* INFO */}
            <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              {[
                { icon:FiMail,   title:'Email Us',      info:'support@smartsysteminvestmentglobal.com', sub:'Response within 2-4 hours' },
                { icon:FiPhone,  title:'Call Us',       info:'+1 (800) 123-4567', sub:'Mon–Fri, 9AM–6PM EST' }, // PLACEHOLDER — needs real number
                { icon:FiMapPin, title:'Visit Us',      info:'123 Finance Street, New York, NY 10001', sub:'By appointment only' }, // PLACEHOLDER — needs real address
              ].map(c => (
                <div key={c.title} className="card contact-info-card">
                  <div className="contact-info-icon"><c.icon size={20} /></div>
                  <div>
                    <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.35rem' }}>{c.title}</div>
                    <div style={{ fontSize:'0.95rem', fontWeight:600, color:'var(--navy)' }}>{c.info}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--gray-400)', marginTop:'0.2rem' }}>{c.sub}</div>
                  </div>
                </div>
              ))}

              <div className="card" style={{ background:'linear-gradient(135deg,var(--navy),var(--royal))', color:'white' }}>
                <h4 style={{ fontWeight:700, marginBottom:'0.75rem' }}>Quick Support</h4>
                <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.7)', lineHeight:1.7, marginBottom:'1rem' }}>
                  For urgent account issues, log in and use the in-app messaging system for the fastest response.
                </p>
                <Link to="/login" className="btn btn-gold btn-sm">Login to Support Portal</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
