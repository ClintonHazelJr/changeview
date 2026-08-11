import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function useAdminData() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [people, setPeople] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setOrgs([]); setDepartments([]); setPeople([]); setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [o, d, p, t] = await Promise.all([
      supabase.from('organizations').select('*').eq('workspace_id', ws).order('name'),
      supabase.from('departments').select('*').eq('workspace_id', ws).order('name'),
      supabase.from('people').select('*').eq('workspace_id', ws).order('name'),
      supabase.from('project_teams').select('*, project_team_members(*)').eq('workspace_id', ws).order('name'),
    ]);
    setOrgs(o.data || []);
    setDepartments(d.data || []);
    setPeople(p.data || []);
    setTeams((t.data || []).map((team) => ({
      ...team,
      members: team.project_team_members || [],
    })));
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const accountId = profile?.account_id;
  const workspaceId = activeWorkspaceId;

  const addOrg = async (name) => {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ account_id: accountId, workspace_id: workspaceId, name })
      .select()
      .single();
    if (error) throw error;
    await load();
    return data;
  };

  const addDepartment = async ({ orgId, name, location }) => {
    const { error } = await supabase.from('departments').insert({
      account_id: accountId, workspace_id: workspaceId, org_id: orgId, name, location,
    });
    if (error) throw error;
    await load();
  };

  const addPerson = async ({ departmentId, name, title, email }) => {
    const { error } = await supabase.from('people').insert({
      account_id: accountId, workspace_id: workspaceId, department_id: departmentId, name, title, email,
    });
    if (error) throw error;
    await load();
  };

  const addTeam = async (name) => {
    const { error } = await supabase.from('project_teams').insert({
      account_id: accountId, workspace_id: workspaceId, name,
    });
    if (error) throw error;
    await load();
  };

  const addTeamMember = async (teamId, personId, role) => {
    const { error } = await supabase.from('project_team_members').insert({
      account_id: accountId, workspace_id: workspaceId, team_id: teamId, person_id: personId, role,
    });
    if (error) throw error;
    await load();
  };

  return {
    orgs, departments, people, teams, loading, reload: load,
    addOrg, addDepartment, addPerson, addTeam, addTeamMember,
  };
}
