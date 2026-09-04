import { useEffect, useMemo, useState } from 'react';
import { CircleDot, Play, Loader, Ban, CheckCircle2 } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR, TASK_STATUSES, tint, parseDbError, inputClass, inputStyle } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useTasks } from '../../hooks/useTasks';
import { useAdminData } from '../../hooks/useAdminData';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import Modal from '../ui/Modal';
import CsvImportModal from '../ui/CsvImportModal';
import { FormTask } from '../forms/AdminForms';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';
import { findByName, findPerson, parseImportDate, requireEnum } from '../../lib/csvImport';

const STATUS_META = [
  { key: 'backlog', label: 'Backlog', icon: CircleDot },
  { key: 'ready', label: 'Ready', icon: Play },
  { key: 'in_progress', label: 'In Progress', icon: Loader },
  { key: 'blocked', label: 'Blocked', icon: Ban },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
];

const TASK_HEADERS = [
  'Name', 'Description', 'Assignee', 'Project Team', 'Status', 'Priority',
  'Effort Estimate', 'Start Date', 'Finish Date', 'Sprint', 'PI',
];

export default function TasksPanel({ initialTaskId = null, onTaskFocusConsumed }) {
  const {
    tasks, initiatives, people, teams, requirements, learningNeeds,
    saveTask, updateTaskStatus, deleteTask, reload,
  } = useTasks();
  const { departments } = useAdminData();
  const { profile } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [view, setView] = useState('tiles');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [bulk, setBulk] = useState(false);
  const [bulkInitiativeId, setBulkInitiativeId] = useState('');

  const getStatus = (t) => t.status || 'backlog';
  const counts = countByStatus(tasks, getStatus, TASK_STATUSES.map((s) => s.key));
  const initiativeName = (id) => initiatives.find((i) => i.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '';

  const filtered = useMemo(
    () => (statusFilter ? tasks.filter((t) => getStatus(t) === statusFilter) : tasks),
    [tasks, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      const key = t.initiative_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key === 'none' ? 'No Initiative' : initiativeName(key),
      items,
    }));
  }, [filtered, initiatives]);

  const openAdd = () => { setEditing(null); setModal('task'); };
  const openEdit = (task) => { setEditing(task); setModal('task'); };

  useEffect(() => {
    if (!initialTaskId || !tasks.length) return;
    const match = tasks.find((t) => t.id === initialTaskId);
    if (match) openEdit(match);
    onTaskFocusConsumed?.();
  }, [initialTaskId, tasks]);

  const onDropColumn = async (status) => {
    const taskId = window.__cvDragTaskId;
    setDragOverCol(null);
    window.__cvDragTaskId = null;
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    try {
      await updateTaskStatus(taskId, status);
    } catch (err) {
      alert(err.message || 'Could not update status');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Task',
      sortable: true,
      render: (t) => <span className="font-semibold">{t.name}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (t) => getStatus(t),
      render: (t) => (
        <StatusPill
          label={getStatus(t).replace('_', ' ')}
          color={statusColor(getStatus(t))}
        />
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (t) => (t.priority
        ? <StatusPill label={t.priority} color={SEVERITY_COLOR[t.priority] || C.sub} />
        : '—'),
    },
    {
      key: 'initiative',
      label: 'Initiative',
      sortable: true,
      sortValue: (t) => initiativeName(t.initiative_id),
      render: (t) => initiativeName(t.initiative_id),
    },
    {
      key: 'assignee',
      label: 'Assignee',
      sortable: true,
      sortValue: (t) => personName(t.assignee_id),
      render: (t) => personName(t.assignee_id) || '—',
    },
  ];

  return (
    <ListPageShell>
      <ListTopBar
        title="Tasks"
        addLabel="Add Task"
        onAdd={openAdd}
        addDisabled={initiatives.length === 0}
        onBulkUpload={() => {
          setBulkInitiativeId(initiatives[0]?.id || '');
          setBulk(true);
        }}
        bulkDisabled={initiatives.length === 0}
        viewMode={view}
        onViewChange={setView}
        viewModes={['tiles', 'list', 'board']}
      />
      {view !== 'board' && (
        <StatusFilterRow
          statuses={STATUS_META}
          counts={counts}
          active={statusFilter}
          onSelect={setStatusFilter}
          onAddStatus={initiatives.length ? openAdd : undefined}
        />
      )}

      {view === 'board' ? (
        <div className="flex-1 overflow-x-auto p-4" style={BODY}>
          <div className="flex gap-3 min-w-max h-full items-stretch">
            {STATUS_META.map((col) => {
              const colTasks = tasks.filter((t) => getStatus(t) === col.key);
              const color = statusColor(col.key);
              return (
                <div
                  key={col.key}
                  className="w-64 flex flex-col rounded-2xl border bg-white shrink-0"
                  style={{
                    borderColor: dragOverCol === col.key ? color : C.border,
                    background: dragOverCol === col.key ? tint(color, '10') : '#fff',
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                  onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
                  onDrop={(e) => { e.preventDefault(); onDropColumn(col.key); }}
                >
                  <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: C.border }}>
                    <col.icon size={14} style={{ color }} />
                    <span className="text-xs font-bold" style={{ color: C.ink }}>{col.label}</span>
                    <span className="ml-auto text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ background: tint(color, '20'), color }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
                    {colTasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        draggable
                        onDragStart={() => { window.__cvDragTaskId = t.id; }}
                        onDragEnd={() => { window.__cvDragTaskId = null; setDragOverCol(null); }}
                        onClick={() => openEdit(t)}
                        className="w-full text-left rounded-xl border p-3 shadow-sm cursor-grab active:cursor-grabbing"
                        style={{ borderColor: C.border, background: C.bg }}
                      >
                        <div className="text-sm font-bold mb-1" style={{ ...HEAD, color: C.ink }}>{t.name}</div>
                        <div className="text-[11px] mb-1.5" style={{ color: C.sub }}>{initiativeName(t.initiative_id)}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.priority && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: tint(SEVERITY_COLOR[t.priority] || C.sub, '22'), color: SEVERITY_COLOR[t.priority] || C.sub }}>
                              {t.priority}
                            </span>
                          )}
                          {personName(t.assignee_id) && (
                            <span className="text-[10px]" style={{ color: C.sub }}>{personName(t.assignee_id)}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ListBody
          empty={filtered.length === 0}
          emptyText={initiatives.length === 0 ? 'Create an Initiative first.' : 'No tasks yet.'}
        >
          {view === 'list' ? (
            <ListTable
              columns={columns}
              rows={filtered}
              onRowClick={openEdit}
              initialSortKey="name"
            />
          ) : (
            groups.map((g) => (
              <GroupSection
                key={g.key}
                title={g.label}
                items={g.items}
                getStatus={getStatus}
                addLabel="Add Task"
                onAdd={initiatives.length ? openAdd : undefined}
              >
                {g.items.map((t) => (
                  <CompactListCard
                    key={t.id}
                    title={t.name}
                    subtitle={[
                      t.requirementIds?.length
                        ? `${t.requirementIds.length} linked requirement${t.requirementIds.length === 1 ? '' : 's'}`
                        : null,
                      t.sprint ? `Sprint ${t.sprint}` : null,
                      t.pi ? `PI ${t.pi}` : null,
                    ].filter(Boolean).join(' · ') || t.description || 'No description'}
                    tags={[
                      { label: getStatus(t).replace('_', ' '), color: statusColor(getStatus(t)) },
                      t.priority ? { label: t.priority, color: SEVERITY_COLOR[t.priority] || C.sub } : null,
                    ].filter(Boolean)}
                    avatars={[personName(t.assignee_id)].filter(Boolean)}
                    onClick={() => openEdit(t)}
                  />
                ))}
              </GroupSection>
            ))
          )}
        </ListBody>
      )}

      {modal === 'task' && (
        <Modal title={editing ? 'Edit Task' : 'Add Task'} onClose={() => { setModal(null); setEditing(null); }} wide>
          <FormTask
            initiatives={initiatives}
            people={people}
            departments={departments}
            teams={teams}
            requirements={requirements}
            learningNeeds={learningNeeds}
            initial={editing}
            onDelete={editing ? async () => { await deleteTask(editing.id); setModal(null); setEditing(null); } : undefined}
            onSave={async (vals) => {
              await saveTask(vals, editing?.id || null);
              setModal(null);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {bulk && (
        <CsvImportModal
          title="Bulk Upload Tasks"
          headers={TASK_HEADERS}
          exampleRow={{
            Name: 'Draft go-live email',
            Description: 'First draft for all impacted teams',
            Assignee: 'Alex Rivera',
            'Project Team': 'Change Core',
            Status: 'backlog',
            Priority: 'medium',
            'Effort Estimate': '2 days',
            'Start Date': '2026-09-01',
            'Finish Date': '2026-09-05',
            Sprint: 'Sprint 12',
            PI: 'PI 3',
          }}
          templateFilename="tasks-template.csv"
          onClose={() => setBulk(false)}
          canImport={Boolean(bulkInitiativeId)}
          disabledReason="Select an Initiative for this import."
          preamble={(
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: C.sub }}>Initiative</label>
              <select
                className={inputClass}
                style={inputStyle}
                value={bulkInitiativeId}
                onChange={(e) => setBulkInitiativeId(e.target.value)}
              >
                <option value="">Select initiative…</option>
                {initiatives.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <p className="text-[11px] mt-1.5" style={{ color: C.sub }}>
                All rows import into this Initiative (not included as a CSV column).
              </p>
            </div>
          )}
          onComplete={async () => { await reload(); }}
          mapRow={(row) => {
            const name = row.Name;
            if (!name) throw new Error('Name is required');
            const status = requireEnum(
              row.Status,
              ['backlog', 'ready', 'in_progress', 'blocked', 'done'],
              { field: 'Status', defaultValue: 'backlog' },
            );
            let priority = null;
            if (String(row.Priority || '').trim()) {
              priority = requireEnum(row.Priority, ['low', 'medium', 'high'], { field: 'Priority' });
            }
            let assigneeId = null;
            if (String(row.Assignee || '').trim()) {
              const person = findPerson(people, row.Assignee);
              if (!person) throw new Error(`Assignee '${row.Assignee}' not found`);
              if (person.ambiguous) throw new Error(person.reason || `Multiple people match '${row.Assignee}'`);
              assigneeId = person.id;
            }
            let projectTeamId = null;
            if (String(row['Project Team'] || '').trim()) {
              const team = findByName(teams, row['Project Team']);
              if (!team) throw new Error(`Project Team '${row['Project Team']}' not found`);
              if (team.ambiguous) throw new Error(`Multiple project teams named '${row['Project Team']}'`);
              projectTeamId = team.id;
            }
            return {
              name: name.trim(),
              description: row.Description || null,
              assigneeId,
              projectTeamId,
              status,
              priority,
              effortEstimate: row['Effort Estimate'] || null,
              startDate: parseImportDate(row['Start Date']),
              finishDate: parseImportDate(row['Finish Date']),
              sprint: row.Sprint || null,
              pi: row.PI || null,
            };
          }}
          importRow={async (vals) => {
            const { error } = await supabase.from('tasks').insert({
              account_id: profile.account_id,
              workspace_id: activeWorkspaceId,
              initiative_id: bulkInitiativeId,
              name: vals.name,
              description: vals.description,
              assignee_id: vals.assigneeId,
              project_team_id: vals.projectTeamId,
              status: vals.status,
              priority: vals.priority,
              effort_estimate: vals.effortEstimate,
              start_date: vals.startDate,
              finish_date: vals.finishDate,
              sprint: vals.sprint,
              pi: vals.pi,
              updated_at: new Date().toISOString(),
            });
            if (error) throw new Error(parseDbError(error));
          }}
        />
      )}
    </ListPageShell>
  );
}
