import { supabase } from './supabase';
import { parseDbError } from './constants';

function pct(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

const SEV_KEYS = [
  'severity_org',
  'severity_people',
  'severity_process',
  'severity_system',
  'severity_environment',
];

/**
 * Freeze live metrics for a Change Status Report snapshot.
 * scope: { type: 'initiative'|'program', id: uuid }
 */
export async function computeStatusReportSnapshot(workspaceId, scope) {
  let initiativeIds = [];
  let budgetPlanned = null;

  if (scope.type === 'initiative') {
    const { data: init, error } = await supabase
      .from('initiatives')
      .select('id, budget')
      .eq('id', scope.id)
      .single();
    if (error) throw new Error(parseDbError(error));
    initiativeIds = [init.id];
    budgetPlanned = init.budget != null ? Number(init.budget) : null;
  } else {
    const [{ data: prog, error: progErr }, { data: inits, error: initErr }] = await Promise.all([
      supabase.from('programs').select('id, budget').eq('id', scope.id).single(),
      supabase.from('initiatives').select('id').eq('program_id', scope.id),
    ]);
    if (progErr) throw new Error(parseDbError(progErr));
    if (initErr) throw new Error(parseDbError(initErr));
    budgetPlanned = prog.budget != null ? Number(prog.budget) : null;
    initiativeIds = (inits || []).map((i) => i.id);
  }

  if (!initiativeIds.length) {
    return {
      requirements_completion_pct: 0,
      task_completion_pct: 0,
      blocked_task_count: 0,
      change_readiness_pct: 0,
      high_severity_impact_count: 0,
      budget_actual: 0,
      budget_planned: budgetPlanned,
    };
  }

  const [reqs, tasks, impacts, costs] = await Promise.all([
    supabase.from('requirements').select('id, status').in('initiative_id', initiativeIds),
    supabase.from('tasks').select('id, status').in('initiative_id', initiativeIds),
    supabase.from('impacts').select(`id, ${SEV_KEYS.join(', ')}`).in('initiative_id', initiativeIds),
    supabase.from('cost_entries').select('amount').in('initiative_id', initiativeIds),
  ]);
  if (reqs.error) throw new Error(parseDbError(reqs.error));
  if (tasks.error) throw new Error(parseDbError(tasks.error));
  if (impacts.error) throw new Error(parseDbError(impacts.error));
  if (costs.error) throw new Error(parseDbError(costs.error));

  const reqRows = reqs.data || [];
  const taskRows = tasks.data || [];
  const impactRows = impacts.data || [];

  const reqCompleted = reqRows.filter((r) => r.status === 'completed').length;
  const tasksDone = taskRows.filter((t) => t.status === 'done').length;
  const blocked = taskRows.filter((t) => t.status === 'blocked').length;
  const highSeverity = impactRows.filter((imp) => SEV_KEYS.some((k) => imp[k] === 'high')).length;
  const budgetActual = (costs.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  // Change readiness: Learning Needs completed / total under these impacts
  const impactIds = impactRows.map((i) => i.id);
  let readinessPct = 0;
  if (impactIds.length) {
    const { data: lnRows, error: lnErr } = await supabase
      .from('learning_needs')
      .select('id, status, impact_id')
      .eq('workspace_id', workspaceId)
      .in('impact_id', impactIds);
    if (lnErr) throw new Error(parseDbError(lnErr));
    const learning = lnRows || [];
    readinessPct = pct(
      learning.filter((l) => l.status === 'completed').length,
      learning.length,
    );
  }

  return {
    requirements_completion_pct: pct(reqCompleted, reqRows.length),
    task_completion_pct: pct(tasksDone, taskRows.length),
    blocked_task_count: blocked,
    change_readiness_pct: readinessPct,
    high_severity_impact_count: highSeverity,
    budget_actual: Math.round(budgetActual * 100) / 100,
    budget_planned: budgetPlanned,
  };
}
