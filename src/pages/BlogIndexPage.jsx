import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';

function PostCard({ post, featured = false }) {
  return (
    <li className={featured ? 'post-card post-card-featured' : 'post-card'}>
      <Link className="post-card-media" to={`/blog/${post.slug}`}>
        {post.header_image_url ? (
          <img src={post.header_image_url} alt="" loading="lazy" />
        ) : (
          <span className="post-card-media-fallback" />
        )}
      </Link>
      <div className="post-card-body">
        {featured ? <p className="post-featured-label">Featured</p> : null}
        <h2>
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <Link className="read" to={`/blog/${post.slug}`}>Read</Link>
      </div>
    </li>
  );
}

export default function BlogIndexPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/blog-posts');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load posts.');
        if (!cancelled) setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load posts.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = posts.filter((p) => p.featured);
  const rest = posts.filter((p) => !p.featured);

  return (
    <SiteShell title="Blog — changeview">
      <main className="page">
        <div className="wrap narrow">
          <div className="prose">
            <h1>Blog</h1>
            <p className="lede-sm">
              Notes on change practice, tooling, and how rollouts actually land.
            </p>
          </div>
          {loading ? (
            <p className="blog-comments-muted">Loading…</p>
          ) : error ? (
            <p className="blog-comments-error">{error}</p>
          ) : posts.length === 0 ? (
            <p className="blog-comments-muted">No published posts yet. Check back soon.</p>
          ) : (
            <>
              {featured.length > 0 ? (
                <ul className="post-list post-list-featured">
                  {featured.map((post) => (
                    <PostCard key={post.slug} post={post} featured />
                  ))}
                </ul>
              ) : null}
              {rest.length > 0 ? (
                <ul className={`post-list${featured.length > 0 ? ' post-list-rest' : ''}`}>
                  {rest.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
