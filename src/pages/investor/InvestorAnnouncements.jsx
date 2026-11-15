// LOCATION: src/pages/investor/InvestorAnnouncements.jsx
//
// News & Information Centre — investor-facing feed + detail view.
// Extends the original announcements page rather than replacing it;
// routed at /investor/announcements and /investor/announcements/:slug (see App.jsx); /investor/news is the Task 4 News & Updates module.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiStar, FiCalendar } from 'react-icons/fi';
import { investorService } from '../../services/api';
import toast from 'react-hot-toast';
import './InvestorPages.css';

const CATEGORY_META = {
  company_announcement:  { icon: '📢', label: 'Company Announcement' },
  platform_update:       { icon: '🛠️', label: 'Platform Update'       },
  important_notice:      { icon: '⚠️', label: 'Important Notice'      },
  investor_information:  { icon: 'ℹ️', label: 'Investor Information'  },
  project_update:        { icon: '📈', label: 'Project Update'        },
  general_communication: { icon: '💬', label: 'General'                },
  financial_notice:      { icon: '💼', label: 'Financial Team Notice' },
  other:                 { icon: '📄', label: 'Other'                  },
};

function NewsDetail({ slug }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    investorService.getAnnouncement(slug)
      .then(res => setItem(res.data.announcement))
      .catch(() => toast.error('This news item is unavailable.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="inv-loading">Loading…</div>;
  if (!item) return (
    <div className="inv-card">
      <div className="inv-empty-state"><p>This news item could not be found.</p></div>
    </div>
  );

  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/investor/announcements')} style={{ marginBottom: '1rem' }}>
        <FiArrowLeft size={14} /> Back to News
      </button>

      <div className="inv-card">
        {item.image_url && (
          <div className="news-detail-hero"><img src={item.image_url} alt={item.title} /></div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-info">{meta.icon} {meta.label}</span>
          {item.is_featured && <span className="badge" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}><FiStar size={11} style={{ marginRight: 4 }} />Featured</span>}
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.5rem' }}>{item.title}</h1>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '1.25rem' }}>
          <FiCalendar size={13} /> {item.time_ago} · {item.author}
        </div>
        <div style={{ fontSize: '0.92rem', color: 'var(--gray-600)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {item.content}
        </div>
      </div>
    </div>
  );
}

function NewsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    investorService.getAnnouncements()
      .then(res => setItems(res.data?.announcements || []))
      .catch(() => toast.error('Failed to load news'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = category ? items.filter(a => a.category === category) : items;
  const featured = filtered.filter(a => a.is_featured);
  const rest = filtered.filter(a => !a.is_featured);

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div>
          <h1>News &amp; Information</h1>
          <p>Company announcements, platform updates, and important notices</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button onClick={() => setCategory('')} className={`btn btn-sm ${!category ? 'btn-primary' : 'btn-ghost'}`}>All</button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button key={key} onClick={() => setCategory(key)} className={`btn btn-sm ${category === key ? 'btn-primary' : 'btn-ghost'}`}>
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="inv-loading">Loading news…</div>
      ) : filtered.length === 0 ? (
        <div className="inv-card"><div className="inv-empty-state"><p>No news items yet.</p></div></div>
      ) : (
        <>
          {featured.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <FiStar size={13} style={{ marginRight: 5, verticalAlign: -2 }} /> Featured
              </h3>
              <div className="news-grid-inv">
                {featured.map(a => <NewsCard key={a.id} item={a} onClick={() => navigate(`/investor/announcements/${a.slug}`)} />)}
              </div>
            </div>
          )}
          <div className="news-grid-inv">
            {rest.map(a => <NewsCard key={a.id} item={a} onClick={() => navigate(`/investor/announcements/${a.slug}`)} />)}
          </div>
        </>
      )}
    </div>
  );
}

function NewsCard({ item, onClick }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
  return (
    <div className="news-card-inv" onClick={onClick}>
      {item.image_url && (
        <div className="news-card-inv__image"><img src={item.image_url} alt={item.title} /></div>
      )}
      <div className="news-card-inv__body">
        <span className="badge badge-info" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>{meta.icon} {meta.label}</span>
        <div className="news-card-inv__title">{item.title}</div>
        <div className="news-card-inv__summary">{typeof item.summary === 'string' ? item.summary : ''}</div>
        <small style={{ fontSize: '0.72rem', color: 'var(--gray-300)' }}>{item.time_ago}</small>
      </div>
    </div>
  );
}

export default function InvestorAnnouncements() {
  const { slug } = useParams();
  return slug ? <NewsDetail slug={slug} /> : <NewsList />;
}
