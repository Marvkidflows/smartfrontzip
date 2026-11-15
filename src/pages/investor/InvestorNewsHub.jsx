// INTEGRATION WRAPPER (Tasks 2-5 merge). One investor news experience at /investor/news.
//   • feed and articles  -> the Task 4 News & Updates module (server-side audience rules: public + members, plus investor-only for verified investors)
//   • a slug that the new module does not know -> the original announcements page at /investor/announcements/:slug (old links keep working)
//   • /investor/updates[/:slug] (Task 4's own path) -> redirected here, so there is no second feed
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { investorNews, publicNews } from '../../services/newsApi';
import { NewsFeed, NewsArticleView } from '../../components/news/NewsParts';

export function UpdatesRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/investor/news/${encodeURIComponent(slug || '')}`} replace />;
}

export default function InvestorNewsHub() {
  const { slug } = useParams();
  const [cats, setCats] = useState([]);
  const [legacy, setLegacy] = useState(false);

  useEffect(() => { publicNews.categories().then(r => setCats(r.data.categories)).catch(() => {}); }, []);
  useEffect(() => { setLegacy(false); }, [slug]);

  // Same shape NewsArticleView expects; on a 404 the slug may belong to an original announcement, so hand over to the legacy page.
  const service = useMemo(() => ({
    article: (s) => investorNews.article(s).catch((err) => {
      if (err?.response?.status === 404) setLegacy(true);
      throw err;
    }),
  }), []);

  if (slug && legacy) return <Navigate to={`/investor/announcements/${encodeURIComponent(slug)}`} replace />;
  if (slug) return <NewsArticleView service={service} slug={slug} backTo="/investor/news" />;

  return (
    <>
      <NewsFeed service={investorNews} categories={cats} basePath="/investor/news" title="News & Updates"
        intro="Company updates, market information, educational content and notices for investors." />
      <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: '1rem 0 2rem' }}>
        Looking for an earlier company announcement? <Link to="/investor/announcements">View the announcements archive</Link>
      </p>
    </>
  );
}
