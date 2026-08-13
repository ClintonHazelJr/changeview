import { Link } from 'react-router-dom';
import {
  ArrowRight, Target, MessageSquare, TrendingUp, Check, GraduationCap,
} from 'lucide-react';
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
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ ...BODY, background: C.bg, color: C.ink }}>
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 py-5">
        <span className="font-extrabold text-xl tracking-tight" style={{ ...HEAD, color: C.ink }}>ChangeView</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold no-underline px-3 py-2" style={{ color: C.sub }}>Log in</Link>
          <Link
            to="/signup"
            className="text-sm font-bold text-white px-5 py-2.5 rounded-full no-underline shadow-sm"
            style={{ background: C.purple }}
          >
            Start free
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
              to="/signup"
              className="inline-flex items-center gap-2 text-sm font-bold text-white px-8 py-3.5 rounded-full no-underline shadow-lg"
              style={{ background: C.purple }}
            >
              Start free <ArrowRight size={16} />
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

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-10 py-20" style={{ background: `linear-gradient(180deg, ${C.bg}, ${tint(C.purple, '08')})` }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3" style={{ ...HEAD, color: C.ink }}>Simple pricing</h2>
          <p className="text-sm text-center mb-12" style={{ color: C.sub }}>Start alone. Scale to your whole change practice.</p>
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            <div className="bg-white rounded-3xl p-8 border shadow-sm flex flex-col" style={{ borderColor: C.border }}>
              <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>Sole Practitioner</div>
              <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                {TIER1_PRICE}<span className="text-base font-medium" style={{ color: C.sub }}>/mo</span>
              </div>
              <p className="text-sm mb-6" style={{ color: C.sub }}>One workspace, one user, month-to-month.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  '1 Workspace',
                  'Initiatives & Impacts',
                  'Stakeholders & Learning Needs',
                  'AI Comms Generator',
                  'System Admin',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                    <Check size={14} style={{ color: C.green }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => startCheckout('tier_1', 'monthly')}
                className="w-full text-sm font-bold text-white py-3 rounded-full"
                style={{ background: C.purple }}
              >
                Get started
              </button>
            </div>

            <div
              className="rounded-3xl p-8 border-2 shadow-md relative flex flex-col overflow-hidden"
              style={{ borderColor: C.purple, background: '#fff' }}
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
              <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.purple }}>Enterprise</div>
              <div className="text-3xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>
                {TIER2_MONTHLY}<span className="text-base font-medium" style={{ color: C.sub }}>/mo</span>
              </div>
              <p className="text-sm mb-1" style={{ color: C.sub }}>or {TIER2_ANNUAL}/yr (annual discount)</p>
              <p className="text-sm mb-6" style={{ color: C.sub }}>Unlimited workspaces, team access, Schedule & Reports.</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {[
                  'Everything in Sole Practitioner',
                  'Unlimited Workspaces',
                  'Invite Users & assign workspaces',
                  'Schedule (Gantt)',
                  'Reports (requirements, CIA, heat map)',
                  'Monthly or annual billing',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
                    <Check size={14} style={{ color: C.green }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => startCheckout('tier_2', 'monthly')}
                className="w-full text-sm font-bold text-white py-3 rounded-full mb-2"
                style={{ background: C.purple }}
              >
                Monthly billing
              </button>
              <button
                type="button"
                onClick={() => startCheckout('tier_2', 'annual')}
                className="w-full text-sm font-bold py-3 rounded-full border"
                style={{ color: C.purple, borderColor: C.purple }}
              >
                Annual billing
              </button>
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
            <Link to="/signup" className="no-underline" style={{ color: C.purple }}>Start free</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
