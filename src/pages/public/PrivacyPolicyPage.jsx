import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/api';
import { SECTIONS, SUMMARY, PolicyBody, DraftNotice } from './privacyPolicyContent';
import './PrivacyPolicy.css';

// Content lives in ./privacyPolicyContent.jsx (shared with the registration
// dialog). Version / approval status come from the backend so this page, the
// registration checkbox and the stored acknowledgement always agree.

export default function PrivacyPolicyPage() {
  const [meta, setMeta] = useState(null);
  const [metaFailed, setMetaFailed] = useState(false);
  // Contents block starts open on desktop (sidebar) and collapsed on phones.
  const [tocOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900);

  useEffect(() => {
    document.title = 'Data Privacy Policy — Smart System Investment';
    let cancelled = false;
    authService.getPrivacyPolicy()
      .then(res => { if (!cancelled) setMeta(res.data); })
      .catch(() => { if (!cancelled) setMetaFailed(true); });
    return () => { cancelled = true; };
  }, []);

  // A draft unless the backend explicitly says approved (also when it can't be reached).
  const approved = !!meta?.approved;

  return (
    <div className="pub-page">
      <section className="pub-hero pub-hero--sm">
        <div className="pub-hero__overlay" />
        <div className="container pub-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Legal</div>
          <h1 className="pub-page-title">Data Privacy Policy</h1>
          <p className="pub-page-sub">
            {meta
              ? <>Version {meta.version}{meta.effective_date ? <> · Effective {meta.effective_date}</> : null}</>
              : metaFailed ? 'Version information is currently unavailable' : 'Loading version…'}
          </p>
        </div>
      </section>

      <section className="policy-section">
        <div className="container policy-layout">

          {/* Contents: sticky sidebar on desktop, collapsible block on mobile */}
          <aside className="policy-aside">
            <details className="policy-toc" open={tocOpen}>
              <summary className="policy-toc__title">On this page</summary>
              <nav aria-label="Policy sections">
                <ol>
                  {SECTIONS.map(s => (
                    <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
                  ))}
                </ol>
              </nav>
            </details>
          </aside>

          <div className="policy-main">
            <DraftNotice approved={approved} />

            <div className="policy-glance" aria-labelledby="glance-h">
              <h2 id="glance-h" className="policy-glance__title">The short version</h2>
              <div className="policy-glance__grid">
                {SUMMARY.map(item => (
                  <a key={item.key} className="policy-glance__card" href={`#${item.anchor}`}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                    <em>Read more →</em>
                  </a>
                ))}
              </div>
              <p className="policy-glance__note">
                This summary is for convenience. The full policy below is the complete statement.
              </p>
            </div>

            <PolicyBody />

            <p className="policy-back">
              <Link to="/register">Go to registration</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
