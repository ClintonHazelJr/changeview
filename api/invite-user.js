import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = adminClient();
  if (!admin) {
    return res.status(500).json({ error: 'Invite service not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const callerId = authData.user.id;
  const { data: caller, error: callerErr } = await admin
    .from('users')
    .select('id, account_id, role, email, full_name')
    .eq('id', callerId)
    .single();
  if (callerErr || !caller) return res.status(403).json({ error: 'Profile not found' });
  if (caller.role !== 'owner') return res.status(403).json({ error: 'Only account owners can invite users' });

  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan_tier, status, trial_ends_at')
    .eq('account_id', caller.account_id)
    .maybeSingle();
  const trialActive = sub?.status === 'trialing'
    && sub?.trial_ends_at
    && new Date(sub.trial_ends_at).getTime() > Date.now();
  const canInvite = trialActive
    || ((sub?.plan_tier === 'small' || sub?.plan_tier === 'tier_2')
      && (sub?.status === 'active' || sub?.status === 'past_due'));
  if (!canInvite) {
    return res.status(403).json({ error: 'Inviting users requires Business, Enterprise, or an active trial' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const workspaceIds = Array.isArray(req.body?.workspaceIds)
    ? [...new Set(req.body.workspaceIds.filter(Boolean))]
    : [];

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (workspaceIds.length === 0) {
    return res.status(400).json({ error: 'Select at least one workspace' });
  }

  const { data: workspaces, error: wsErr } = await admin
    .from('workspaces')
    .select('id')
    .eq('account_id', caller.account_id)
    .in('id', workspaceIds);
  if (wsErr) return res.status(500).json({ error: wsErr.message });
  if (!workspaces?.length || workspaces.length !== workspaceIds.length) {
    return res.status(400).json({ error: 'One or more workspaces are invalid for this account' });
  }

  const defaultWorkspaceId = workspaceIds[0];
  const fullName = email.split('@')[0];
  let origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  if (req.headers.origin) origin = req.headers.origin;
  else if (req.headers.referer) {
    try { origin = new URL(req.headers.referer).origin; } catch { /* keep default */ }
  }
  origin = String(origin).replace(/\/$/, '');
  // Invites must land on the accept-invite page, never the marketing homepage.
  const redirectTo = `${origin}/accept-invite`;

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      full_name: fullName,
      invited_to_account_id: caller.account_id,
      default_workspace_id: defaultWorkspaceId,
    },
  });
  if (inviteErr) {
    return res.status(400).json({ error: inviteErr.message || 'Invite failed' });
  }

  const userId = invited?.user?.id;
  if (!userId) return res.status(500).json({ error: 'Invite succeeded but no user id returned' });

  // Trigger should create public.users; upsert as a safety net for race/retry cases.
  const { error: userUpsertErr } = await admin.from('users').upsert({
    id: userId,
    account_id: caller.account_id,
    email,
    full_name: fullName,
    role: 'member',
    default_workspace_id: defaultWorkspaceId,
  }, { onConflict: 'id' });
  if (userUpsertErr) {
    return res.status(500).json({ error: `User row failed: ${userUpsertErr.message}` });
  }

  const memberRows = workspaceIds.map((workspace_id) => ({
    account_id: caller.account_id,
    workspace_id,
    user_id: userId,
    role: 'member',
  }));
  const { error: memberErr } = await admin.from('workspace_members').upsert(memberRows, {
    onConflict: 'workspace_id,user_id',
  });
  if (memberErr) {
    return res.status(500).json({ error: `Workspace access failed: ${memberErr.message}` });
  }

  return res.status(200).json({ ok: true, userId, email });
}
