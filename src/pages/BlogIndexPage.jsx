import { Link } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import { BLOG_POSTS } from '../content/blogPosts';

export default function BlogIndexPage() {
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
            {BLOG_POSTS.map((post) => (
              <li key={post.slug}>
                <h2>
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p>{post.excerpt}</p>
                <Link className="read" to={`/blog/${post.slug}`}>Read</Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </SiteShell>
  );
}
