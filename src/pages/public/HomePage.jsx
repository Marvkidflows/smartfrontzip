import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiShield, FiTrendingUp, FiUsers, FiPhone, FiTrendingDown, FiPieChart, FiTarget } from 'react-icons/fi';
import { marketService, publicPlanService } from '../../services/api';
import './HomePage.css';

const PLAN_COLORS = ['var(--royal)', 'var(--gold)', '#8B5CF6', '#0EA5E9', '#EC4899'];

const STATS = [
  { value: '$4.7B+', label: 'Assets Under Management' },
  { value: '12K+',  label: 'Active Investors'        },
  { value: '7+',    label: 'Years Operating'          },
  { value: '14%',   label: 'Avg. Annual Return'       },
];

const TESTIMONIALS = [
  {
    name: 'John Davidson', role: 'Professional Tier Investor', stars: 5,
    quote: 'I started with the Starter plan and within 6 months, I\'ve grown my portfolio significantly. The platform is incredibly professional and the support is outstanding!',
  },
  {
    name: 'Sarah Martinez', role: 'Elite Tier Investor', stars: 5,
    quote: 'The daily tasks feature is genius! I earn extra income just by spending 10 minutes a day. My returns have consistently exceeded my expectations.',
  },
  {
    name: 'Michael Kim', role: 'Professional Tier Investor', stars: 5,
    quote: 'As a busy professional, I needed a hands-off investment solution. Smart System delivers exactly that. The AI trading handles everything while I watch my wealth grow.',
  },
];

const FAQS = [
  {
    q: 'How does Smart System generate returns?',
    a: 'Investors choose from fixed-term investment plans, each with a set minimum, duration, and total return that\u2019s clearly shown before you invest. See our Plans page for current terms.',
  },
  {
    q: 'What is the minimum investment amount?',
    a: 'Minimums vary by plan \u2014 see our Plans page for current amounts and terms across all available tiers.',
  },
  {
    q: 'Can I withdraw my funds anytime?',
    a: 'Yes! You can request a withdrawal at any time from your dashboard. Requests are reviewed and processed by our team.',
  },
  {
    q: 'Is my investment secure?',
    a: 'Security is our top priority. We use bank-level encryption, cold storage for crypto assets, and are fully regulated by international financial authorities.',
  },
  {
    q: 'What are daily tasks and how do they work?',
    a: 'Daily tasks are simple activities like checking market updates or completing educational modules. Each takes a few minutes and earns you bonus rewards on top of your regular returns.',
  },
];

