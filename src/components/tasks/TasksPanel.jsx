import { useMemo, useState } from 'react';
import { CircleDot, Play, Loader, Ban, CheckCircle2 } from 'lucide-react';
import { C, HEAD, BODY, SEVERITY_COLOR, TASK_STATUSES, tint } from '../../lib/constants';
import { useTasks } from '../../hooks/useTasks';
import Modal from '../ui/Modal';
import { FormTask } from '../forms/AdminForms';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const STATUS_META = [
  { key: 'backlog', label: 'Backlog', icon: CircleDot },
  { key: 'ready', label: 'Ready', icon: Play },
  { key: 'in_progress', label: 'In Progress', icon: Loader },
  { key: 'blocked', label: 'Blocked', icon: Ban },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
];

export default function TasksPanel() {
  const {
    tasks, initiatives, people, teams, requirements,
    saveTask, updateTaskStatus, deleteTask,
  } = useTasks();
  const [view, setView] = useState('list');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

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

  return (
    <ListPageShell>
      <ListTopBar
        title="Tasks"
        addLabel="Add Task"
        onAdd={openAdd}
        addDisabled={initiatives.length === 0}
        viewMode={view}
        onViewChange={setView}
      />
      {view === 'list' && (
        <StatusFilterRow
          statuses={STATUS_META}
          counts={counts}
          active={statusFilter}
          onSelect={setStatusFilter}
          onAddStatus={initiatives.length ? openAdd : undefined}
        />
      )}

      {view === 'list' ? (
        <ListBody
          empty={filtered.length === 0}
          emptyText={initiatives.length === 0 ? 'Create an Initiative first.' : 'No tasks yet.'}
        >
          {groups.map((g) => (
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
          ))}
        </ListBody>
      ) : (
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
      )}

      {modal === 'task' && (
        <Modal title={editing ? 'Edit Task' : 'Add Task'} onClose={() => { setModal(null); setEditing(null); }} wide>
          <FormTask
            initiatives={initiatives}
            people={people}
            teams={teams}
            requirements={requirements}
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
    </ListPageShell>
  );
}
