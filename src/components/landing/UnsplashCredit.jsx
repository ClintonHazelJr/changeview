const SITE_NAME = 'changeview';

function withUtm(url) {
  if (!url) return '#';
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', SITE_NAME);
    u.searchParams.set('utm_medium', 'referral');
    return u.toString();
  } catch {
    return url;
  }
}

const UNSPLASH_HOME = withUtm('https://unsplash.com/');

/**
 * Unsplash-required attribution caption.
 * Photo by [Name] on Unsplash — both links include utm_source=changeview.
 */
export default function UnsplashCredit({ name, profileUrl, className = 'post-hero-credit' }) {
  if (!name) return null;
  const photographerHref = withUtm(profileUrl || 'https://unsplash.com/');

  return (
    <figcaption className={className}>
      Photo by{' '}
      <a href={photographerHref} target="_blank" rel="noopener noreferrer">
        {name}
      </a>
      {' '}on{' '}
      <a href={UNSPLASH_HOME} target="_blank" rel="noopener noreferrer">
        Unsplash
      </a>
    </figcaption>
  );
}
