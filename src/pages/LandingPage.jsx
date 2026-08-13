import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Target, MessageSquare, TrendingUp, Check, GraduationCap,
  RefreshCw, Building2, Sparkles, Network, X,
} from 'lucide-react';
import { C, HEAD, BODY, tint } from '../lib/constants';
import { hasAuthRedirectParams } from '../lib/authUrls';

const PRICING = {
  solo: { monthly: 59 },
  small: { monthly: 149, annual: 1490, save: 298 },
  enterprise: { monthly: 299, annual: 2990, save: 598 },
};

function formatUsd(n) {
  return `$${n.toLocaleString('en-US')}`;
}

function trialSignupPath(tier, billingCycle = 'monthly') {
  const billing = tier === 'solo' ? 'monthly' : billingCycle;
  return `/signup?plan=${tier}&billing=${billing}`;
}

function HeroMockup() {
  return (
    <div
      className="relative w-full max-w-lg mx-auto rounded-3xl border shadow-2xl overflow-hidden"
      style={{
        borderColor: 'rgba(255,255,255,0.35)',
        background: '#fff',
        transform: 'perspective(1200px) rotateY(-6deg) rotateX(4deg)',
      }}
      aria-hidden
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: C.border, background: C.bg }}>
        <div className="w-2 h-2 rounded-full" style={{ background: C.coral }} />
        <div className="w-2 h-2 rounded-full" style={{ background: C.amber }} />
        <div className="w-2 h-2 rounded-full" style={{ background: C.green }} />
        <span className="ml-2 text-[11px] font-bold" style={{ ...HEAD, color: C.ink }}>Impact — Operations</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { t: 'People · High', c: C.coral },
            { t: 'Process · Medium', c: C.amber },
            { t: 'System · Low', c: C.green },
          ].map((tag) => (
            <span
              key={tag.t}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: tint(tag.c, '22'), color: tag.c }}
            >
              {tag.t}
            </span>
          ))}
        </div>
        <div className="rounded-2xl p-3 border" style={{ borderColor: C.border, background: C.bg }}>
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: C.sub }}>Current → Future</div>
          <div className="text-xs font-semibold" style={{ color: C.ink }}>Paper credit packs → digital underwriting</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl p-2.5 text-white text-[11px] font-bold" style={{ background: C.purple }}>
            <MessageSquare size={12} className="inline mr-1" /> Draft comms
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-[11px] font-bold" style={{ background: tint(C.amber, '22'), color: C.amber }}>
            <GraduationCap size={12} className="inline mr-1" /> 2 learning needs
          </div>
        </div>
        <div className="flex -space-x-2">
          {[C.coral, C.teal, C.purple].map((bg, i) => (
            <div
              key={bg}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: bg }}
            >
              {['AK', 'JM', 'RL'][i]}
            </div>
          ))}
          <span className="ml-3 self-center text-[10px] font-semibold" style={{ color: C.sub }}>3 stakeholders</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const annual = billingCycle === 'annual';
  const accountDeleted = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('account') === 'deleted';

  // If an Auth email still points at Site URL (/), forward into the callback handler.
  useEffect(() => {
    if (!hasAuthRedirectParams()) return;
    navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ ...BODY, background: C.bg, color: C.ink }}>
      {accountDeleted && (
        <div className="px-6 py-2.5 text-xs font-semibold text-center" style={{ background: tint(C.amber, '22'), color: C.ink }}>
          Your account has been deleted. Billing is cancelled and all data was removed.
        </div>
      )}
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5">
        <span className="font-extrabold text-xl tracking-tight" style={{ ...HEAD, color: C.ink }}>ChangeView</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold no-underline px-3 py-2" style={{ color: C.sub }}>Log in</Link>
          <Link
            to="/signup?plan=solo"
            className="text-sm font-bold text-white px-5 py-2.5 rounded-full no-underline shadow-sm"
            style={{ background: C.purple }}
          >
            Start free trial
          </Link>
        </div>
      </nav>

      {/* Hero — one composition, brand-first */}
      <section
        className="relative px-6 md:px-10 pt-6 pb-20 md:pb-28"
        style={{
          background: `linear-gradient(145deg, ${tint(C.purple, '28')} 0%, ${C.bg} 42%, ${tint(C.teal, '18')} 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, ${tint(C.coral, '35')}, transparent 40%), radial-gradient(circle at 80% 10%, ${tint(C.purple, '40')}, transparent 45%)`,
          }}
        />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div>
            <div className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ ...HEAD, color: C.ink }}>
              ChangeView
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4" style={{ ...HEAD, color: C.ink }}>
              Scope the impact.<br />
              Plan the comms.<br />
              <span style={{ color: C.purple }}>Track the adoption.</span>
            </h1>
            <p className="text-base md:text-lg mb-8 max-w-md" style={{ color: C.sub }}>
              Built for independent change consultants and internal change managers who need one place for impacts, training, and communications.
            </p>
            <Link
              to="/signup?plan=solo"
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-8 py-3.5 rounded-full no-underline shadow-lg"
              style={{ background: C.purple }}
            >
              Start free trial <ArrowRight size={16} />
            </Link>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* Core loop */}
      <section className="px-6 md:px-10 py-20 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3" style={{ ...HEAD, color: C.ink }}>
          The change loop, end to end
        </h2>
        <p className="text-sm text-center mb-12 max-w-xl mx-auto" style={{ color: C.sub }}>
          One workspace from first impact map through go-live — not three disconnected tools.
        </p>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5" style={{ background: tint(C.purple, '30') }} />
          {[
            { icon: Target, color: C.coral, step: '01', title: 'Scope the impact', desc: 'Departments, headcount, and severity across org, people, process, system, and environment.' },
            { icon: MessageSquare, color: C.purple, step: '02', title: 'Plan comms & training', desc: 'AI drafts change communications from your impact data. Learning needs feed the delivery plan.' },
            { icon: TrendingUp, color: C.teal, step: '03', title: 'Track adoption', desc: 'Stakeholders, RACI, schedule, and reports keep everyone aligned through go-live.' },
          ].map(({ icon: Icon, color, step, title, desc }) => (
            <div key={title} className="relative text-center md:text-left">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto md:mx-0 mb-4 shadow-sm"
                style={{ background: tint(color, '22') }}
              >
                <Icon size={26} style={{ color }} />
              </div>
              <div className="text-[11px] font-bold tracking-widest mb-1" style={{ color }}>{step}</div>
              <h3 className="text-lg font-extrabold mb-2" style={{ ...HEAD, color: C.ink }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built for — example scenarios, not testimonials */}
      <section className="px-6 md:px-10 py-20" style={{ background: '#fff' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3" style={{ ...HEAD, color: C.ink }}>
            Built for
          </h2>
          <p className="text-sm text-center mb-12 max-w-xl mx-auto" style={{ color: C.sub }}>
            A few situations ChangeView is built for:
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: RefreshCw,
                color: C.coral,
                title: 'New system rollout',
                body: 'Migrating from one CRM, ERP, or collaboration suite to another? Scope who\'s affected, plan training by department, and draft comms in minutes instead of hours.',
              },
              {
                icon: Building2,
                color: C.purple,
                title: 'Mergers and acquisitions',
                body: 'Integration always means change. Track impact across every team the deal touches, on a deadline you don\'t control.',
              },
              {
                icon: Sparkles,
                color: C.teal,
                title: 'AI tool adoption',
                body: 'Rolling out a new AI tool across the org? Structure the training plan and the comms before resistance sets in.',
              },
              {
                icon: Network,
                color: C.amber,
                title: 'Restructures and new operating models',
                body: 'When reporting lines and processes shift, give every impacted team a clear picture of what\'s changing and why.',
              },
            ].map(({ icon: Icon, color, title, body }) => (
              <div key={title} className="flex gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: tint(color, '20') }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold mb-1.5" style={{ ...HEAD, color: C.ink }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-10 py-20" style={{ background: `linear-gradient(180deg, ${C.bg}, ${tint(C.purple, '08')})` }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3" style={{ ...HEAD, color: C.ink }}>Simple pricing</h2>
          <p className="text-sm text-center mb-2" style={{ color: C.sub }}>Start alone. Scale to your whole change practice.</p>
          <p className="text-xs text-center font-semibold mb-10" style={{ color: C.purple }}>
            7-day free trial · Card required · Charged only when the trial ends
          </p>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-start">
            {/* Solo — monthly only, no billing toggle */}
            <div className="bg-white rounded-3xl p-8 border shadow-sm flex flex-col h-full" style={{ borderColor: C.border }}>
              <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Solo</div>
              <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                {formatUsd(PRICING.solo.monthly)}
                <span className="text-base font-medium" style={{ color: C.sub }}>/mo</span>
              </div>
              <p className="text-sm mb-6" style={{ color: C.sub }}>Billed monthly. One workspace, one user.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  { ok: true, text: '1 Workspace' },
                  { ok: true, text: '1 User' },
                  { ok: true, text: 'Reports' },
                  { ok: true, text: 'Initiatives, Impacts & Requirements' },
                  { ok: true, text: 'Stakeholders, Learning Needs & AI Comms' },
                  { ok: false, text: 'Schedule' },
                  { ok: false, text: 'Tasks' },
                ].map((f) => (
                  <li key={f.text} className="flex items-center gap-2 text-sm" style={{ color: f.ok ? C.ink : C.sub }}>
                    {f.ok
                      ? <Check size={14} style={{ color: C.green }} />
                      : <X size={14} style={{ color: C.sub }} />}
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                to={trialSignupPath('solo')}
                className="w-full text-sm font-bold text-white py-3 rounded-full text-center no-underline"
                style={{ background: C.purple }}
              >
                Start your 7-day free trial
              </Link>
              <p className="text-[11px] text-center mt-2" style={{ color: C.sub }}>Card required · $0 today</p>
            </div>

            {/* Small + Enterprise share a monthly/annual toggle */}
            <div>
              <div className="flex justify-center lg:justify-end mb-4">
                <div
                  className="inline-flex p-1 rounded-full border bg-white shadow-sm"
                  style={{ borderColor: C.border }}
                  role="group"
                  aria-label="Billing cycle"
                >
                  {[
                    { key: 'monthly', label: 'Monthly' },
                    { key: 'annual', label: 'Annual' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setBillingCycle(opt.key)}
                      className="text-xs font-bold px-4 py-2 rounded-full transition-colors"
                      style={{
                        background: billingCycle === opt.key ? C.purple : 'transparent',
                        color: billingCycle === opt.key ? '#fff' : C.sub,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-stretch">
                <div
                  className="rounded-3xl p-8 border-2 shadow-md relative flex flex-col overflow-hidden bg-white"
                  style={{ borderColor: C.purple }}
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1.5"
                    style={{ background: `linear-gradient(90deg, ${C.purple}, ${C.teal})` }}
                  />
                  <div
                    className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: C.purple }}
                  >
                    Most popular
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.purple }}>Small</div>
                  <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                    {formatUsd(annual ? PRICING.small.annual : PRICING.small.monthly)}
                    <span className="text-base font-medium" style={{ color: C.sub }}>
                      {annual ? '/yr' : '/mo'}
                    </span>
                  </div>
                  {annual ? (
                    <p className="text-sm mb-6" style={{ color: C.sub }}>
                      <span className="font-semibold" style={{ color: C.green }}>2 months free</span>
                      {' · '}
                      Save {formatUsd(PRICING.small.save)} vs monthly
                    </p>
                  ) : (
                    <p className="text-sm mb-6" style={{ color: C.sub }}>
                      Or {formatUsd(PRICING.small.annual)}/yr (2 months free)
                    </p>
                  )}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {[
                      'Unlimited Workspaces',
                      'Up to 5 Users',
                      'Reports',
                      'Tasks & Schedule',
                      'Everything in Solo',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                        <Check size={14} style={{ color: C.green }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={trialSignupPath('small', billingCycle)}
                    className="w-full text-sm font-bold text-white py-3 rounded-full text-center no-underline"
                    style={{ background: C.purple }}
                  >
                    Start your 7-day free trial
                  </Link>
                  <p className="text-[11px] text-center mt-2" style={{ color: C.sub }}>Card required · $0 today</p>
                </div>

                <div className="bg-white rounded-3xl p-8 border shadow-sm flex flex-col" style={{ borderColor: C.border }}>
                  <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Enterprise</div>
                  <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                    {formatUsd(annual ? PRICING.enterprise.annual : PRICING.enterprise.monthly)}
                    <span className="text-base font-medium" style={{ color: C.sub }}>
                      {annual ? '/yr' : '/mo'}
                    </span>
                  </div>
                  {annual ? (
                    <p className="text-sm mb-6" style={{ color: C.sub }}>
                      <span className="font-semibold" style={{ color: C.green }}>2 months free</span>
                      {' · '}
                      Save {formatUsd(PRICING.enterprise.save)} vs monthly
                    </p>
                  ) : (
                    <p className="text-sm mb-6" style={{ color: C.sub }}>
                      Or {formatUsd(PRICING.enterprise.annual)}/yr (2 months free)
                    </p>
                  )}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {[
                      'Unlimited Workspaces',
                      'Unlimited Users',
                      'Reports',
                      'Tasks & Schedule',
                      'Everything in Small',
                      'Priority support',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                        <Check size={14} style={{ color: C.green }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={trialSignupPath('enterprise', billingCycle)}
                    className="w-full text-sm font-bold text-white py-3 rounded-full text-center no-underline"
                    style={{ background: C.ink }}
                  >
                    Start your 7-day free trial
                  </Link>
                  <p className="text-[11px] text-center mt-2" style={{ color: C.sub }}>Card required · $0 today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-10 border-t" style={{ borderColor: C.border, background: '#fff' }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold" style={{ ...HEAD, color: C.ink }}>ChangeView</span>
            <span className="text-xs" style={{ color: C.sub }}>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/login" className="no-underline" style={{ color: C.sub }}>Log in</Link>
            <Link to="/signup?plan=solo" className="no-underline" style={{ color: C.purple }}>Start free trial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
