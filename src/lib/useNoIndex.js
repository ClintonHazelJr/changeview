import { useEffect } from 'react';

/** Keep signup, login, and app routes out of Google's index. */
export function useNoIndex() {
  useEffect(() => {
    let el = document.head.querySelector('meta[name="robots"]');
    const created = !el;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    const prev = el.getAttribute('content');
    el.setAttribute('content', 'noindex');
    return () => {
      if (created) el.remove();
      else if (prev == null) el.removeAttribute('content');
      else el.setAttribute('content', prev);
    };
  }, []);
}
