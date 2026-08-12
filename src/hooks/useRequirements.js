import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDbError } from '../lib/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function useRequirements() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [people, setPeople] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setRequirements([]);
      setInitiatives([]);
      setPeople([]);
      setImpacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [r, i, p, imp] = await Promise.all([
      supabase
        .from('requirements')
        .select('*, requirement_impacts(impact_id)')
        .eq('workspace_id', ws)
        .order('created_at', { ascending: false }),
      supabase.from('initiatives').select('id, name').eq('workspace_id', ws).order('name'),
      supabase.from('people').select('id, name').eq('workspace_id', ws).order('name'),
      supabase.from('impacts').select('id, initiative_id, reference_number, impact_description, department_id').eq('workspace_id', ws).order('created_at', { ascending: false }),
    ]);
    setRequirements((r.data || []).map((row) => ({
      ...row,
      impactIds: (row.requirement_impacts || []).map((x) => x.impact_id),
    })));
    setInitiatives(i.data || []);
    setPeople(p.data || []);
    setImpacts(imp.data || []);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const saveRequirement = async (vals, existingId = null) => {
    const payload = {
      account_id: profile.account_id,
      workspace_id: activeWorkspaceId,
      initiative_id: vals.initiativeId,
      description: vals.description,
      status: vals.status || 'draft',
      priority: vals.priority || null,
      author_id: vals.authorId || null,
      business_approver_id: vals.approverId || null,
    };

    let req;
    if (existingId) {
      const { data, error } = await supabase
        .from('requirements')
        .update(payload)
        .eq('id', existingId)
        .select()
        .single();
      if (error) throw new Error(parseDbError(error));
      req = data;
      await supabase.from('requirement_impacts').delete().eq('requirement_id', existingId);
    } else {
      const { data, error } = await supabase
        .from('requirements')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(parseDbError(error));
      req = data;
    }

    const impactIds = vals.impactIds || [];
    if (impactIds.length) {
      const { error: linkError } = await supabase.from('requirement_impacts').insert(
        impactIds.map((impactId) => ({
          account_id: profile.account_id,
          workspace_id: activeWorkspaceId,
          requirement_id: req.id,
          impact_id: impactId,
        })),
      );
      if (linkError) throw new Error(parseDbError(linkError));
    }

    await load();
    return req;
  };

  return {
    requirements, initiatives, people, impacts, loading, reload: load, saveRequirement,
  };
}
