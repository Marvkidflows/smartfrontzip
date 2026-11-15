// TASK 4 — public News & Updates (route /news and /news/:slug). Anonymous visitors only ever receive public, live articles from the API.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicNews } from '../../services/newsApi';
import { NewsFeed, NewsArticleView } from '../../components/news/NewsParts';

export default function NewsPage() {
  const { slug } = useParams();
  const [cats, setCats] = useState([]);
  useEffect(() => { publicNews.categories().then(r => setCats(r.data.categories)).catch(() => {}); }, []);
  if (slug) return <NewsArticleView service={publicNews} slug={slug} backTo="/news" />;
  return <NewsFeed service={publicNews} categories={cats} basePath="/news" title="News & Updates" intro="Company updates, market news and educational content from Smart System Investment." />;
}
