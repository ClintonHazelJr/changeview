import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hasAuthRedirectParams } from '../lib/authUrls';
import { rememberCheckoutIntent } from '../lib/checkout';
import './landing.css';

const PAGE_TITLE = 'ChangeView — Change that people actually adopt';

function trialSignupPath(tier) {
  if (tier === 'enterprise') return '/signup?plan=enterprise&billing=monthly';
  if (tier === 'small') return '/signup?plan=small&billing=monthly';
  return '/signup?plan=solo&billing=monthly';
}

/** Logo mark — same SVG system as the design file (full / mono / footer). */
function Mark({ variant = 'full', color, style, className }) {
  const mono = variant === 'mono';
  const footer = variant === 'footer';
  const full = variant === 'full';

  let c1;
  let c2;
  let c3;
  let c4;
  if (mono) {
    c1 = c2 = c3 = c4 = color || '#1c2f8f';
  } else if (footer) {
    c1 = '#93a6ee';
    c2 = '#93a6ee';
    c3 = '#93a6ee';
    c4 = '#ffffff';
  } else {
    c1 = '#1c2f8f';
    c2 = '#3a54c4';
    c3 = '#5f79df';
    c4 = '#93a6ee';
  }

  return (
    <span className={className} style={style} aria-hidden>
      <svg
        viewBox="0 0 124 100"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="changeview"
      >
        {full && <circle cx="87" cy="50" r="33" fill="#ff1717" />}
        <g fill="none" strokeLinejoin="round" strokeLinecap="butt" strokeWidth="19">
          <polyline points="54,10 88,50 54,90" stroke={c4} />
          <polyline points="36,10 70,50 36,90" stroke={c3} />
          <polyline points="18,10 52,50 18,90" stroke={c2} />
          <polyline points="0,10 34,50 0,90" stroke={c1} />
        </g>
      </svg>
    </span>
  );
}

