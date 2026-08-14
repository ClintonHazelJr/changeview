import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDbError } from '../lib/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function useTasks() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [people, setPeople] = useState([]);
  const [teams, setTeams] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setTasks([]);
      setInitiatives([]);
      setPeople([]);
      setTeams([]);
      setRequirements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [t, i, p, tm, r] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, task_requirements(requirement_id)')
        .eq('workspace_id', ws)
        .order('created_at', { ascending: false }),
      supabase.from('initiatives').select('id, name').eq('workspace_id', ws).order('name'),
      supabase.from('people').select('id, name, title, email, department_id').eq('workspace_id', ws).order('name'),
      supabase.from('project_teams').select('id, name').eq('workspace_id', ws).order('name'),
      supabase.from('requirements').select('id, description, initiative_id, reference_number').eq('workspace_id', ws).order('created_at', { ascending: false }),
    ]);
    setTasks((t.data || []).map((row) => ({
      ...row,
      requirementIds: (row.task_requirements || []).map((x) => x.requirement_id),
    })));
    setInitiatives(i.data || []);
    setPeople(p.data || []);
    setTeams(tm.data || []);
    setRequirements(r.data || []);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const saveTask = async (vals, existingId = null) => {
    const payload = {
      account_id: profile.account_id,
      workspace_id: activeWorkspaceId,
      initiative_id: vals.initiativeId,
      name: vals.name.trim(),
      description: vals.description || null,
      assignee_id: vals.assigneeId || null,
      project_team_id: vals.projectTeamId || null,
      status: vals.status || 'backlog',
      priority: vals.priority || null,
      effort_estimate: vals.effortEstimate || null,
      start_date: vals.startDate || null,
      finish_date: vals.finishDate || null,
      sprint: vals.sprint || null,
      pi: vals.pi || null,
      updated_at: new Date().toISOString(),
    };

    let task;
    if (existingId) {
      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', existingId)
        .select()
        .single();
      if (error) throw new Error(parseDbError(error));
      task = data;
      await supabase.from('task_requirements').delete().eq('task_id', existingId);
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(parseDbError(error));
      task = data;
    }

    const requirementIds = vals.requirementIds || [];
    if (requirementIds.length) {
      const { error: linkError } = await supabase.from('task_requirements').insert(
        requirementIds.map((requirementId) => ({
          account_id: profile.account_id,
          workspace_id: activeWorkspaceId,
          task_id: task.id,
          requirement_id: requirementId,
        })),
      );
      if (linkError) throw new Error(parseDbError(linkError));
    }

    await load();
    return task;
  };

  const updateTaskStatus = async (taskId, status) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw new Error(parseDbError(error));
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const deleteTask = async (taskId) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  return {
    tasks,
    initiatives,
    people,
    teams,
    requirements,
    loading,
    reload: load,
    saveTask,
    updateTaskStatus,
    deleteTask,
  };
}
