import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function publishedAtMs(post) {
  if (!post?.published_at) return 0;
  const t = new Date(post.published_at).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortPublicPosts(posts) {
  return (posts || []).slice().sort((a, b) => {
    const af = Boolean(a.featured);
    const bf = Boolean(b.featured);
    if (af !== bf) return af ? -1 : 1;
    return publishedAtMs(b) - publishedAtMs(a);
  });
}

function BlogCard({ post }) {
  return (
    <article className="landing-blog-card">
      <Link className="landing-blog-card-media" to={`/blog/${post.slug}`}>
        {post.header_image_url ? (
          <img src={post.header_image_url} alt="" loading="lazy" decoding="async" width={400} height={300} />
        ) : (
          <span className="post-card-media-fallback" aria-hidden="true" />
        )}
      </Link>
      <div className="landing-blog-card-body">
        <h3>
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt ? <p>{post.excerpt}</p> : null}
        <Link className="read" to={`/blog/${post.slug}`}>
          Read
        </Link>
      </div>
    </article>
  );
}

export default function LandingBlogPreview() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/blog-posts');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load posts.');
        const sorted = sortPublicPosts(Array.isArray(data.posts) ? data.posts : []);
        if (!cancelled) setPosts(sorted.slice(0, 3));
      } catch {
        if (!cancelled) setPosts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (posts === null || posts.length === 0) return null;

  return (
    <section className="section landing-blog" aria-labelledby="landing-blog-heading">
      <div className="wrap">
        <div className="head landing-blog-head">
          <h2 id="landing-blog-heading">Latest from the blog</h2>
          <Link className="landing-blog-all" to="/blog">
            Read all articles
          </Link>
        </div>
        <div className="landing-blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