function CounterCard({ value, label }) {
  return (
    <div className="stat-card-home">
      <div className="stat-num">{value}</div>
      <div className="stat-dot" />
      <div className="stat-label-home">{label}</div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useRef ? [false, () => {}] : [false, () => {}];
  // simple local state via a small trick
  const ref = useRef(null);
  const toggle = () => {
    const el = ref.current;
    el.classList.toggle('faq-open');
  };
  return (
    <div className="faq-item-home" ref={ref}>
      <button className="faq-q" onClick={toggle}>
        {q} <span className="faq-icon-home">+</span>
      </button>
      <div className="faq-a">{a}</div>
    </div>
  );
}

function fmtUsd(n) {
  if (n == null) return '—';
  return n >= 1
    ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : `$${Number(n).toPrecision(4)}`;
}

export default function HomePage() {
  // Live market snapshot for the homepage teaser — real data via our own
  // /market endpoint (see MarketController), not fabricated. Fails
  // silently to an empty state on the homepage rather than showing an
  // error banner on the first thing a visitor sees.
  const [marketPreview, setMarketPreview] = useState([]);
  const [marketStatus, setMarketStatus] = useState('loading');

  useEffect(() => {
    marketService.getAssets({ limit: 4 })
      .then(res => { setMarketPreview(res.data.assets || []); setMarketStatus('ready'); })
      .catch(() => setMarketStatus('error'));
  }, []);

  // Real, live-configured plans — same fix as PlansPage (see that file's
  // comment). Do not go back to a hardcoded array here.
  const [plans, setPlans] = useState([]);
  const [plansStatus, setPlansStatus] = useState('loading');

  useEffect(() => {
    publicPlanService.getPlans()
      .then(res => { setPlans(res.data.plans || []); setPlansStatus('ready'); })
      .catch(() => setPlansStatus('error'));
  }, []);

  return (
    <div className="home-page">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero__overlay" />
        <div className="container hero__inner">
          <div className="hero__left fade-up">
            <div className="hero__badge">
              <span className="hero__pulse" />
              Trusted by 10,000+ Investors Worldwide
            </div>
            <h1 className="hero__title">
              Realize Your Potential With the{' '}
              <em>Right Investment</em>
            </h1>
            <p className="hero__sub">
              Discover high-quality investment opportunities designed to support your financial growth. From starter plans to elite strategies — we have the perfect solution for every investor.
            </p>
            <div className="hero__actions">
              <Link to="/register" className="btn btn-gold btn-lg">
                Get Started <FiArrowRight />
              </Link>
              <div className="hero__social">
                <div className="hero__avatars">
                  {['JD','SM','MK'].map(i => (
                    <div key={i} className="hero__avatar">{i[0]}</div>
                  ))}
                </div>
                <div>
                  <div style={{ color:'#FBBF24', fontSize:'0.85rem' }}>⭐⭐⭐⭐⭐</div>
                  <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>1.5k+ Reviews</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero__right">
            <div className="hero__cards">
              <div className="float-card fc-1">
                <div className="fc-label">Daily Returns</div>
                <div className="fc-value">+$127.50</div>
                <div className="fc-change fc-up">↑ 2.5% from yesterday</div>
              </div>
              <div className="float-card fc-2">
                <div className="fc-label">Total Earnings</div>
                <div className="fc-value fc-gold">$5,420</div>
                <div className="fc-change">Since Jan 2025</div>
              </div>
              <div className="float-card fc-3">
                <div className="fc-label">Active Plans</div>
                <div className="fc-value">20</div>
                <div className="fc-change">Currently active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="stats-bar-home">
        <div className="container">
          <div className="stats-grid-home">
            {STATS.map(s => <CounterCard key={s.label} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="about-strip">
        <div className="container">
          <div className="about-strip__inner">
            <div className="about-strip__left">
              <div className="section-eyebrow">About Smart System</div>
              <h2 className="home-section-title">Leading the Way in<br /><em>Investment Excellence</em></h2>
              <p>Since 2018, Smart System Investment has been at the forefront of innovative investment solutions. We combine cutting-edge technology with proven strategies to deliver exceptional returns for our clients across 256+ countries.</p>
              <ul className="about-strip__list">
                <li><FiShield /> <span><strong>SEC Regulated & Licensed</strong> – Fully compliant with international financial regulations</span></li>
                <li><FiTrendingUp /> <span><strong>Proven Track Record</strong> – Consistent returns and satisfied investors worldwide</span></li>
                <li><FiUsers /> <span><strong>Expert Management Team</strong> – 150+ investment professionals with decades of experience</span></li>
              </ul>
              <Link to="/about" className="btn btn-outline">Learn More About Us <FiArrowRight /></Link>
            </div>
            <div className="about-strip__right">
              <div className="about-img-wrap">
                <img src="https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&q=80" alt="Professional team" />
                <div className="about-badge">
                  <span>📊</span>
                  <div>
                    <strong>$4.7B+</strong>
                    <small>Assets Under Management</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div className="section-eyebrow">Simple Process</div>
            <h2 className="home-section-title">How It Works</h2>
            <p style={{ color:'var(--gray-500)', maxWidth:'520px', margin:'0 auto' }}>Get started with Smart System Investment in six simple steps</p>
          </div>
          <div className="how-steps">
            {[
              { n:1, title:'Create Your Account',                          desc:'Register securely using your personal information and create your Smart System Investment account, with access to your dashboard and available services.' },
              { n:2, title:'Set Up Your Account',                          desc:'Complete your profile and provide the required information to properly configure and activate your account.' },
              { n:3, title:'Make a Deposit',                               desc:'Fund your account through one of the supported payment methods and see the transaction reflected once confirmed.' },
              { n:4, title:'Meet Your Investment Manager',                 desc:'Connect with your designated representative for guidance throughout the investment process.' },
              { n:5, title:'Create Your Investment Plan',                  desc:'Review the available plans and select the option that fits your investment objectives.' },
              { n:6, title:'Complete Daily Tasks & Monitor Your Account',  desc:'Check your dashboard regularly to complete tasks and track your account performance and plan status.' },
            ].map((s, i) => (
              <div key={s.n} className="how-step">
                <div className="how-step__num">{s.n}</div>
                {i % 3 !== 2 && <div className="how-step__line" />}
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARKET + PREDICTIONS ── */}
      <section className="platform-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div className="section-eyebrow">Beyond Investing</div>
            <h2 className="home-section-title">Market Data & Prediction Activity</h2>
            <p style={{ color:'var(--gray-500)', maxWidth:'560px', margin:'0 auto' }}>
              Track real market movement and take part in our points-based prediction activity —
              both included alongside your investment account.
            </p>
          </div>

          <div className="platform-grid">
            {/* Market card — real live data, public, no login required */}
            <div className="platform-card">
              <div className="platform-card__head">
                <div className="platform-card__icon"><FiPieChart size={20} /></div>
                <div>
                  <h3>Live Market</h3>
                  <p>Real-time reference prices for major assets — for information only, not a trading venue.</p>
                </div>
              </div>

              {marketStatus === 'ready' && marketPreview.length > 0 && (
                <div className="platform-market-list">
                  {marketPreview.map(a => (
                    <div key={a.id} className="platform-market-row">
                      <span className="platform-market-row__name">{a.symbol}</span>
                      <span className="platform-market-row__price">{fmtUsd(a.price_usd)}</span>
                      <span className={`platform-market-row__chg ${a.change_24h_pct >= 0 ? 'up' : 'down'}`}>
                        {a.change_24h_pct != null ? (
                          <>{a.change_24h_pct >= 0 ? <FiTrendingUp size={12}/> : <FiTrendingDown size={12}/>} {Math.abs(a.change_24h_pct).toFixed(1)}%</>
                        ) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {marketStatus === 'loading' && (
                <div className="platform-market-placeholder">Loading live prices…</div>
              )}
              {marketStatus === 'error' && (
                <div className="platform-market-placeholder">Market data temporarily unavailable.</div>
              )}

              <Link to="/market" className="btn btn-outline" style={{ width:'100%', justifyContent:'center', marginTop:'1.25rem' }}>
                View Live Market <FiArrowRight />
              </Link>
            </div>

            {/* Gaming & Prediction card — gated feature, teaser only, no fake numbers */}
            <div className="platform-card">
              <div className="platform-card__head">
                <div className="platform-card__icon platform-card__icon--gold"><FiTarget size={20} /></div>
                <div>
                  <h3>Gaming & Prediction</h3>
                  <p>Predict fixture outcomes from top leagues and earn points — no investment required.</p>
                </div>
              </div>

              <ul className="platform-feature-list">
                <li><FiCheckCircle /> Fixtures from top leagues only</li>
                <li><FiCheckCircle /> 1X2, Double Chance, Over/Under, and Handicap predictions</li>
                <li><FiCheckCircle /> Free to play — no investment or wallet balance needed</li>
              </ul>

              <Link to="/register" className="btn btn-gold" style={{ width:'100%', justifyContent:'center', marginTop:'1.25rem' }}>
                Register to Predict <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section className="plans-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div className="section-eyebrow">Investment Plans</div>
            <h2 className="home-section-title">Choose Your Perfect Plan</h2>
            <p style={{ color:'var(--gray-500)', maxWidth:'520px', margin:'0 auto' }}>Flexible investment tiers designed to match your financial goals and risk tolerance</p>
          </div>
          <div className="plans-grid">
            {plansStatus === 'loading' && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--gray-400)', padding:'2rem' }}>Loading plans…</div>
            )}
            {plansStatus === 'error' && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--gray-400)', padding:'2rem' }}>Couldn't load plans right now.</div>
            )}
            {plansStatus === 'ready' && plans.map((p, i) => (
              <div key={p.id} className={`plan-card ${p.is_featured ? 'plan-featured' : ''}`} style={{ '--pc': PLAN_COLORS[i % PLAN_COLORS.length] }}>
                {p.is_featured && <div className="plan-ribbon">Most Popular</div>}
                <div className="plan-card__header">
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                </div>
                <div className="plan-card__price">${p.min_amount.toLocaleString()} <span>minimum</span></div>
                <div className="plan-returns">{p.profit_percent}% total return</div>
                <div style={{ fontSize:'0.8rem', color:'var(--gray-400)', marginBottom:'1rem' }}>
                  Over {p.duration_months ? `${p.duration_months} months` : `${p.duration_days} days`}
                </div>
                <Link to="/register" className={`btn ${p.is_featured ? 'btn-gold' : 'btn-outline'} btn-lg`} style={{ width:'100%', justifyContent:'center' }}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div className="section-eyebrow">Success Stories</div>
            <h2 className="home-section-title">What Our Investors Say</h2>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testimonial-card">
                <div className="t-stars">{'⭐'.repeat(t.stars)}</div>
                <p className="t-quote">"{t.quote}"</p>
                <div className="t-author">
                  <div className="t-avatar">{t.name.split(' ').map(n=>n[0]).join('')}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section-home">
        <div className="container">
          <div className="faq-grid-home">
            <div>
              <div className="section-eyebrow">FAQ</div>
              <h2 className="home-section-title">Frequently Asked<br />Questions</h2>
              <p style={{ color:'var(--gray-500)', marginBottom:'2rem', lineHeight:1.8 }}>
                Everything you need to know. Can't find an answer? Contact our support team.
              </p>
              <Link to="/contact" className="btn btn-outline">Contact Support <FiArrowRight /></Link>
            </div>
            <div className="faq-items-home">
              {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-section__overlay" />
        <div className="container cta-inner">
          <h2>Ready to Start Your Investment Journey?</h2>
          <p>Join over 12,000 investors who are already building their financial future with Smart System Investment.</p>
          <div className="cta-btns">
            <Link to="/register" className="btn btn-gold btn-lg">
              Create Free Account <FiArrowRight />
            </Link>
            <Link to="/contact" className="btn btn-outline-white btn-lg">
              <FiPhone /> Talk to an Expert
            </Link>
          </div>
          <div className="cta-trust">
            {['No credit card required', 'Start with $1,000', 'Withdraw anytime'].map(t => (
              <span key={t}><FiCheckCircle /> {t}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}