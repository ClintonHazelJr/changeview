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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setRequirements([]);
      setInitiatives([]);
      setPeople([]);
      setImpacts([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [r, i, p, imp, t] = await Promise.all([
      supabase
        .from('requirements')
        .select('*, requirement_impacts(impact_id)')
        .eq('workspace_id', ws)
        .order('created_at', { ascending: false }),
      supabase.from('initiatives').select('id, name').eq('workspace_id', ws).order('name'),
      supabase.from('people').select('id, name, title, email, department_id').eq('workspace_id', ws).order('name'),
      supabase.from('impacts').select('id, initiative_id, reference_number, impact_description, department_id').eq('workspace_id', ws).order('created_at', { ascending: false }),
      supabase.from('tasks').select('id, name, status, initiative_id').eq('workspace_id', ws).order('created_at', { ascending: false }),
    ]);

    const reqRows = r.data || [];
    const reqIds = reqRows.map((row) => row.id);
    let linksByReq = {};
    const tasksAvailable = !t.error;
    if (tasksAvailable && reqIds.length) {
      const { data: links, error: linkErr } = await supabase
        .from('task_requirements')
        .select('task_id, requirement_id')
        .in('requirement_id', reqIds);
      if (!linkErr) {
        (links || []).forEach((link) => {
          if (!linksByReq[link.requirement_id]) linksByReq[link.requirement_id] = [];
          linksByReq[link.requirement_id].push(link.task_id);
        });
      }
    }

    setRequirements(reqRows.map((row) => ({
      ...row,
      impactIds: (row.requirement_impacts || []).map((x) => x.impact_id),
      taskIds: linksByReq[row.id] || [],
    })));
    setInitiatives(i.data || []);
    setPeople(p.data || []);
    setImpacts(imp.data || []);
    setTasks(tasksAvailable ? (t.data || []) : []);
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
      await supabase.from('task_requirements').delete().eq('requirement_id', existingId); // no-op if table missing / empty
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

    const taskIds = vals.taskIds || [];
    if (taskIds.length) {
      const { error: taskLinkError } = await supabase.from('task_requirements').insert(
        taskIds.map((taskId) => ({
          account_id: profile.account_id,
          workspace_id: activeWorkspaceId,
          task_id: taskId,
          requirement_id: req.id,
        })),
      );
      if (taskLinkError) throw new Error(parseDbError(taskLinkError));
    }

    await load();
    return req;
  };

  return {
    requirements, initiatives, people, impacts, tasks, loading, reload: load, saveRequirement,
  };
}
