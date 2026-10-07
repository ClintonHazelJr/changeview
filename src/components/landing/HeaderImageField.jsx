import { useEffect, useState } from 'react';
import UnsplashCredit from './UnsplashCredit';
import UnsplashPicker from './UnsplashPicker';

/**
 * Header-image field for blog admin forms.
 * Preview + Edit/Add photo opens UnsplashPicker in a modal; Remove clears locally.
 */
export default function HeaderImageField({
  imageUrl,
  creditName,
  creditUrl,
  onChange,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleRemove = () => {
    const ok = window.confirm('Remove this photo and its credit from the post?');
    if (!ok) return;
    onChange?.({ imageUrl: '', creditName: '', creditUrl: '' });
  };

  return (
    <div className="blog-admin-image-field">
      <span className="blog-admin-field-label">Header image</span>

      {imageUrl ? (
        <div className="unsplash-picker-selected">
          <img src={imageUrl} alt="" className="unsplash-picker-preview" />
          {creditName ? (
            <UnsplashCredit name={creditName} profileUrl={creditUrl} className="post-hero-credit" />
          ) : (
            <p className="blog-comments-muted">Selected header image (no Unsplash credit).</p>
          )}
          <div className="unsplash-picker-selected-actions">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
              Edit
            </button>
            <button type="button" className="btn btn-outline" onClick={handleRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="unsplash-picker-selected-actions">
          <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
            Add photo
          </button>
        </div>
      )}

      {open ? (
        <div
          className="unsplash-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="unsplash-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose Unsplash photo"
          >
            <div className="unsplash-modal-header">
              <h3>Choose a photo</h3>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <UnsplashPicker
              onSelect={({ imageUrl: nextUrl, creditName: nextName, creditUrl: nextUrlCredit }) => {
                onChange?.({
                  imageUrl: nextUrl,
                  creditName: nextName,
                  creditUrl: nextUrlCredit,
                });
                setOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
