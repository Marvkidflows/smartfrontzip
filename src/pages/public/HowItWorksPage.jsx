import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import './HowItWorksPage.css';

const STEPS = [
  {
    n: 1,
    title: 'Create Your Account',
    desc: 'Register securely using your personal information and create your Smart System Investment account. Your account provides access to your personal dashboard, account information, investment options, updates, and available services.',
    icon: '👤',
  },
  {
    n: 2,
    title: 'Set Up Your Account',
    desc: 'Complete your profile and provide the required information to properly configure and activate your account. Once completed, your dashboard will provide access to the features and activities available to you.',
    icon: '⚙️',
  },
  {
    n: 3,
    title: 'Make a Deposit',
    desc: 'Fund your account through one of the supported payment methods. Once your payment has been confirmed and processed, the relevant transaction details will be reflected in your account.',
    icon: '💳',
  },
  {
    n: 4,
    title: 'Meet Your Personal Investment Manager',
    desc: 'Connect with your designated investment representative for guidance throughout the investment process. Your representative can explain applicable procedures, account activities, and the terms associated with your selected investment options.',
    icon: '🧑\u200d💼',
  },
  {
    n: 5,
    title: 'Create Your Investment Plan',
    desc: 'Review the available investment plans and select the option applicable to your investment objectives and the terms provided. Your selected plan and relevant information will be accessible through your dashboard.',
    icon: '📈',
  },
  {
    n: 6,
    title: 'Complete Your Daily Tasks & Monitor Your Account',
    desc: 'Access your dashboard regularly to view assigned tasks, account activities, updates, and relevant investment information. Complete applicable tasks and monitor your account performance, transactions, and plan status directly through your dashboard.',
    icon: '📋',
  },
];

const FEATURES = [
  { icon: '🔒', title: 'Bank-Level Security', desc: '256-bit SSL encryption protects every transaction.' },
  { icon: '⚡', title: 'Fast Processing', desc: 'Deposits and withdrawals are reviewed promptly by our team, with status updates every step of the way.' },
  { icon: '📱', title: 'Mobile Access', desc: 'Monitor your investments from any device, anywhere.' },
  { icon: '🤝', title: '24/7 Support', desc: 'Our team is always available to assist you.' },
  { icon: '📊', title: 'Transparent Reporting', desc: 'Full visibility into your portfolio performance at all times.' },
  { icon: '🎯', title: 'Goal Tracking', desc: 'Set targets and track your progress toward financial freedom.' },
];

export default function HowItWorksPage() {
  return (
    <div className="how-page">
      {/* HERO */}
      <section className="how-hero">
        <div className="how-hero__overlay" />
        <div className="container how-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent:'center' }}>Simple Process</div>
          <h1 className="how-hero__title">How It Works</h1>
          <p className="how-hero__sub">Your investment journey in six simple steps — from creating your account to managing your investment activities, Smart System Investment provides a structured process designed to keep you informed at every stage.</p>
          <nav className="how-breadcrumb">
            <Link to="/">Home</Link> <span>/</span> <span>How It Works</span>
          </nav>
        </div>
      </section>

      {/* STEPS — 3x2 grid layout */}
      <section className="how-steps-section">
        <div className="container">
          <div className="how-steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.n} className="how-step-cell">
                <div className="how-step-card-v2">
                  <div className="how-step-badge-row">
                    <div className="how-step-icon-circle">{step.icon}</div>
                    <div className="how-step-num-badge">{String(step.n).padStart(2, '0')}</div>
                  </div>
                  <h3>{step.title}</h3>
                  <div className="how-step-title-rule" />
                  <p>{step.desc}</p>
                </div>
                {i % 3 !== 2 && <div className="how-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="how-features-section">
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <div className="section-eyebrow">Platform Features</div>
            <h2 className="how-section-title">Built for Serious Investors</h2>
          </div>
          <div className="how-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="how-feature-card">
                <div className="how-feature-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="how-cta">
        <div className="container how-cta__inner">
          <h2>Ready to Get Started?</h2>
          <p>Create your account in minutes and start your investment journey today.</p>
          <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/register" className="btn btn-gold btn-lg">Create Account <FiArrowRight /></Link>
            <Link to="/plans"    className="btn btn-outline-white btn-lg">View Plans</Link>
          </div>
        </div>
      </section>
    </div>
  );
}