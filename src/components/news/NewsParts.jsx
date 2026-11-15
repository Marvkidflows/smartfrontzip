// TASK 4 — shared presentation pieces for the public site and the investor dashboard.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import safeHtml from '../../utils/safeHtml';
import './news.css';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export function NewsCard({ a, to, featured }) {
  return (
    <Link to={to} className={`nw-card ${featured ? 'nw-feature' : ''}`}>
      <div className="nw-card__img">
        {a.cover?.url && <img src={a.cover.url} alt={a.cover.alt || a.title} loading="lazy" />}
        {a.has_video && <span className="nw-card__play">▶ Video</span>}
      </div>
      <div className="nw-card__body">
        <div className="nw-card__meta">
          {a.category && <span className="nw-badge">{a.category.name}</span>}
          {a.visibility === 'investor' && <span className="nw-badge investor">Investors</span>}
          <span>{fmtDate(a.published_at)}</span>
        </div>
        <h3>{a.title}</h3>
        {a.summary && <p>{a.summary}</p>}
      </div>
    </Link>
  );
}

// Video: uploaded file → native <video>; embed → sandboxed iframe whose URL was rebuilt by the server from provider + id.
export function NewsVideo({ video }) {
  if (!video) return null;
  return (
    <div className="nw-video">
      {video.embed_url
        ? <iframe src={video.embed_url} title={video.caption || 'Video'} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation" />
        : <video src={video.url} controls preload="metadata" playsInline />}
    </div>
  );
}

// Generic feed: `service.list(params)`, cards link to `${basePath}/${slug}`.
export function NewsFeed({ service, categories = [], basePath, title, intro }) {
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1); const [category, setCategory] = useState(''); const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    service.list({ page, category: category || undefined, q: q || undefined })
      .then(r => { setRows(r.data.data || []); setMeta(r.data); })
      .catch(() => setError('Could not load news right now. Please try again.')).finally(() => setLoading(false));
  }, [service, page, category, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { setPage(1); }, [category, q]);

  return (
    <div className="nw-wrap">
      <div className="nw-head"><h1>{title}</h1>{intro && <p>{intro}</p>}</div>
      <div className="nw-filters">
        <button className={`nw-chip ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>All</button>
        {categories.map(c => <button key={c.slug} className={`nw-chip ${category === c.slug ? 'active' : ''}`} onClick={() => setCategory(c.slug)}>{c.name}</button>)}
        <input className="form-control nw-search" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {error && <div className="nw-empty">{error}</div>}
      {!error && !loading && rows.length === 0 && <div className="nw-empty">Nothing published here yet.</div>}
      <div className="nw-grid">{rows.map((a, i) => <NewsCard key={a.id} a={a} to={`${basePath}/${a.slug}`} featured={a.is_featured && i === 0 && page === 1} />)}</div>
      {meta && meta.last_page > 1 && (
        <div className="nw-pager">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {meta.current_page} of {meta.last_page}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
        </div>)}
    </div>
  );
}

export function NewsArticleView({ service, slug, backTo }) {
  const [a, setA] = useState(null); const [state, setState] = useState('loading');
  useEffect(() => {
    setState('loading');
    service.article(slug).then(r => { setA(r.data.article); setState('ok'); }).catch(e => setState(e?.response?.status === 404 ? 'missing' : 'error'));
  }, [service, slug]);
  if (state === 'loading') return <div className="nw-wrap nw-empty">Loading…</div>;
  if (state !== 'ok') return <div className="nw-wrap nw-empty">{state === 'missing' ? 'This article is not available.' : 'Could not load this article.'}<br /><Link className="nw-back" to={backTo}>← Back to news</Link></div>;
  return (
    <div className="nw-wrap"><article className="nw-article">
      <Link className="nw-back" to={backTo}>← Back to news</Link>
      <div className="nw-card__meta">{a.category && <span className="nw-badge">{a.category.name}</span>}{a.visibility === 'investor' && <span className="nw-badge investor">Investors</span>}<span>{fmtDate(a.published_at)}</span><span>By {a.author_name}</span></div>
      <h1>{a.title}</h1>
      {a.summary && <p style={{ fontSize: '1.1rem', color: '#475569' }}>{a.summary}</p>}
      {a.cover?.url && <img className="nw-article__cover" src={a.cover.url} alt={a.cover.alt || a.title} />}
      <NewsVideo video={a.video} />
      <div className="nw-body" dangerouslySetInnerHTML={{ __html: safeHtml(a.body || '') }} />
    </article></div>
  );
}
