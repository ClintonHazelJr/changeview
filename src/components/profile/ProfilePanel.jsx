import { useEffect, useState } from 'react';
import { CreditCard, LogOut, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { C, HEAD, BODY, inputClass, inputStyle, initials, tint, PLAN_LABELS, PLAN_LIMITS, isPlatformAdminEmail, PLATFORM_RESET_CONFIRM, effectivePlanLimits, formatPlanLimit, trialDaysLeft as calcTrialDays, planTierRank } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { startBillingPortal, updateSubscriptionPlan } from '../../lib/checkout';
import { Field, SaveRow } from '../ui/shared';
import Modal from '../ui/Modal';
import { FormWorkspace } from '../forms/AdminForms';
import { Link } from 'react-router-dom';
import { usePlanPrices } from '../../hooks/usePlanPrices';
import { formatPlanPrice } from '../../../shared/planPrices.js';

function ConfirmDeleteModal({
  title, description, confirmWord = 'DELETE', accountName = '', confirmLabel, busy, error, onClose, onConfirm,
}) {
  const [typed, setTyped] = useState('');
  const value = typed.trim();
  const canSubmit = (value === confirmWord || (accountName && value === accountName)) && !busy;
  const hint = accountName
    ? `Type ${confirmWord} or your account name (${accountName}) to confirm`
    : `Type ${confirmWord} to confirm`;

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: C.sub }}>{description}</p>
      <Field label={hint}>
        <input
          className={inputClass}
          style={inputStyle}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmWord}
          autoFocus
          disabled={busy}
          autoComplete="off"
        />
      </Field>
      {error && <p className="text-xs mb-3" style={{ color: C.coral }}>{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="text-sm font-semibold px-4 py-2 rounded-full"
          style={{ color: C.sub }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onConfirm(value)}
          className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-40"
          style={{ background: C.coral }}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default function ProfilePanel({ initialUpgradeOpen = false, onUpgradeOpenConsumed }) {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const { workspaces, reload, createWorkspace, subscription, planTier, trialActive, trialDaysLeft } = useWorkspace();
  const { plans } = usePlanPrices();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [memberWorkspaces, setMemberWorkspaces] = useState([]);
  const [activeUserCount, setActiveUserCount] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dangerModal, setDangerModal] = useState(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerError, setDangerError] = useState('');
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [wipeNotice, setWipeNotice] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [tutorialBusy, setTutorialBusy] = useState(false);
  const [tutorialMsg, setTutorialMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(null);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  const [upgradeCycle, setUpgradeCycle] = useState('monthly');
  const isOwner = profile?.role === 'owner';
  const isPlatformAdmin = isPlatformAdminEmail(profile?.email || session?.user?.email);
  const accountName = profile?.accounts?.name || '';
  const hasStripeCustomer = Boolean(subscription?.stripe_customer_id);
  const hasStripeSubscription = Boolean(subscription?.stripe_subscription_id);

  useEffect(() => {
    if (!initialUpgradeOpen) return;
    setShowUpgrade(true);
    onUpgradeOpenConsumed?.();
  }, [initialUpgradeOpen, onUpgradeOpenConsumed]);

  useEffect(() => {
    setUpgradeCycle(subscription?.billing_cycle === 'annual' ? 'annual' : 'monthly');
  }, [subscription?.billing_cycle]);

  useEffect(() => {
    setFullName(profile?.full_name || '');
  }, [profile?.full_name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.account_id || !isOwner) {
        setActiveUserCount(null);
        return;
      }
      const { count, error: err } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', profile.account_id)
        .neq('is_active', false);
      if (cancelled) return;
      if (err) {
        setActiveUserCount(null);
        return;
      }
      setActiveUserCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [profile?.account_id, isOwner, workspaces.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id || isOwner) {
        setMemberWorkspaces([]);
        return;
      }
      const { data, error: err } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name)')
        .eq('user_id', profile.id);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      setMemberWorkspaces(
        (data || [])
          .map((row) => row.workspaces)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    })();
    return () => { cancelled = true; };
  }, [profile?.id, isOwner]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const handleManageBilling = async () => {
    setBillingError('');
    if (!hasStripeCustomer) {
      setBillingError('No billing information on file yet.');
      return;
    }
    setBillingBusy(true);
    try {
      await startBillingPortal({ accessToken: session?.access_token });
    } catch (err) {
      const msg = err.message || 'Could not open billing portal';
      setBillingError(
        msg.includes('No Stripe customer') || msg.includes('No billing')
          ? 'No billing information on file yet.'
          : msg,
      );
      setBillingBusy(false);
    }
  };

  const handleUpgradePlan = async (tier, billingCycle) => {
    setUpgradeError('');
    setUpgradeSuccess('');
    if (!hasStripeSubscription) {
      setUpgradeError('No active subscription to update. Complete checkout first.');
      return;
    }
    const key = `${tier}:${billingCycle}`;
    setUpgradeBusy(key);
    try {
      const result = await updateSubscriptionPlan(tier, billingCycle, {
        accessToken: session?.access_token,
      });
      setUpgradeSuccess(result.message || 'Plan updated. Billing will refresh in a moment.');
      await reload();
    } catch (err) {
      setUpgradeError(err.message || 'Could not update plan');
    } finally {
      setUpgradeBusy(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const email = profile?.email || session?.user?.email;
    if (!email) {
      setPasswordError('Could not determine your email.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordBusy(true);
    try {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyErr) {
        setPasswordError('Current password is incorrect');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Could not update password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const authHeaders = () => {
    const token = session?.access_token;
    if (!token) throw new Error('Not signed in');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const runDeleteData = async (confirm) => {
    setDangerBusy(true);
    setDangerError('');
    try {
      const res = await fetch('/api/delete-account-data', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete data');
      setDangerModal(null);
      setWipeNotice('All workspace data was deleted. Create a workspace to start again.');
      await reload();
      await refreshProfile();
      setShowCreateWs(true);
    } catch (err) {
      setDangerError(err.message);
    } finally {
      setDangerBusy(false);
    }
  };

  const runDeleteAccount = async (confirm) => {
    setDangerBusy(true);
    setDangerError('');
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.banFailures) && data.banFailures.length
          ? ` (${data.banFailures.map((f) => f.message).join('; ')})`
          : '';
        throw new Error(`${data.error || 'Could not delete account'}${detail}`);
      }
      await signOut();
      window.location.href = '/?account=deleted';
    } catch (err) {
      setDangerError(err.message);
      setDangerBusy(false);
    }
  };

  const runPlatformReset = async (confirm) => {
    setDangerBusy(true);
    setDangerError('');
    setResetNotice('');
    try {
      const res = await fetch('/api/admin-reset-except', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Platform reset failed');
      setDangerModal(null);
      const parts = [
        `${data.deletedAccounts ?? 0} accounts`,
        `${data.deletedAuthUsers ?? 0} auth users`,
        `${data.deletedStripeCustomers ?? 0} Stripe customers`,
      ];
      setResetNotice(`Platform reset complete: removed ${parts.join(', ')}. Your login and account were kept.`);
      if (Array.isArray(data.errors) && data.errors.length) {
        setResetNotice((prev) => `${prev} Some errors: ${data.errors.slice(0, 3).join('; ')}`);
      }
      await reload();
      await refreshProfile();
    } catch (err) {
      setDangerError(err.message);
    } finally {
      setDangerBusy(false);
    }
  };

  const restartTutorial = async () => {
    if (!profile?.id || tutorialBusy) return;
    setTutorialBusy(true);
    setTutorialMsg('');
    try {
      const { error: err } = await supabase
        .from('users')
        .update({ onboarding_completed_at: null })
        .eq('id', profile.id);
      if (err) throw err;
      await refreshProfile();
      setTutorialMsg('Tutorial restarted.');
    } catch (err) {
      setTutorialMsg(err.message || 'Could not restart tutorial.');
    } finally {
      setTutorialBusy(false);
    }
  };

  const planLimits = effectivePlanLimits(planTier, subscription);
  const statusLabel = subscription?.status || '—';
  const billingCycleLabel = subscription?.billing_cycle === 'annual'
    ? 'Annual'
    : subscription?.billing_cycle === 'monthly'
      ? 'Monthly'
      : '—';
  const currentCycle = subscription?.billing_cycle === 'annual' ? 'annual' : 'monthly';
  const currentRank = planTierRank(planTier);
  const planPriceLabel = formatPlanPrice(
    plans,
    planTier,
    currentCycle,
  );
  const nextBilling = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    })
    : null;
  const daysLeft = trialActive
    ? (typeof trialDaysLeft === 'number' ? trialDaysLeft : calcTrialDays(subscription))
    : 0;

  const upgradeOptions = ['solo', 'small', 'enterprise'].flatMap((tier) => {
    const cycles = tier === 'solo' ? ['monthly'] : ['monthly', 'annual'];
    return cycles
      .filter((cycle) => {
        const rank = planTierRank(tier);
        if (rank > currentRank) return true;
        if (rank === currentRank && cycle === 'annual' && currentCycle === 'monthly' && tier !== 'solo') {
          return true;
        }
        return false;
      })
      .map((cycle) => ({
        tier,
        cycle,
        label: PLAN_LABELS[tier],
        price: formatPlanPrice(plans, tier, cycle),
        blurb: tier === 'small'
          ? 'Schedule, Tasks, 5 more reports, 5 users, unlimited workspaces'
          : tier === 'enterprise'
            ? 'Unlimited users and workspaces'
            : '1 user, 1 workspace',
        limits: PLAN_LIMITS[tier],
      }));
  }).filter((opt) => {
    if (upgradeCycle === 'annual') return opt.cycle === 'annual' || opt.tier === 'solo';
    return opt.cycle === 'monthly';
  });

  const workspaceList = isOwner
    ? null
    : (memberWorkspaces.length ? memberWorkspaces : workspaces);

  return (
    <div className="flex-1 p-8 max-w-lg w-full mx-auto overflow-y-auto" style={BODY}>
      <h2 className="text-xl font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Profile</h2>
      <p className="text-sm mb-6" style={{ color: C.sub }}>Your account details for this ChangeView tenancy.</p>

      {wipeNotice && (
        <div
          className="mb-4 text-sm rounded-2xl border px-4 py-3"
          style={{ borderColor: tint(C.amber, '50'), background: tint(C.amber, '16'), color: C.ink }}
        >
          {wipeNotice}
        </div>
      )}

      {resetNotice && (
        <div
          className="mb-4 text-sm rounded-2xl border px-4 py-3"
          style={{ borderColor: tint(C.navy, '45'), background: tint(C.navy, '10'), color: C.ink }}
        >
          {resetNotice}
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: C.purple }}
          >
            {initials(profile?.full_name || profile?.email)}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: C.ink }}>{profile?.full_name || '—'}</div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: tint(C.purple, '18'), color: C.purple }}
            >
              {isOwner ? 'Owner' : 'Member'}
            </span>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            setSaved(false);
            const trimmed = fullName.trim();
            if (!trimmed) {
              setError('Full name is required.');
              return;
            }
            const { error: err } = await supabase
              .from('users')
              .update({ full_name: trimmed })
              .eq('id', profile.id);
            if (err) {
              setError(err.message);
              return;
            }
            await refreshProfile();
            setSaved(true);
          }}
        >
          <Field label="Full name">
            <input
              className={inputClass}
              style={inputStyle}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setSaved(false); }}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              style={{ ...inputStyle, background: C.bg }}
              value={profile?.email || ''}
              readOnly
              disabled
            />
          </Field>
          {accountName && (
            <Field label="Account">
              <input
                className={inputClass}
                style={{ ...inputStyle, background: C.bg }}
                value={accountName}
                readOnly
                disabled
              />
            </Field>
          )}
          <Field label="Workspaces">
            {isOwner ? (
              <p className="text-sm" style={{ color: C.ink }}>
                {workspaces.length === 0
                  ? 'No workspaces — create one to continue.'
                  : 'All workspaces (Owner)'}
              </p>
            ) : !workspaceList?.length ? (
              <p className="text-sm" style={{ color: C.sub }}>No workspace memberships found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {workspaceList.map((w) => (
                  <span
                    key={w.id || w}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: tint(C.teal, '18'), color: C.teal }}
                  >
                    {w.name || w}
                  </span>
                ))}
              </div>
            )}
          </Field>
          {error && <p className="text-xs mb-2" style={{ color: C.coral }}>{error}</p>}
          {saved && !error && <p className="text-xs mb-2" style={{ color: C.green }}>Saved.</p>}
          <SaveRow label="Save name" />
        </form>
      </div>

      {isOwner && (
        <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
          <h3 className="text-sm font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Your Plan</h3>
          <p className="text-xs mb-4" style={{ color: C.sub }}>
            Plan details for this account. Use Manage Billing to update payment or cancel in Stripe.
          </p>

          <dl className="space-y-2.5 mb-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt style={{ color: C.sub }}>Plan</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>
                {PLAN_LABELS[planTier] || planTier || '—'}
                {billingCycleLabel !== '—' ? ` · ${billingCycleLabel}` : ''}
                {planPriceLabel ? ` · ${planPriceLabel}` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: C.sub }}>Status</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>
                {statusLabel}
                {trialActive && (
                  <span className="font-medium" style={{ color: C.sub }}>
                    {daysLeft === 0
                      ? ' · trial ends today'
                      : daysLeft === 1
                        ? ' · 1 day left'
                        : ` · ${daysLeft} days left`}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: C.sub }}>Next billing</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>
                {nextBilling || (subscription?.status === 'incomplete' ? 'After checkout' : '—')}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: C.sub }}>Workspaces</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>
                {formatPlanLimit(workspaces.length, planLimits.workspaces)} Workspaces
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt style={{ color: C.sub }}>Users</dt>
              <dd className="font-semibold text-right" style={{ color: C.ink }}>
                {activeUserCount == null
                  ? '—'
                  : `${formatPlanLimit(activeUserCount, planLimits.users)} users`}
              </dd>
            </div>
          </dl>

          {!hasStripeCustomer ? (
            <p className="text-sm" style={{ color: C.sub }}>No billing information on file yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={billingBusy}
                onClick={handleManageBilling}
                className="inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-full disabled:opacity-50"
                style={{ background: C.purple }}
              >
                <CreditCard size={15} />
                {billingBusy ? 'Opening…' : 'Manage Billing'}
              </button>
              {hasStripeSubscription && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgrade((v) => !v);
                    setUpgradeError('');
                    setUpgradeSuccess('');
                  }}
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full border"
                  style={{ borderColor: C.purple, color: C.purple, background: tint(C.purple, '10') }}
                >
                  <Sparkles size={15} />
                  {showUpgrade ? 'Hide upgrades' : 'Upgrade Plan'}
                </button>
              )}
            </div>
          )}
          {billingError && <p className="text-xs mt-3" style={{ color: C.coral }}>{billingError}</p>}

          {showUpgrade && hasStripeSubscription && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: C.border }}>
              <p className="text-xs mb-3" style={{ color: C.sub }}>
                You’ll be charged the prorated difference immediately, and your billing cycle restarts today
                {trialActive ? ' (after trial ends if you’re still trialing)' : ''}.
              </p>
              {planTier !== 'solo' && (
                <div className="flex gap-2 mb-3">
                  {['monthly', 'annual'].map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setUpgradeCycle(cycle)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{
                        background: upgradeCycle === cycle ? C.purple : tint(C.purple, '12'),
                        color: upgradeCycle === cycle ? '#fff' : C.purple,
                      }}
                    >
                      {cycle === 'annual' ? 'Annual' : 'Monthly'}
                    </button>
                  ))}
                </div>
              )}
              {!upgradeOptions.length ? (
                <p className="text-sm" style={{ color: C.sub }}>
                  You’re on the highest plan
                  {currentCycle === 'annual' ? '' : ' for this billing cycle'}.
                </p>
              ) : (
                <div className="space-y-3">
                  {upgradeOptions.map((opt) => {
                    const busyKey = `${opt.tier}:${opt.cycle}`;
                    return (
                      <div
                        key={busyKey}
                        className="rounded-2xl border p-4"
                        style={{ borderColor: C.border }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>
                              {opt.label}
                              <span className="font-semibold ml-1" style={{ color: C.sub }}>
                                · {opt.cycle === 'annual' ? 'Annual' : 'Monthly'}
                              </span>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: C.sub }}>{opt.blurb}</p>
                          </div>
                          <div className="text-sm font-bold shrink-0" style={{ color: C.ink }}>
                            {opt.price || '—'}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={Boolean(upgradeBusy)}
                          onClick={() => handleUpgradePlan(opt.tier, opt.cycle)}
                          className="text-sm font-bold text-white px-4 py-2 rounded-full disabled:opacity-50"
                          style={{ background: C.purple }}
                        >
                          {upgradeBusy === busyKey ? 'Updating…' : `Upgrade to ${opt.label}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {upgradeError && <p className="text-xs mt-3" style={{ color: C.coral }}>{upgradeError}</p>}
              {upgradeSuccess && <p className="text-xs mt-3" style={{ color: C.green }}>{upgradeSuccess}</p>}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Help</h3>
        <p className="text-xs mb-3" style={{ color: C.sub }}>
          Replay the short product tour, or open the full written guide.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={tutorialBusy}
            onClick={restartTutorial}
            className="text-sm font-semibold underline disabled:opacity-50"
            style={{ color: C.purple }}
          >
            {tutorialBusy ? 'Starting…' : 'Show tutorial again'}
          </button>
          <Link
            to="/guide"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: C.purple }}
          >
            Open user guide
          </Link>
        </div>
        {tutorialMsg && (
          <p className="text-xs mt-2" style={{ color: C.sub }}>{tutorialMsg}</p>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-5 mb-4" style={{ borderColor: C.border }}>
        <h3 className="text-sm font-extrabold mb-1" style={{ ...HEAD, color: C.ink }}>Change password</h3>
        <p className="text-xs mb-4" style={{ color: C.sub }}>
          Enter your current password, then choose a new one (at least 8 characters).
        </p>
        <form onSubmit={handleChangePassword}>
          <Field label="Current password">
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              style={inputStyle}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
              style={inputStyle}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(''); }}
            />
          </Field>
          {passwordError && <p className="text-xs mb-2" style={{ color: C.coral }}>{passwordError}</p>}
          {passwordSuccess && !passwordError && (
            <p className="text-xs mb-2" style={{ color: C.green }}>{passwordSuccess}</p>
          )}
          <SaveRow label={passwordBusy ? 'Updating…' : 'Update password'} disabled={passwordBusy} />
        </form>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-2xl border bg-white mb-8"
        style={{ color: C.coral, borderColor: C.border }}
      >
        <LogOut size={15} /> Sign out
      </button>

      {isOwner && (
        <section className="rounded-3xl border p-5" style={{ borderColor: tint(C.coral, '45'), background: tint(C.coral, '08') }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} style={{ color: C.coral }} />
            <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Danger zone</h3>
          </div>
          <p className="text-xs mb-5" style={{ color: C.sub }}>
            These actions are permanent for your data. Deleting the account also cancels billing.
          </p>

          <div className="bg-white rounded-2xl border p-4 mb-3" style={{ borderColor: C.border }}>
            <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>Delete all data</div>
            <p className="text-xs mb-3" style={{ color: C.sub }}>
              Removes every Workspace and everything under it. Keeps your login and subscription so you can start fresh.
            </p>
            <button
              type="button"
              onClick={() => { setDangerError(''); setDangerModal('data'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border"
              style={{ color: C.coral, borderColor: tint(C.coral, '55'), background: tint(C.coral, '12') }}
            >
              <Trash2 size={13} /> Delete all data
            </button>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: tint(C.coral, '40') }}>
            <div className="text-sm font-bold mb-1" style={{ color: C.coral }}>Delete account</div>
            <p className="text-xs mb-3" style={{ color: C.sub }}>
              Cancels billing, blocks every user on this account from logging in, and permanently removes all data.
              The account record is retained briefly for support recovery.
            </p>
            <button
              type="button"
              onClick={() => { setDangerError(''); setDangerModal('account'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-full"
              style={{ background: C.coral }}
            >
              <Trash2 size={13} /> Delete account
            </button>
          </div>
        </section>
      )}

      {isPlatformAdmin && (
        <section
          className="rounded-3xl border p-5 mt-4"
          style={{ borderColor: tint(C.ink, '35'), background: tint(C.ink, '06') }}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} style={{ color: C.ink }} />
            <h3 className="text-sm font-extrabold" style={{ ...HEAD, color: C.ink }}>Platform admin</h3>
          </div>
          <p className="text-xs mb-5" style={{ color: C.sub }}>
            Visible only to you. Purges every other tenancy so test resets stay consistent.
          </p>
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: tint(C.coral, '40') }}>
            <div className="text-sm font-bold mb-1" style={{ color: C.coral }}>Reset platform (keep my login)</div>
            <p className="text-xs mb-3" style={{ color: C.sub }}>
              Permanently deletes every other account, workspace, app user, Auth login, and Stripe customer.
              Keeps your email, account, subscription, and workspaces.
            </p>
            <button
              type="button"
              onClick={() => { setDangerError(''); setDangerModal('platform-reset'); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-full"
              style={{ background: C.ink }}
            >
              <Trash2 size={13} /> Reset all except me
            </button>
          </div>
        </section>
      )}

      {dangerModal === 'data' && (
        <ConfirmDeleteModal
          title="Delete all data"
          description="This permanently deletes every Workspace and all Programs, Initiatives, Impacts, Requirements, Tasks, and related records. Your login and subscription stay active."
          accountName={accountName}
          confirmLabel="Delete all data"
          busy={dangerBusy}
          error={dangerError}
          onClose={() => setDangerModal(null)}
          onConfirm={runDeleteData}
        />
      )}

      {dangerModal === 'account' && (
        <ConfirmDeleteModal
          title="Delete account"
          description="This will: (1) cancel your Stripe subscription, (2) block every user on this account from logging in, and (3) permanently delete all workspace data."
          accountName={accountName}
          confirmLabel="Delete account forever"
          busy={dangerBusy}
          error={dangerError}
          onClose={() => setDangerModal(null)}
          onConfirm={runDeleteAccount}
        />
      )}

      {dangerModal === 'platform-reset' && (
        <ConfirmDeleteModal
          title="Reset platform"
          description="This permanently deletes every other account, workspace, user, Auth login, and Stripe customer. Your login, account, subscription, and workspaces are kept. This cannot be undone."
          confirmWord={PLATFORM_RESET_CONFIRM}
          confirmLabel="Reset platform"
          busy={dangerBusy}
          error={dangerError}
          onClose={() => setDangerModal(null)}
          onConfirm={runPlatformReset}
        />
      )}

      {showCreateWs && (
        <Modal title="Create a workspace" onClose={() => setShowCreateWs(false)}>
          <FormWorkspace
            onSave={async (name) => {
              await createWorkspace(name);
              setShowCreateWs(false);
              setWipeNotice('');
            }}
          />
        </Modal>
      )}
    </div>
  );
}
