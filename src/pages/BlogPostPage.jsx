import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';
import BlogComments from '../components/landing/BlogComments';
import UnsplashCredit from '../components/landing/UnsplashCredit';

function publishedAtMs(post) {
  const t = new Date(post?.published_at || post?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function otherPosts(posts, slug) {
  return (posts || [])
    .filter((post) => post.slug && post.slug !== slug)
    .sort((a, b) => publishedAtMs(b) - publishedAtMs(a));
}

function nextPost(posts, slug) {
  const ordered = (posts || [])
    .filter((post) => post.slug)
    .slice()
    .sort((a, b) => publishedAtMs(a) - publishedAtMs(b));
  const index = ordered.findIndex((post) => post.slug === slug);
  if (index < 0 || index >= ordered.length - 1) return null;
  return ordered[index + 1];
}

function absoluteImage(url) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `https://www.changeview.app${url}`;
  return url;
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      setPost(null);
      setOthers([]);
      try {
        const [postRes, listRes] = await Promise.all([
          fetch(`/api/blog-posts?slug=${encodeURIComponent(slug)}`),
          fetch('/api/blog-posts'),
        ]);
        const data = await postRes.json().catch(() => ({}));
        const list = await listRes.json().catch(() => ({}));
        if (postRes.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!postRes.ok) throw new Error(data.error || 'Could not load post.');
        if (!cancelled) setPost(data.post || null);
        if (!cancelled && !data.post) setNotFound(true);
        if (!cancelled && Array.isArray(list.posts)) setOthers(list.posts);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const pageTitle = post ? (post.meta_title || post.title) : 'Change Management Guides and Templates | ChangeView';
  const pageDescription = post
    ? (String(post.meta_description || '').trim() || String(post.excerpt || '').trim() || post.title)
    : undefined;
  const related = post ? otherPosts(others, post.slug).slice(0, 2) : [];
  const next = post ? nextPost(others, post.slug) : null;

  useEffect(() => {
    if (!post) return undefined;
    const id = 'cv-article-jsonld';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    const image = absoluteImage(post.header_image_url);
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      author: {
        '@type': 'Person',
        name: 'Clinton Hazel Jr',
      },
      ...(image ? { image } : {}),
    });
    return () => {
      el.remove();
    };
  }, [post]);

  if (!loading && notFound) return <Navigate to="/blog" replace />;

  return (
    <SiteShell title={pageTitle} description={pageDescription}>
      <main className="page">
        <div className="wrap narrow">
          {loading || !post ? (
            <p className="blog-comments-muted">Loading…</p>
          ) : (
            <>
              <nav className="crumbs" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">&gt;</span>
                <a href="/blog">Blog</a>
                <span aria-hidden="true">&gt;</span>
                <span className="crumbs-current">{post.title}</span>
              </nav>
              {post.header_image_url ? (
                <figure className="post-hero">
                  <img
                    src={post.header_image_url}
                    alt=""
                    width={1200}
                    height={675}
                    loading="eager"
                    fetchPriority="high"
                  />
                  <UnsplashCredit
                    name={post.image_credit_name}
                    profileUrl={post.image_credit_url}
                  />
                </figure>
              ) : null}
              <MarkdownBody source={post.content} />
              {next ? (
                <p className="post-next">
                  <a href={`/blog/${next.slug}`}>Next post: {next.title}</a>
                </p>
              ) : null}
              {related.length > 0 ? (
                <section className="related-posts" aria-labelledby="related-posts-heading">
                  <h2 id="related-posts-heading">Related posts</h2>
                  <ul>
                    {related.map((item) => (
                      <li key={item.slug}>
                        <a href={`/blog/${item.slug}`}>{item.title}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <BlogComments slug={post.slug} />
            </>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
