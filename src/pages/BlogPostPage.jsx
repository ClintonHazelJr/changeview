import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';
import BlogComments from '../components/landing/BlogComments';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      setPost(null);
      try {
        const res = await fetch(`/api/blog-posts?slug=${encodeURIComponent(slug)}`);
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Could not load post.');
        if (!cancelled) setPost(data.post || null);
        if (!cancelled && !data.post) setNotFound(true);
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

  if (!loading && notFound) return <Navigate to="/blog" replace />;

  return (
    <SiteShell title={post ? `${post.title} — changeview` : 'Blog — changeview'}>
      <main className="page">
        <div className="wrap narrow">
          <Link className="back-link" to="/blog">← Back to blog</Link>
          {loading || !post ? (
            <p className="blog-comments-muted">Loading…</p>
          ) : (
            <>
              {post.header_image_url ? (
                <figure className="post-hero">
                  <img src={post.header_image_url} alt="" />
                </figure>
              ) : null}
              <MarkdownBody source={post.content} />
              <BlogComments slug={post.slug} />
            </>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
