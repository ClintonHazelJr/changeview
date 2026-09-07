import { useEffect, useState } from 'react';

function formatCommentDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function BlogComments({ slug }) {
  const [comments, setComments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pendingThanks, setPendingThanks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setPendingThanks(false);

    (async () => {
      try {
        const res = await fetch(`/api/blog-comments?slug=${encodeURIComponent(slug)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Could not load comments.');
        }
        if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load comments.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/blog-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: slug,
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          commentText: commentText.trim(),
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit comment.');
      }
      setPendingThanks(true);
      setAuthorName('');
      setAuthorEmail('');
      setCommentText('');
      setWebsite('');
    } catch (err) {
      setSubmitError(err.message || 'Could not submit comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="blog-comments" aria-labelledby="blog-comments-heading">
      <h2 id="blog-comments-heading">Comments</h2>

      {loading ? (
        <p className="blog-comments-muted">Loading comments…</p>
      ) : loadError ? (
        <p className="blog-comments-error">{loadError}</p>
      ) : comments.length === 0 ? (
        <p className="blog-comments-muted">No comments yet. Be the first to leave one.</p>
      ) : (
        <ul className="blog-comment-list">
          {comments.map((c) => (
            <li key={c.id} className="blog-comment">
              <div className="blog-comment-meta">
                <span className="blog-comment-name">{c.author_name}</span>
                {c.created_at ? (
                  <time dateTime={c.created_at}>{formatCommentDate(c.created_at)}</time>
                ) : null}
              </div>
              <p className="blog-comment-text">{c.comment_text}</p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="blog-comments-form-title">Leave a comment</h3>

      {pendingThanks ? (
        <p className="form-note blog-comments-thanks" role="status">
          Thanks, your comment is awaiting approval.
        </p>
      ) : (
        <form className="contact-form blog-comment-form" onSubmit={handleSubmit}>
          {/* Honeypot — hidden from people, bots often fill it */}
          <label className="hp-field" aria-hidden="true">
            <span>Website</span>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
          <label>
            <span>Name</span>
            <input
              type="text"
              required
              maxLength={80}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              maxLength={160}
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <p className="blog-comments-email-hint">
            Your email is not shown publicly. We only use it if we need to follow up on your comment.
          </p>
          <label>
            <span>Comment</span>
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </label>
          {submitError ? <p className="blog-comments-error">{submitError}</p> : null}
          <button type="submit" className="btn btn-red" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit comment'}
          </button>
        </form>
      )}
    </section>
  );
}
