import { Link, Navigate, useParams } from 'react-router-dom';
import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';
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
          <MarkdownBody source={post.markdown} />
        </div>
      </main>
    </SiteShell>
  );
}
