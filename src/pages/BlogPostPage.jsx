import { Link, Navigate, useParams } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';
import BlogComments from '../components/landing/BlogComments';
import { getPostBySlug } from '../content/blogPosts';

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) return <Navigate to="/blog" replace />;

  return (
    <SiteShell title={`${post.title} — changeview`}>
      <main className="page">
        <div className="wrap narrow">
          <Link className="back-link" to="/blog">← Back to blog</Link>
          {post.image ? (
            <figure className="post-hero">
              <img src={post.image} alt={post.imageAlt || ''} />
              {post.imageCredit ? (
                <figcaption className="post-hero-credit">{post.imageCredit}</figcaption>
              ) : null}
            </figure>
          ) : null}
          <MarkdownBody source={post.markdown} />
          <BlogComments slug={post.slug} />
        </div>
      </main>
    </SiteShell>
  );
}
