import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseDbError, stripInitiativeMeta } from '../lib/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export function useInitiatives() {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [initiatives, setInitiatives] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setInitiatives([]);
      setPrograms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ws = activeWorkspaceId;
    const [i, p] = await Promise.all([
      supabase
        .from('initiatives')
        .select('*')
        .eq('workspace_id', ws)
        .order('updated_at', { ascending: false }),
      supabase
        .from('programs')
        .select('id, name, organization_id')
        .eq('workspace_id', ws)
        .order('name'),
    ]);
    if (!i.error) setInitiatives(i.data || []);
    if (!p.error) setPrograms(p.data || []);
    setLoading(false);
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const addInitiative = async (vals) => {
    if (!vals.programId) {
      throw new Error('Select a Program, or create one under Program first.');
    }

    const { data, error } = await supabase
      .from('initiatives')
      .insert({
        account_id: profile.account_id,
        workspace_id: activeWorkspaceId,
        program_id: vals.programId,
        name: vals.name,
        description: stripInitiativeMeta(vals.description),
        status: vals.status || 'planning',
        start_date: vals.startDate || null,
        proposed_go_live_date: vals.goLiveDate || null,
        budget: vals.budget ? Number(vals.budget) : null,
        use_case: vals.useCase,
        expected_benefits: vals.expectedBenefits,
        change_owner_id: vals.changeOwnerId || null,
        product_owner_id: vals.productOwnerId || null,
        business_owner_id: vals.businessOwnerId || null,
        project_manager_id: vals.projectManagerId || null,
      })
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const updateInitiative = async (id, vals) => {
    if (!vals.programId) {
      throw new Error('Select a Program, or create one under Program first.');
    }
    const { data, error } = await supabase
      .from('initiatives')
      .update({
        program_id: vals.programId,
        name: vals.name,
        description: stripInitiativeMeta(vals.description),
        status: vals.status || 'planning',
        start_date: vals.startDate || null,
        proposed_go_live_date: vals.goLiveDate || null,
        budget: vals.budget !== '' && vals.budget != null ? Number(vals.budget) : null,
        use_case: vals.useCase,
        expected_benefits: vals.expectedBenefits,
        change_owner_id: vals.changeOwnerId || null,
        product_owner_id: vals.productOwnerId || null,
        business_owner_id: vals.businessOwnerId || null,
        project_manager_id: vals.projectManagerId || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  return { initiatives, programs, loading, reload: load, addInitiative, updateInitiative };
}

export function useInitiativeDetail(initiativeId) {
  const { activeWorkspaceId } = useWorkspace();
  const { profile } = useAuth();
  const [initiative, setInitiative] = useState(null);
  const [impacts, setImpacts] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [learningNeeds, setLearningNeeds] = useState([]);
  const [comms, setComms] = useState([]);
  const [hypercare, setHypercare] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!initiativeId || !activeWorkspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [init, imp, stk, ln, cm, hc] = await Promise.all([
      supabase.from('initiatives').select('*').eq('id', initiativeId).single(),
      supabase.from('impacts').select('*').eq('initiative_id', initiativeId).order('created_at'),
      supabase.from('stakeholders').select('*').eq('initiative_id', initiativeId).order('created_at'),
      supabase.from('learning_needs').select('*').eq('workspace_id', activeWorkspaceId).order('created_at'),
      supabase.from('comms').select('*').eq('initiative_id', initiativeId).order('created_at'),
      supabase.from('hypercare').select('*').eq('initiative_id', initiativeId).maybeSingle(),
    ]);
    setInitiative(init.data);
    setImpacts(imp.data || []);
    setStakeholders(stk.data || []);
    const impactIds = new Set((imp.data || []).map((x) => x.id));
    setLearningNeeds((ln.data || []).filter((x) => impactIds.has(x.impact_id)));
    setComms(cm.data || []);
    setHypercare(hc.data || null);
    setLoading(false);
  }, [initiativeId, activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const accountId = profile?.account_id;
  const workspaceId = activeWorkspaceId;

  const impactPayload = (vals) => ({
    department_id: vals.departmentId,
    headcount_impacted: vals.headcount,
    current_state_system: vals.currentSystem,
    current_state_process: vals.currentProcess,
    future_state_system: vals.futureSystem,
    future_state_process: vals.futureProcess,
    impact_description: vals.description,
    severity_org: vals.severity.org,
    severity_people: vals.severity.people,
    severity_process: vals.severity.process,
    severity_system: vals.severity.system,
    severity_environment: vals.severity.environment,
    intervention_tags: vals.tags.map((t) => t.toLowerCase()),
    status: vals.status || 'draft',
  });

  const addImpact = async (vals) => {
    const { data, error } = await supabase.from('impacts').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      ...impactPayload(vals),
    }).select().single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const updateImpact = async (id, vals) => {
    const { data, error } = await supabase.from('impacts').update(impactPayload(vals)).eq('id', id).select().single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const deleteImpact = async (id) => {
    const { error } = await supabase.from('impacts').delete().eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const stakeholderPayload = (vals) => ({
    person_id: vals.personId,
    project_role: vals.role,
    raci_responsible: vals.raci.r,
    raci_accountable: vals.raci.a,
    raci_consulted: vals.raci.c,
    raci_informed: vals.raci.i,
  });

  const addStakeholder = async (vals) => {
    const { error } = await supabase.from('stakeholders').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      ...stakeholderPayload(vals),
    });
    if (error) throw error;
    await load();
  };

  const updateStakeholder = async (id, vals) => {
    const { error } = await supabase.from('stakeholders').update(stakeholderPayload(vals)).eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const deleteStakeholder = async (id) => {
    const { error } = await supabase.from('stakeholders').delete().eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const learningPayload = (vals) => ({
    impact_id: vals.impactId,
    team: vals.team,
    goal: vals.goal,
    headcount: vals.headcount,
    type: vals.type,
    session_count: vals.sessions,
    time_hours: vals.hours,
    status: vals.status || 'draft',
  });

  const addLearningNeed = async (vals) => {
    const { data, error } = await supabase.from('learning_needs').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      ...learningPayload(vals),
    }).select().single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const updateLearningNeed = async (id, vals) => {
    const { data, error } = await supabase.from('learning_needs').update(learningPayload(vals)).eq('id', id).select().single();
    if (error) throw new Error(parseDbError(error));
    await load();
    return data;
  };

  const deleteLearningNeed = async (id) => {
    const { error } = await supabase.from('learning_needs').delete().eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const commsPayload = (vals) => ({
    impact_id: vals.impactId || null,
    delivery_date: vals.deliveryDate || null,
    key_message: vals.keyMessage,
    audience: vals.audience.map((a) => a.toLowerCase()),
    tone: vals.tone,
    channel: vals.channel.map((c) => c.toLowerCase()),
    ai_prompt_used: vals.prompt,
    ai_generated_content: vals.generated,
    final_content: vals.finalContent,
  });

  const addComms = async (vals) => {
    const { error } = await supabase.from('comms').insert({
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      ...commsPayload(vals),
      status: 'draft',
    });
    if (error) throw error;
    await load();
  };

  const updateComms = async (id, vals) => {
    const { error } = await supabase.from('comms').update(commsPayload(vals)).eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const deleteComms = async (id) => {
    const { error } = await supabase.from('comms').delete().eq('id', id);
    if (error) throw new Error(parseDbError(error));
    await load();
  };

  const saveHypercare = async (vals) => {
    const payload = {
      account_id: accountId,
      workspace_id: workspaceId,
      initiative_id: initiativeId,
      pilot: Boolean(vals.pilot),
      pilot_success_criteria: vals.pilotSuccessCriteria || null,
      assumptions: vals.assumptions || null,
      duration: vals.duration || null,
      start_date: vals.startDate || null,
      end_date: vals.endDate || null,
    };
    let error;
    if (hypercare?.id) {
      ({ error } = await supabase.from('hypercare').update(payload).eq('id', hypercare.id));
    } else {
      ({ error } = await supabase.from('hypercare').insert(payload));
    }
    if (error) throw new Error(parseDbError(error));

    // Proposed go-live lives on the Initiative (shared date field).
    const { error: initErr } = await supabase
      .from('initiatives')
      .update({ proposed_go_live_date: vals.proposedGoLiveDate || null })
      .eq('id', initiativeId);
    if (initErr) throw new Error(parseDbError(initErr));
    await load();
  };

  return {
    initiative, impacts, stakeholders, learningNeeds, comms, hypercare, loading, reload: load,
    addImpact, updateImpact, deleteImpact,
    addStakeholder, updateStakeholder, deleteStakeholder,
    addLearningNeed, updateLearningNeed, deleteLearningNeed,
    addComms, updateComms, deleteComms,
    saveHypercare,
  };
}
