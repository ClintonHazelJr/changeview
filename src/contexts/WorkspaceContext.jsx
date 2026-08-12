import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { parseDbError } from '../lib/constants';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { profile, refreshProfile } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [planTier, setPlanTier] = useState('tier_1');
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    if (!profile) {
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setLoading(false);
      return;
    }

    let query = supabase.from('workspaces').select('*').order('created_at');
    const { data, error } = await query;
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setWorkspaces(data || []);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_tier')
      .eq('account_id', profile.account_id)
      .single();
    if (sub) setPlanTier(sub.plan_tier);

    const wsId = profile.default_workspace_id || data?.[0]?.id;
    setActiveWorkspaceId(wsId);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    loadWorkspaces();
  }, [loadWorkspaces]);

  const switchWorkspace = async (id) => {
    setActiveWorkspaceId(id);
    if (profile?.id) {
      await supabase.from('users').update({ default_workspace_id: id }).eq('id', profile.id);
      refreshProfile();
    }
  };

  const createWorkspace = async (name) => {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ account_id: profile.account_id, name })
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    setWorkspaces((prev) => [...prev, data]);
    await switchWorkspace(data.id);
    return data;
  };

  const renameWorkspace = async (id, name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Workspace name is required.');
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name: trimmed })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? data : w)));
    return data;
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      planTier,
      loading,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      reload: loadWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
