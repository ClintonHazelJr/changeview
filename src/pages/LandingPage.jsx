import { Link } from 'react-router-dom';
import { ArrowRight, Target, MessageSquare, TrendingUp, Check } from 'lucide-react';
import { C, HEAD, BODY, tint } from '../lib/constants';

const TIER1_PRICE = '[PLACEHOLDER]';
const TIER2_MONTHLY = '[PLACEHOLDER]';
const TIER2_ANNUAL = '[PLACEHOLDER]';

async function startCheckout(tier, billingCycle = 'monthly') {
  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, billingCycle }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Could not start checkout');
  } catch {
    alert('Could not connect to checkout. Try again.');
  }
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ ...BODY, background: C.bg }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <span className="font-extrabold text-xl" style={{ ...HEAD, color: C.ink }}>ChangeView</span>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold no-underline" style={{ color: C.sub }}>Log in</Link>
          <Link to="/signup" className="text-sm font-bold text-white px-5 py-2.5 rounded-full no-underline" style={{ background: C.purple }}>Start free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 pt-12 pb-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse at 50% 0%, ${tint(C.purple, '30')}, transparent 60%)` }} />
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6" style={{ ...HEAD, color: C.ink }}>
            Scope the change.<br />
            <span style={{ color: C.purple }}>Drive adoption.</span>
          </h1>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: C.sub }}>
            ChangeView helps consultants and change managers map organizational impact, generate comms and training plans, and track adoption — all in one place.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 text-sm font-bold text-white px-8 py-4 rounded-full no-underline shadow-lg" style={{ background: C.purple }}>
            Start free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Core loop */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center mb-10" style={{ ...HEAD, color: C.ink }}>The core loop</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, color: C.coral, title: 'Scope impact', desc: 'Map departments, headcount, severity across org, people, process, system, and environment — before you write a single comms draft.' },
            { icon: MessageSquare, color: C.purple, title: 'Generate comms & training', desc: 'AI drafts change communications from your impact data. Learning needs flow straight into your delivery plan.' },
            { icon: TrendingUp, color: C.teal, title: 'Track adoption', desc: 'Stakeholders, RACI, and intervention tags keep everyone aligned from planning through go-live.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: C.border }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: tint(color, '18') }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold mb-2" style={{ ...HEAD, color: C.ink }}>{title}</h3>
              <p className="text-sm" style={{ color: C.sub }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-8 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-center mb-3" style={{ ...HEAD, color: C.ink }}>Simple pricing</h2>
        <p className="text-sm text-center mb-10" style={{ color: C.sub }}>Pick the tier that fits how you work.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-8 border shadow-sm" style={{ borderColor: C.border }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Tier 1</div>
            <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{TIER1_PRICE}<span className="text-base font-medium" style={{ color: C.sub }}>/mo</span></div>
            <p className="text-sm mb-6" style={{ color: C.sub }}>One workspace, month-to-month.</p>
            <ul className="space-y-2 mb-8">
              {['1 Workspace', 'System Admin & Initiatives', 'AI Comms Generator', 'Month-to-month billing'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}><Check size={14} style={{ color: C.green }} /> {f}</li>
              ))}
            </ul>
            <button type="button" onClick={() => startCheckout('tier_1', 'monthly')} className="w-full text-sm font-bold text-white py-3 rounded-full" style={{ background: C.purple }}>Get started</button>
          </div>
          <div className="rounded-3xl p-8 border shadow-sm relative overflow-hidden" style={{ borderColor: C.purple, background: `linear-gradient(135deg, ${tint(C.purple, '08')}, #fff)` }}>
            <div className="absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ background: C.purple }}>POPULAR</div>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Tier 2</div>
            <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>{TIER2_MONTHLY}<span className="text-base font-medium" style={{ color: C.sub }}>/mo</span></div>
            <p className="text-sm mb-1" style={{ color: C.sub }}>or {TIER2_ANNUAL}/yr (save with annual)</p>
            <p className="text-sm mb-6" style={{ color: C.sub }}>Unlimited workspaces. Unlocks Reports & Schedule.</p>
            <ul className="space-y-2 mb-8">
              {['Unlimited Workspaces', 'Everything in Tier 1', 'Reports & Schedule', 'Monthly or annual billing'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}><Check size={14} style={{ color: C.green }} /> {f}</li>
              ))}
            </ul>
            <button type="button" onClick={() => startCheckout('tier_2', 'monthly')} className="w-full text-sm font-bold text-white py-3 rounded-full mb-2" style={{ background: C.purple }}>Monthly billing</button>
            <button type="button" onClick={() => startCheckout('tier_2', 'annual')} className="w-full text-sm font-bold py-3 rounded-full border" style={{ color: C.purple, borderColor: C.purple }}>Annual billing</button>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-xs" style={{ color: C.sub }}>© {new Date().getFullYear()} ChangeView</footer>
    </div>
  );
}
