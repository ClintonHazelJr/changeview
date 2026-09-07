import { useCallback, useEffect, useState } from 'react';
import './landing.css';

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  header_image_url: '',
  published: false,
  display_order: '',
  slugLocked: false,
};

function slugify(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminBlogPage() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [posts, setPosts] = useState([]);
  const [listError, setListError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formOk, setFormOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const id = 'cv-sora-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    const prev = document.title;
    document.title = 'Blog admin — changeview';
    return () => {
      document.title = prev || 'ChangeView';
    };
  }, []);

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/admin/blog/session', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    setConfigured(data.configured !== false);
    setAuthenticated(Boolean(data.authenticated));
    return Boolean(data.authenticated);
  }, []);

  const loadPosts = useCallback(async () => {
    setListError('');
    const res = await fetch('/api/admin/blog/posts', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setAuthenticated(false);
      return;
    }
    if (!res.ok) {
      setListError(data.error || 'Could not load posts.');
      return;
    }
    setPosts(Array.isArray(data.posts) ? data.posts : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await refreshSession();
        if (ok && !cancelled) await loadPosts();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, loadPosts]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/blog/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoginError(data.error || 'Login failed.');
      return;
    }
    setPassword('');
    setAuthenticated(true);
    await loadPosts();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/blog/session', { method: 'DELETE', credentials: 'include' });
    setAuthenticated(false);
    setPosts([]);
  };

  const togglePublished = async (post) => {
    setBusyId(post.id);
    setListError('');
    try {
      const res = await fetch('/api/admin/blog/posts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, published: !post.published }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update.');
      setPosts((prev) => prev.map((p) => (p.id === post.id ? data.post : p)));
    } catch (err) {
      setListError(err.message || 'Could not update.');
    } finally {
      setBusyId('');
    }
  };

  const removePost = async (post) => {
    const ok = window.confirm(
      `Permanently delete “${post.title}”? This cannot be undone.`,
    );
    if (!ok) return;
    setBusyId(post.id);
    setListError('');
    try {
      const res = await fetch(`/api/admin/blog/posts?id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete.');
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err) {
      setListError(err.message || 'Could not delete.');
    } finally {
      setBusyId('');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormOk('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blog/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug || slugify(form.title),
          excerpt: form.excerpt,
          content: form.content,
          header_image_url: form.header_image_url,
          published: form.published,
          display_order: form.display_order === '' ? null : Number(form.display_order),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setForm(emptyForm);
      setFormOk('Post saved.');
      await loadPosts();
    } catch (err) {
      setFormError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    const ok = window.confirm(
      'Import all 11 default articles and set every post to Unpublished? Existing matching slugs will be overwritten.',
    );
    if (!ok) return;
    setSeeding(true);
    setListError('');
    try {
      const res = await fetch('/api/admin/blog/seed', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      await loadPosts();
      setFormOk(`Imported ${data.count || 0} articles (all unpublished).`);
    } catch (err) {
      setListError(err.message || 'Import failed.');
    } finally {
      setSeeding(false);
    }
  };

  if (checking) {
    return (
      <div className="cv-landing blog-admin">
        <main className="page">
          <div className="wrap narrow">
            <p className="blog-comments-muted">Checking session…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="cv-landing blog-admin">
        <main className="page">
          <div className="wrap narrow">
            <h1 className="blog-admin-title">Blog admin</h1>
            {!configured ? (
              <p className="blog-comments-error">
                Set <code>BLOG_ADMIN_PASSWORD</code> in the environment (16+ characters) to enable this screen.
              </p>
            ) : (
              <form className="contact-form" onSubmit={handleLogin}>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                {loginError ? <p className="blog-comments-error">{loginError}</p> : null}
                <button type="submit" className="btn btn-red">Sign in</button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="cv-landing blog-admin">
      <main className="page">
        <div className="wrap">
          <div className="blog-admin-header">
            <h1 className="blog-admin-title">Blog admin</h1>
            <div className="blog-admin-actions">
              <button type="button" className="btn btn-outline" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Importing…' : 'Import 11 defaults (all unpublished)'}
              </button>
              <button type="button" className="btn btn-outline" onClick={handleLogout}>Sign out</button>
            </div>
          </div>

          {listError ? <p className="blog-comments-error">{listError}</p> : null}
          {formOk ? <p className="form-note">{formOk}</p> : null}

          <section className="blog-admin-section">
            <h2>Posts</h2>
            {posts.length === 0 ? (
              <p className="blog-comments-muted">No posts yet. Import defaults or add one below.</p>
            ) : (
              <ul className="blog-admin-list">
                {posts.map((post) => (
                  <li key={post.id} className="blog-admin-row">
                    <div className="blog-admin-row-main">
                      <strong>{post.title}</strong>
                      <span className="blog-admin-slug">/{post.slug}</span>
                    </div>
                    <div className="blog-admin-row-actions">
                      <label className="blog-admin-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(post.published)}
                          disabled={busyId === post.id}
                          onChange={() => togglePublished(post)}
                        />
                        <span>{post.published ? 'Published' : 'Unpublished'}</span>
                      </label>
                      <button
                        type="button"
                        className="btn btn-outline blog-admin-remove"
                        disabled={busyId === post.id}
                        onClick={() => removePost(post)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="blog-admin-section">
            <h2>Add new post</h2>
            <form className="contact-form blog-admin-form" onSubmit={handleCreate}>
              <label>
                <span>Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: f.slugLocked ? f.slug : slugify(title),
                    }));
                  }}
                />
              </label>
              <label>
                <span>Slug</span>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugLocked: true }))}
                />
              </label>
              <label>
                <span>Excerpt</span>
                <input
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                />
              </label>
              <label>
                <span>Header image URL</span>
                <input
                  value={form.header_image_url}
                  onChange={(e) => setForm((f) => ({ ...f, header_image_url: e.target.value }))}
                  placeholder="/blog/example.jpg"
                />
              </label>
              <label>
                <span>Display order (optional)</span>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                />
              </label>
              <label>
                <span>Content (markdown)</span>
                <textarea
                  required
                  rows={14}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
              </label>
              <label className="blog-admin-toggle">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                />
                <span>Published</span>
              </label>
              {formError ? <p className="blog-comments-error">{formError}</p> : null}
              <button type="submit" className="btn btn-red" disabled={saving}>
                {saving ? 'Saving…' : 'Save post'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