function PlanCta({ tier, className, children }) {
  return (
    <Link
      to={trialSignupPath(tier)}
      data-plan={tier}
      className={className}
      onClick={() => {
        console.log('[pricing-click] tier=', tier);
        rememberCheckoutIntent(tier, 'monthly');
      }}
    >
      {children}
    </Link>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const accountDeleted = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('account') === 'deleted';

  useEffect(() => {
    document.title = PAGE_TITLE;
    const id = 'cv-sora-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    return () => {
      document.title = 'ChangeView';
    };
  }, []);

  useEffect(() => {
    if (!hasAuthRedirectParams()) return;
    navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true });
  }, [navigate]);

  return (
    <div className="cv-landing">
      {accountDeleted && (
        <div className="notice">
          Your account has been deleted. Billing is cancelled and all data was removed.
        </div>
      )}

      <nav className="site">
        <div className="wrap row">
          <Link className="brand" to="/">
            <Mark variant="full" style={{ width: 38, height: 30, display: 'block' }} />
            <span>changeview</span>
          </Link>
          <div className="navlinks">
            <a href="#features">Product</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#features">Resources</a>
          </div>
          <div className="navright">
            <Link className="signin" to="/login">Sign in</Link>
            <Link className="btn btn-navy" style={{ padding: '11px 22px', fontSize: 15 }} to="/signup?plan=solo&billing=monthly">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="stack">
            <span className="eyebrow"><span className="dot" /> Organizational change, adopted</span>
            <h1>
              Change that people <em>actually</em> adopt.
            </h1>
            <p className="lede">
              changeview gives transformation leaders one place to plan, launch, and measure organizational change — so every rollout lands, and nothing stalls in the middle.
            </p>
            <div className="cta-row">
              <Link className="btn btn-red" to="/signup?plan=solo&billing=monthly">Start free</Link>
            </div>
            <span className="micro">No credit card · 14-day trial · Rolls out in a week</span>
          </div>
          <div className="shot">
            <img
              src="/assets/changeview_dashboard_hero.png"
              alt="ChangeView dashboard showing initiatives and workspace stats"
              width="1160"
              height="620"
            />
          </div>
        </div>
      </header>

      <section className="trust">
        <div className="wrap row">
          <span className="label">Trusted by change teams at</span>
          <div className="logos">
            <span>NORTHWIND</span>
            <span>Meridian</span>
            <span>ATLAS CO</span>
            <span>Kestrel</span>
            <span>Vantage</span>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="wrap">
          <div className="head">
            <span className="kicker">The platform</span>
            <h2>Everything a rollout needs, in one view.</h2>
          </div>
          <div className="features">
            <div className="feature">
              <Mark className="ic" variant="mono" color="#1c2f8f" />
              <h3>Change plans</h3>
              <p>Phased rollout plans with owners, milestones, and dependencies you can actually track.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#3a54c4" />
              <h3>Stakeholder maps</h3>
              <p>See who&apos;s impacted, who&apos;s resisting, and who&apos;s championing — before it becomes a problem.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#5f79df" />
              <h3>Adoption analytics</h3>
              <p>Track readiness, sentiment, and real usage in real time — not in a quarterly survey.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#1c2f8f" />
              <h3>Comms hub</h3>
              <p>The right message to the right team at the right moment, across every channel.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#3a54c4" />
              <h3>Readiness surveys</h3>
              <p>Pulse-check confidence before and after each phase, and act on it instantly.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#ff1717" />
              <h3>Playbooks</h3>
              <p>Reusable templates from proven frameworks — ADKAR, Kotter, and your own.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section how" id="how">
        <div className="wrap">
          <div className="head">
            <span className="kicker">How it works</span>
            <h2>Four moves, one direction: forward.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <span className="n">01</span>
              <h3>Map</h3>
              <p>Import your org and surface every group the change touches.</p>
            </div>
            <div className="step">
              <span className="n">02</span>
              <h3>Plan</h3>
              <p>Build the phased plan with owners, comms, and readiness gates.</p>
            </div>
            <div className="step">
              <span className="n">03</span>
              <h3>Launch</h3>
              <p>Roll out in waves, with the right message reaching each team on cue.</p>
            </div>
            <div className="step">
              <span className="n">04</span>
              <h3>Measure</h3>
              <p>Watch adoption climb and step in the moment a group falls behind.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="head">
            <span className="kicker">Pricing</span>
            <h2>Simple plans, real access.</h2>
          </div>
          <div className="tiers">
            <div className="tier">
              <h3>Sole Proprietor</h3>
              <div className="price"><span className="amt">$59</span><span className="per">/ mo</span></div>
              <p>1 user, 1 workspace. For a solo consultant running a single client rollout.</p>
              <PlanCta tier="solo" className="btn btn-ghost-navy">Start free trial</PlanCta>
            </div>
            <div className="tier pop">
              <span className="badge">MOST POPULAR</span>
              <h3>Business</h3>
              <div className="price"><span className="amt">$149</span><span className="per">/ mo</span></div>
              <p>5 users, unlimited workspaces. For teams running change across multiple clients or departments.</p>
              <PlanCta tier="small" className="btn btn-red pay">Start free trial</PlanCta>
            </div>
            <div className="tier">
              <h3>Enterprise</h3>
              <div className="price"><span className="amt">$299</span><span className="per">/ mo</span></div>
              <p>Unlimited users, unlimited workspaces. Annual billing available.</p>
              <PlanCta tier="enterprise" className="btn btn-ghost-navy">Start free trial</PlanCta>
            </div>
          </div>
        </div>
      </section>

      <section className="section faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 36 }}>
            Questions, answered.
          </h2>
          <div className="qa">
            <h3>Is this only for big transformations?</h3>
            <p>No. changeview works for a single team&apos;s process change up to a company-wide reorg — the plan just scales with you.</p>
          </div>
          <div className="qa">
            <h3>How fast can we get started?</h3>
            <p>Most teams import their org and launch a first plan within a week, using a built-in playbook.</p>
          </div>
          <div className="qa">
            <h3>Does it integrate with our tools?</h3>
            <p>Yes — Slack, Teams, email, HRIS, and SSO. Comms and readiness data flow both ways.</p>
          </div>
          <div className="qa">
            <h3>How is adoption measured?</h3>
            <p>A blend of real product usage, readiness pulses, and stakeholder sentiment, rolled into one adoption score per group.</p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap row">
          <div>
            <h2>Make your next change the one that sticks.</h2>
            <p>Start free today — bring your first rollout live this week.</p>
          </div>
          <Link className="btn btn-red" to="/signup?plan=solo&billing=monthly">Start free</Link>
        </div>
      </section>

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
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#features">Integrations</a>
            </div>
            <div className="col">
              <span className="h">Company</span>
              <a href="#how">About</a>
              <a href="#how">Careers</a>
              <a href="#pricing">Contact</a>
            </div>
            <div className="col">
              <span className="h">Resources</span>
              <a href="#features">Playbooks</a>
              <a href="#features">Blog</a>
              <a href="#features">Help center</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
