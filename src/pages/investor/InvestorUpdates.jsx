// TASK 4 — News & Updates inside the investor dashboard (route /investor/updates and /investor/updates/:slug).
// The API decides which visibility levels this account may read (public + members, plus investor-only for verified investors).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { investorNews, publicNews } from '../../services/newsApi';
import { NewsFeed, NewsArticleView } from '../../components/news/NewsParts';

export default function InvestorUpdates() {
  const { slug } = useParams();
  const [cats, setCats] = useState([]);
  useEffect(() => { publicNews.categories().then(r => setCats(r.data.categories)).catch(() => {}); }, []);
  if (slug) return <NewsArticleView service={investorNews} slug={slug} backTo="/investor/updates" />;
  return <NewsFeed service={investorNews} categories={cats} basePath="/investor/updates" title="News & Updates" intro="Company updates, market information, educational content and notices for investors." />;
}
