import { supabase } from './supabase';

async function countEq(table, column, value) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value);
  if (error) throw error;
  return count ?? 0;
}

async function countIn(table, column, ids) {
  if (!ids.length) return 0;
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in(column, ids);
  if (error) throw error;
  return count ?? 0;
}

/** Child record counts that will be permanently removed with an Initiative. */
export async function countInitiativeDeleteImpact(initiativeId) {
  const [
    impacts,
    stakeholders,
    requirements,
    tasks,
    comms,
    hypercare,
  ] = await Promise.all([
    countEq('impacts', 'initiative_id', initiativeId),
    countEq('stakeholders', 'initiative_id', initiativeId),
    countEq('requirements', 'initiative_id', initiativeId),
    countEq('tasks', 'initiative_id', initiativeId),
    countEq('comms', 'initiative_id', initiativeId),
    countEq('hypercare', 'initiative_id', initiativeId),
  ]);

  const { data: impactRows, error: impactErr } = await supabase
    .from('impacts')
    .select('id')
    .eq('initiative_id', initiativeId);
  if (impactErr) throw impactErr;
  const impactIds = (impactRows || []).map((r) => r.id);
  const learningNeeds = await countIn('learning_needs', 'impact_id', impactIds);

  return [
    { label: 'Impacts', count: impacts },
    { label: 'Stakeholders', count: stakeholders },
    { label: 'Learning needs', count: learningNeeds },
    { label: 'Requirements', count: requirements },
    { label: 'Tasks', count: tasks },
    { label: 'Comms', count: comms },
    { label: 'Hypercare plans', count: hypercare },
  ];
}

/** Child record counts that will be permanently removed with a Program (incl. cascaded Initiatives). */
export async function countProgramDeleteImpact(programId) {
  const { data: inits, error } = await supabase
    .from('initiatives')
    .select('id')
    .eq('program_id', programId);
  if (error) throw error;
  const initiativeIds = (inits || []).map((r) => r.id);

  if (!initiativeIds.length) {
    return [
      { label: 'Initiatives', count: 0 },
      { label: 'Impacts', count: 0 },
      { label: 'Stakeholders', count: 0 },
      { label: 'Learning needs', count: 0 },
      { label: 'Requirements', count: 0 },
      { label: 'Tasks', count: 0 },
      { label: 'Comms', count: 0 },
      { label: 'Hypercare plans', count: 0 },
    ];
  }

  const [
    impacts,
    stakeholders,
    requirements,
    tasks,
    comms,
    hypercare,
  ] = await Promise.all([
    countIn('impacts', 'initiative_id', initiativeIds),
    countIn('stakeholders', 'initiative_id', initiativeIds),
    countIn('requirements', 'initiative_id', initiativeIds),
    countIn('tasks', 'initiative_id', initiativeIds),
    countIn('comms', 'initiative_id', initiativeIds),
    countIn('hypercare', 'initiative_id', initiativeIds),
  ]);

  const { data: impactRows, error: impactErr } = await supabase
    .from('impacts')
    .select('id')
    .in('initiative_id', initiativeIds);
  if (impactErr) throw impactErr;
  const impactIds = (impactRows || []).map((r) => r.id);
  const learningNeeds = await countIn('learning_needs', 'impact_id', impactIds);

  return [
    { label: 'Initiatives', count: initiativeIds.length },
    { label: 'Impacts', count: impacts },
    { label: 'Stakeholders', count: stakeholders },
    { label: 'Learning needs', count: learningNeeds },
    { label: 'Requirements', count: requirements },
    { label: 'Tasks', count: tasks },
    { label: 'Comms', count: comms },
    { label: 'Hypercare plans', count: hypercare },
  ];
}
