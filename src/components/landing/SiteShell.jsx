import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Mark from './Mark';
import '../../pages/landing.css';

/**
 * Shared marketing chrome: Sora, site nav, footer.
 * Hash links point at the landing page sections when not already on `/`.
 */
export default function SiteShell({ title, children, notice }) {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const section = (hash) => (onHome ? hash : `/${hash}`);

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
    if (title) document.title = title;
    return () => {
      document.title = prev || 'ChangeView';
    };
  }, [title]);

  return (
    <div className="cv-landing">
      {notice}

      <nav className="site">
        <div className="wrap row">
          <Link className="brand" to="/">
            <Mark variant="full" style={{ width: 38, height: 30, display: 'block' }} />
            <span>changeview</span>
          </Link>
          <div className="navlinks">
            <a href={section('#features')}>Product</a>
            <a href={section('#how')}>How it works</a>
            <a href={section('#pricing')}>Pricing</a>
            <Link to="/blog">Resources</Link>
          </div>
          <div className="navright">
            <Link className="signin" to="/login">Sign in</Link>
            <Link className="btn btn-navy" style={{ padding: '11px 22px', fontSize: 15 }} to="/signup?plan=solo&billing=monthly">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer>
        <div className="wrap row">
          <div className="about">
            <span className="brand">
              <Mark variant="footer" style={{ width: 32, height: 26, display: 'block' }} />
              <span>changeview</span>
            </span>
            <span className="tag">Change management that people actually adopt.</span>
          </div>
          <div className="cols">
            <div className="col">
              <span className="h">Product</span>
              <a href={section('#features')}>Features</a>
              <a href={section('#pricing')}>Pricing</a>
            </div>
            <div className="col">
              <span className="h">Company</span>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
            <div className="col">
              <span className="h">Resources</span>
              <Link to="/blog">Blog</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
