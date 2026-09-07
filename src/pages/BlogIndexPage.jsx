import { Link } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import { getPublishedPosts } from '../content/blogPosts';

export default function BlogIndexPage() {
  const posts = getPublishedPosts();

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
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.slug} className="post-card">
                <Link className="post-card-media" to={`/blog/${post.slug}`}>
                  <img src={post.image} alt={post.imageAlt || ''} loading="lazy" />
                </Link>
                <div className="post-card-body">
                  <h2>
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p>{post.excerpt}</p>
                  <Link className="read" to={`/blog/${post.slug}`}>Read</Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </SiteShell>
  );
}
