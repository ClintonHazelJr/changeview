import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDbError } from '../lib/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function usePrograms() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setPrograms([]);
      setOrgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [p, o] = await Promise.all([
      supabase.from('programs').select('*').eq('workspace_id', ws).order('created_at', { ascending: false }),
      supabase.from('organizations').select('id, name').eq('workspace_id', ws).order('name'),
    ]);
    setPrograms(p.data || []);
    setOrgs(o.data || []);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const addProgram = async (vals) => {
    const { data, error } = await supabase
      .from('programs')
      .insert({
        account_id: profile.account_id,
        workspace_id: activeWorkspaceId,
        organization_id: vals.organizationId,
        name: vals.name,
        description: vals.description || null,
        status: vals.status || 'planning',
        start_date: vals.startDate || null,
        proposed_go_live_date: vals.goLiveDate || null,
        budget: vals.budget ? Number(vals.budget) : null,
        goal: vals.goal || null,
        benefits: vals.benefits || null,
        program_manager_id: vals.programManagerId || null,
        sponsor_id: vals.sponsorId || null,
      })
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const updateProgram = async (id, vals) => {
    const { data, error } = await supabase
      .from('programs')
      .update({
        organization_id: vals.organizationId,
        name: vals.name,
        description: vals.description || null,
        status: vals.status || 'planning',
        start_date: vals.startDate || null,
        proposed_go_live_date: vals.goLiveDate || null,
        budget: vals.budget ? Number(vals.budget) : null,
        goal: vals.goal || null,
        benefits: vals.benefits || null,
        program_manager_id: vals.programManagerId || null,
        sponsor_id: vals.sponsorId || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const setProgramArchived = async (id, archived) => {
    const { error } = await supabase
      .from('programs')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  return {
    programs, orgs, loading, reload: load,
    addProgram, updateProgram, setProgramArchived,
  };
}
