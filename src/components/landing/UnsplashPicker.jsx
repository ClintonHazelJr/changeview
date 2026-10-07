import { useState } from 'react';
import UnsplashCredit from './UnsplashCredit';

/**
 * Admin Unsplash search/select UI.
 * onSelect({ imageUrl, creditName, creditUrl }) after download tracking succeeds.
 * onClear() when Remove is clicked.
 */
export default function UnsplashPicker({
  imageUrl,
  creditName,
  creditUrl,
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectingId, setSelectingId] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = async (nextPage, append) => {
    const q = query.trim();
    if (!q) {
      setError('Enter a search query.');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await fetch(
        `/api/unsplash/search?query=${encodeURIComponent(q)}&page=${nextPage}`,
        { credentials: 'include' },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed.');
      const next = Array.isArray(data.photos) ? data.photos : [];
      setPhotos((prev) => (append ? [...prev, ...next] : next));
      setPage(Number(data.page) || nextPage);
      setTotalPages(Number(data.total_pages) || 0);
    } catch (err) {
      if (!append) setPhotos([]);
      setError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(1, false);
  };

  const handleSelect = async (photo) => {
    setSelectingId(photo.id);
    setError('');
    try {
      const res = await fetch('/api/unsplash/download', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadLocation: photo.links?.download_location }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not record download.');
      onSelect?.({
        imageUrl: photo.urls?.regular || '',
        creditName: photo.user?.name || '',
        creditUrl: photo.user?.links?.html || '',
      });
      setPhotos([]);
      setSearched(false);
      setQuery('');
    } catch (err) {
      setError(err.message || 'Could not select photo.');
    } finally {
      setSelectingId('');
    }
  };

  if (imageUrl) {
    return (
      <div className="unsplash-picker">
        <div className="unsplash-picker-selected">
          <img src={imageUrl} alt="" className="unsplash-picker-preview" />
          {creditName ? (
            <UnsplashCredit name={creditName} profileUrl={creditUrl} className="post-hero-credit" />
          ) : (
            <p className="blog-comments-muted">Selected header image (no Unsplash credit).</p>
          )}
          <div className="unsplash-picker-selected-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                onClear?.();
                setPhotos([]);
                setSearched(false);
                setError('');
              }}
            >
              Change / Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unsplash-picker">
      <form className="unsplash-picker-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Unsplash…"
          aria-label="Search Unsplash"
        />
        <button type="submit" className="btn btn-outline" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <p className="blog-comments-error">{error}</p> : null}

      {loading && photos.length === 0 ? (
        <p className="blog-comments-muted">Loading photos…</p>
      ) : null}

      {!loading && searched && photos.length === 0 && !error ? (
        <p className="blog-comments-muted">No photos found. Try another search.</p>
      ) : null}

      {photos.length > 0 ? (
        <>
          <ul className="unsplash-picker-grid">
            {photos.map((photo) => (
              <li key={photo.id} className="unsplash-picker-card">
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || ''}
                  loading="lazy"
                />
                <p className="unsplash-picker-credit">
                  Photo by {photo.user?.name || 'Unknown'} on Unsplash
                </p>
                <button
                  type="button"
                  className="btn btn-red"
                  disabled={Boolean(selectingId)}
                  onClick={() => handleSelect(photo)}
                >
                  {selectingId === photo.id ? 'Selecting…' : 'Select'}
                </button>
              </li>
            ))}
          </ul>
          {page < totalPages ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={loading}
              onClick={() => runSearch(page + 1, true)}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
