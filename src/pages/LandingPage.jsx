import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hasAuthRedirectParams } from '../lib/authUrls';
import { rememberCheckoutIntent } from '../lib/checkout';
import Mark from '../components/landing/Mark';
import SiteShell from '../components/landing/SiteShell';
import { usePlanPrices } from '../hooks/usePlanPrices';
import { formatUsdAmount, priceAmount, pricePeriodLabel } from '../../shared/planPrices.js';

const PAGE_TITLE = 'ChangeView — Change that people actually adopt';

function trialSignupPath(tier, billingCycle = 'monthly') {
  const cycle = tier === 'solo' ? 'monthly' : (billingCycle === 'annual' ? 'annual' : 'monthly');
  if (tier === 'enterprise') return `/signup?plan=enterprise&billing=${cycle}`;
  if (tier === 'small') return `/signup?plan=small&billing=${cycle}`;
  return '/signup?plan=solo&billing=monthly';
}

function PlanCta({ tier, billingCycle = 'monthly', className, children }) {
  const cycle = tier === 'solo' ? 'monthly' : billingCycle;
  return (
    <Link
      to={trialSignupPath(tier, cycle)}
      data-plan={tier}
      data-billing={cycle}
      className={className}
      onClick={() => {
        console.log('[pricing-click] tier=', tier, 'billing=', cycle);
        rememberCheckoutIntent(tier, cycle);
      }}
    >
      {children}
    </Link>
  );
}

function BillingCycleToggle({ value, onChange }) {
  return (
    <div className="billing-toggle" role="group" aria-label="Billing cycle">
      <button
        type="button"
        className={value === 'monthly' ? 'active' : ''}
        aria-pressed={value === 'monthly'}
        onClick={() => onChange('monthly')}
      >
        Monthly
      </button>
      <button
        type="button"
        className={value === 'annual' ? 'active' : ''}
        aria-pressed={value === 'annual'}
        onClick={() => onChange('annual')}
      >
        Annual
      </button>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { plans, annualSaveLabel } = usePlanPrices();
  const accountDeleted = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('account') === 'deleted';

  useEffect(() => {
    if (!hasAuthRedirectParams()) return;
    navigate(`/auth/callback${window.location.search}${window.location.hash}`, { replace: true });
  }, [navigate]);

  const soloPrice = priceAmount(plans, 'solo', 'monthly');
  const smallPrice = priceAmount(plans, 'small', billingCycle);
  const enterprisePrice = priceAmount(plans, 'enterprise', billingCycle);
  const pricePer = pricePeriodLabel(billingCycle);

  return (
    <SiteShell
      title={PAGE_TITLE}
      notice={accountDeleted ? (
        <div className="notice">
          Your account has been deleted. Billing is cancelled and all data was removed.
        </div>
      ) : null}
    >
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
          </div>
          <div className="shot">
            <img
              src="/assets/hero_real_final.png"
              alt="ChangeView dashboard showing planning, delivery, and impact severity"
              width={1734}
              height={903}
            />
          </div>
        </div>
      </header>

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
              <h3>Change readiness</h3>
              <p>See exactly how ready each department is, based on real training completion, not guesswork.</p>
            </div>
            <div className="feature">
              <Mark className="ic" variant="mono" color="#5f79df" />
              <h3>Task tracking</h3>
              <p>Track execution on a Kanban board, and watch requirements and training automatically mark complete as the real work gets done.</p>
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
              <h3>Starter</h3>
              <div className="price">
                <span className="amt">${formatUsdAmount(soloPrice)}</span>
                <span className="per">/ mo</span>
              </div>
              <p>1 user, 1 workspace. For a solo consultant running a single client rollout. Monthly billing only.</p>
              <PlanCta tier="solo" className="btn btn-ghost-navy">Start free trial</PlanCta>
            </div>
            <div className="tier pop">
              <span className="badge">MOST POPULAR</span>
              <h3>Pro</h3>
              <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
              <div className="price">
                <span className="amt">${formatUsdAmount(smallPrice)}</span>
                <span className="per">{pricePer}</span>
              </div>
              {billingCycle === 'annual' ? (
                <p className="billing-save">{annualSaveLabel}</p>
              ) : null}
              <p>5 users, unlimited workspaces. For teams running change across multiple clients or departments.</p>
              <PlanCta tier="small" billingCycle={billingCycle} className="btn btn-red pay">
                Start free trial
              </PlanCta>
            </div>
            <div className="tier">
              <h3>Enterprise</h3>
              <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} />
              <div className="price">
                <span className="amt">${formatUsdAmount(enterprisePrice)}</span>
                <span className="per">{pricePer}</span>
              </div>
              {billingCycle === 'annual' ? (
                <p className="billing-save">{annualSaveLabel}</p>
              ) : null}
              <p>Unlimited users, unlimited workspaces. Monthly or annual billing.</p>
              <PlanCta tier="enterprise" billingCycle={billingCycle} className="btn btn-ghost-navy">
                Start free trial
              </PlanCta>
            </div>
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
    </SiteShell>
  );
}
