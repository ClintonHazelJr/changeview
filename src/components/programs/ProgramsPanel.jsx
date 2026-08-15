import { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, CircleDot, Rocket, CheckCircle2, Trash2 } from 'lucide-react';
import { C, tint, isArchivedRecord } from '../../lib/constants';
import { countProgramDeleteImpact } from '../../lib/deleteImpactCounts';
import { usePrograms } from '../../hooks/usePrograms';
import Modal from '../ui/Modal';
import CascadingDeleteModal from '../ui/CascadingDeleteModal';
import CardActionsMenu from '../ui/CardActionsMenu';
import { FormProgram } from '../forms/AdminForms';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import ShowInactiveToggle from '../ui/ShowInactiveToggle';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const STATUSES = [
  { key: 'planning', label: 'Planning', icon: CircleDot },
  { key: 'delivery', label: 'Delivery', icon: Rocket },
  { key: 'closed', label: 'Closed', icon: CheckCircle2 },
];

function formatDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgramsPanel({ initialProgramId = null, onProgramFocusConsumed }) {
  const { programs, orgs, addProgram, updateProgram, setProgramArchived, deleteProgram } = usePrograms();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteCounts, setDeleteCounts] = useState([]);
  const [deleteCountsLoading, setDeleteCountsLoading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const orgName = (id) => orgs.find((o) => o.id === id)?.name || 'Unassigned org';
  const getStatus = (p) => p.status || 'planning';

  const archivedCount = programs.filter(isArchivedRecord).length;
  const visiblePrograms = useMemo(
    () => (showArchived ? programs : programs.filter((p) => !isArchivedRecord(p))),
    [programs, showArchived],
  );

  const counts = countByStatus(visiblePrograms, getStatus, STATUSES.map((s) => s.key));

  const filtered = useMemo(
    () => (statusFilter ? visiblePrograms.filter((p) => getStatus(p) === statusFilter) : visiblePrograms),
    [visiblePrograms, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const key = p.organization_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key === 'none' ? 'No Org' : orgName(key),
      items,
    }));
  }, [filtered, orgs]);

  const openAdd = () => { setEditing(null); setModal('program'); };
  const openEdit = (p) => { setEditing(p); setModal('program'); };

  const toggleArchive = async (p) => {
    const archived = isArchivedRecord(p);
    if (!archived && !window.confirm(`Archive ${p.name}? Its initiatives will be archived too.`)) return;
    setBusyId(p.id);
    try {
      await setProgramArchived(p.id, !archived);
    } catch (err) {
      alert(err.message || 'Could not update program');
    } finally {
      setBusyId(null);
    }
  };

  const openDelete = async (p) => {
    setDeleteError('');
    setDeleteTarget(p);
    setDeleteCounts([]);
    setDeleteCountsLoading(true);
    try {
      setDeleteCounts(await countProgramDeleteImpact(p.id));
    } catch (err) {
      setDeleteError(err.message || 'Could not load related records');
    } finally {
      setDeleteCountsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await deleteProgram(deleteTarget.id);
      setDeleteTarget(null);
      if (editing?.id === deleteTarget.id) {
        setModal(null);
        setEditing(null);
      }
    } catch (err) {
      setDeleteError(err.message || 'Could not delete program');
    } finally {
      setDeleteBusy(false);
    }
  };

  useEffect(() => {
    if (!initialProgramId || !programs.length) return;
    const match = programs.find((p) => p.id === initialProgramId);
    if (match) {
      if (isArchivedRecord(match)) setShowArchived(true);
      openEdit(match);
    }
    onProgramFocusConsumed?.();
  }, [initialProgramId, programs]);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (p) => <span className="font-semibold">{p.name}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (p) => getStatus(p),
      render: (p) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill label={getStatus(p)} color={statusColor(getStatus(p))} />
          {isArchivedRecord(p) && <StatusPill label="Archived" color={C.sub} />}
        </div>
      ),
    },
    {
      key: 'org',
      label: 'Org',
      sortable: true,
      sortValue: (p) => orgName(p.organization_id),
      render: (p) => orgName(p.organization_id),
    },
    {
      key: 'proposed_go_live_date',
      label: 'Go live',
      sortable: true,
      render: (p) => formatDate(p.proposed_go_live_date) || '—',
    },
    {
      key: 'budget',
      label: 'Budget',
      sortable: true,
      sortValue: (p) => Number(p.budget) || 0,
      render: (p) => (p.budget != null && p.budget !== '' ? `$${Number(p.budget).toLocaleString()}` : '—'),
    },
    {
      key: 'actions',
      label: '',
      render: (p) => {
        const archived = isArchivedRecord(p);
        const busy = busyId === p.id;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                toggleArchive(p);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full disabled:opacity-50"
              style={{
                background: archived ? tint(C.green, '18') : tint(C.coral, '18'),
                color: archived ? C.green : C.coral,
              }}
            >
              {archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
              {busy ? '…' : archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDelete(p);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: tint(C.coral, '18'), color: C.coral }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <ListPageShell>
      <ListTopBar
        title="Program"
        addLabel="Add Program"
        onAdd={openAdd}
        addDisabled={orgs.length === 0}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />
      <div className="flex justify-end px-1 mb-2">
        <ShowInactiveToggle
          show={showArchived}
          onChange={setShowArchived}
          inactiveCount={archivedCount}
          entityLabel="archived"
        />
      </div>
      <StatusFilterRow
        statuses={STATUSES}
        counts={counts}
        active={statusFilter}
        onSelect={setStatusFilter}
        onAddStatus={orgs.length ? openAdd : undefined}
      />
      <ListBody
        empty={filtered.length === 0}
        emptyText={
          orgs.length === 0
            ? 'Add an Org in Settings first.'
            : archivedCount > 0 && !showArchived
              ? 'No active programs. Turn on Show archived to find one.'
              : 'No programs yet.'
        }
      >
        {viewMode === 'list' ? (
          <ListTable
            columns={columns}
            rows={filtered}
            onRowClick={openEdit}
            initialSortKey="name"
            emptyText="No programs yet."
          />
        ) : (
          groups.map((g) => (
            <GroupSection
              key={g.key}
              title={g.label}
              items={g.items}
              getStatus={getStatus}
              addLabel="Add Program"
              onAdd={orgs.length ? openAdd : undefined}
            >
              {g.items.map((p) => {
                const archived = isArchivedRecord(p);
                const busy = busyId === p.id;
                return (
                  <div
                    key={p.id}
                    className="relative"
                    style={{ opacity: archived ? 0.72 : 1 }}
                  >
                    <CompactListCard
                      title={p.name}
                      subtitle={[formatDate(p.proposed_go_live_date) && `Go live ${formatDate(p.proposed_go_live_date)}`, p.budget != null && p.budget !== '' ? `$${Number(p.budget).toLocaleString()}` : null].filter(Boolean).join(' · ') || 'No go-live date'}
                      tags={[
                        { label: getStatus(p), color: statusColor(getStatus(p)) },
                        ...(archived ? [{ label: 'Archived', color: C.sub }] : []),
                      ]}
                      onClick={() => openEdit(p)}
                    />
                    <CardActionsMenu
                      archived={archived}
                      busy={busy}
                      onEdit={() => openEdit(p)}
                      onArchive={() => toggleArchive(p)}
                      onDelete={() => openDelete(p)}
                    />
                  </div>
                );
              })}
            </GroupSection>
          ))
        )}
      </ListBody>

      {modal === 'program' && (
        <Modal title={editing ? 'Edit Program' : 'Add Program'} onClose={() => setModal(null)} wide>
          <FormProgram
            orgs={orgs}
            initial={editing}
            onSave={async (vals) => {
              if (editing) await updateProgram(editing.id, vals);
              else await addProgram(vals);
              setModal(null);
              setEditing(null);
            }}
          />
          {editing && (
            <div className="mt-4 pt-4 border-t flex justify-end" style={{ borderColor: C.border }}>
              <button
                type="button"
                onClick={() => openDelete(editing)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full"
                style={{ background: tint(C.coral, '18'), color: C.coral }}
              >
                <Trash2 size={13} /> Delete program
              </button>
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <CascadingDeleteModal
          entityLabel="Program"
          recordName={deleteTarget.name}
          counts={deleteCounts}
          countsLoading={deleteCountsLoading}
          busy={deleteBusy}
          error={deleteError}
          onClose={() => { if (!deleteBusy) setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}
    </ListPageShell>
  );
}
