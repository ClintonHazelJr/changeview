import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { packInitiativeMeta, parseDbError } from '../lib/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function useInitiatives() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setInitiatives([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('initiatives')
      .select('*')
      .eq('workspace_id', activeWorkspaceId)
      .order('created_at', { ascending: false });
    if (!error) setInitiatives(data || []);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const addInitiative = async (vals) => {
    const { data: programs, error: progError } = await supabase
      .from('programs')
      .select('id')
      .eq('workspace_id', activeWorkspaceId)
      .eq('name', 'General')
      .order('created_at')
      .limit(1);

    if (progError || !programs?.length) {
      throw new Error('Create an Org in System Admin first.');
    }

    const programId = programs[0].id;
    const description = packInitiativeMeta(vals.description, {
      changeOwner: vals.changeOwner || '',
      projectManager: vals.projectManager || '',
    });

    const { data, error } = await supabase
      .from('initiatives')
      .insert({
        account_id: profile.account_id,
        workspace_id: activeWorkspaceId,
        program_id: programId,
        name: vals.name,
        description,
        status: 'planning',
        proposed_go_live_date: vals.goLiveDate || null,
        budget: vals.budget ? Number(vals.budget) : null,
        use_case: vals.useCase,
        expected_benefits: vals.expectedBenefits,
      })
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  return { initiatives, loading, reload: load, addInitiative };
}

export function useInitiativeDetail(initiativeId) {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [initiative, setInitiative] = useState(null);
  const [impacts, setImpacts] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [learningNeeds, setLearningNeeds] = useState([]);
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!initiativeId || !activeWorkspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [i, imp, st, ln, co] = await Promise.all([
      supabase.from('initiatives').select('*').eq('id', initiativeId).single(),
      supabase.from('impacts').select('*').eq('initiative_id', initiativeId).order('created_at'),
      supabase.from('stakeholders').select('*').eq('initiative_id', initiativeId).order('created_at'),
      supabase.from('learning_needs').select('*').eq('workspace_id', activeWorkspaceId).order('created_at'),
      supabase.from('comms').select('*').eq('initiative_id', initiativeId).order('created_at'),
    ]);
    setInitiative(i.data);
    setImpacts(imp.data || []);
    setStakeholders(st.data || []);
    const impactIds = new Set((imp.data || []).map((x) => x.id));
    setLearningNeeds((ln.data || []).filter((x) => impactIds.has(x.impact_id)));
    setComms(co.data || []);
    setLoading(false);
  }, [initiativeId, activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const accountId = profile?.account_id;
  const workspaceId = activeWorkspaceId;

  const addImpact = async (v) => {
    const { error } = await supabase.from('impacts').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      department_id: v.departmentId,
      headcount_impacted: v.headcount,
      current_state_system: v.currentSystem,
      current_state_process: v.currentProcess,
      future_state_system: v.futureSystem,
      future_state_process: v.futureProcess,
      impact_description: v.description,
      severity_org: v.severity.org,
      severity_people: v.severity.people,
      severity_process: v.severity.process,
      severity_system: v.severity.system,
      severity_environment: v.severity.environment,
      intervention_tags: v.tags.map((t) => t.toLowerCase()),
    });
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const addStakeholder = async (v) => {
    const { error } = await supabase.from('stakeholders').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      person_id: v.personId,
      project_role: v.role,
      raci_responsible: v.raci.r,
      raci_accountable: v.raci.a,
      raci_consulted: v.raci.c,
      raci_informed: v.raci.i,
    });
    if (error) throw error;
    await load();
  };

  const addLearningNeed = async (v) => {
    const { error } = await supabase.from('learning_needs').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      impact_id: v.impactId,
      team: v.team,
      goal: v.goal,
      headcount: v.headcount,
      type: v.type,
      session_count: v.sessions,
      time_hours: v.hours,
    });
    if (error) throw error;
    await load();
  };

  const addComms = async (v) => {
    const { error } = await supabase.from('comms').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      impact_id: v.impactId || null,
      key_message: v.keyMessage,
      audience: v.audience.map((a) => a.toLowerCase()),
      tone: v.tone,
      channel: v.channel.map((c) => c.toLowerCase()),
      ai_prompt_used: v.prompt,
      ai_generated_content: v.generated,
      final_content: v.finalContent,
      status: 'draft',
    });
    if (error) throw error;
    await load();
  };

  return {
    initiative, impacts, stakeholders, learningNeeds, comms, loading, reload: load,
    addImpact, addStakeholder, addLearningNeed, addComms,
  };
}
