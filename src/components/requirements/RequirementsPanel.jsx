import { useMemo, useState } from 'react';
import { FilePenLine, BadgeCheck, Ban } from 'lucide-react';
import { SEVERITY_COLOR } from '../../lib/constants';
import { useRequirements } from '../../hooks/useRequirements';
import { useAdminData } from '../../hooks/useAdminData';
import Modal from '../ui/Modal';
import { FormRequirement } from '../forms/AdminForms';
import ListTable from '../ui/ListTable';
import StatusPill from '../ui/StatusPill';
import {
  ListPageShell, ListTopBar, StatusFilterRow, GroupSection, CompactListCard,
  ListBody, countByStatus, statusColor,
} from '../ui/ListChrome';

const STATUSES = [
  { key: 'draft', label: 'Draft', icon: FilePenLine },
  { key: 'approved', label: 'Approved', icon: BadgeCheck },
  { key: 'rejected', label: 'Rejected', icon: Ban },
];

export default function RequirementsPanel() {
  const { requirements, initiatives, people, impacts, tasks, saveRequirement } = useRequirements();
  const { departments } = useAdminData();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('tiles');

  const initiativeName = (id) => initiatives.find((i) => i.id === id)?.name || '—';
  const personName = (id) => people.find((p) => p.id === id)?.name || '';
  const getStatus = (r) => r.status || 'draft';
  const counts = countByStatus(requirements, getStatus, STATUSES.map((s) => s.key));

  const filtered = useMemo(
    () => (statusFilter ? requirements.filter((r) => getStatus(r) === statusFilter) : requirements),
    [requirements, statusFilter],
  );

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = r.initiative_id || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: key === 'none' ? 'No Initiative' : initiativeName(key),
      items,
    }));
  }, [filtered, initiatives]);

  const openAdd = () => { setEditing(null); setModal('req'); };
  const openEdit = (r) => { setEditing(r); setModal('req'); };

  const columns = [
    {
      key: 'description',
      label: 'Requirement',
      sortable: true,
      className: 'max-w-xs',
      render: (r) => <span className="font-semibold line-clamp-2">{r.description}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      sortValue: (r) => getStatus(r),
      render: (r) => <StatusPill label={getStatus(r)} color={statusColor(getStatus(r))} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (r) => (r.priority
        ? <StatusPill label={String(r.priority)} color={SEVERITY_COLOR[r.priority] || statusColor(r.priority)} />
        : '—'),
    },
    {
      key: 'initiative',
      label: 'Initiative',
      sortable: true,
      sortValue: (r) => initiativeName(r.initiative_id),
      render: (r) => initiativeName(r.initiative_id),
    },
    {
      key: 'approver',
      label: 'Approver',
      sortable: true,
      sortValue: (r) => personName(r.business_approver_id),
      render: (r) => personName(r.business_approver_id) || '—',
    },
  ];

  return (
    <ListPageShell>
      <ListTopBar
        title="Requirements"
        addLabel="Add Requirement"
        onAdd={openAdd}
        addDisabled={initiatives.length === 0}
        viewMode={viewMode}
        onViewChange={setViewMode}
      />
      <StatusFilterRow
        statuses={STATUSES}
        counts={counts}
        active={statusFilter}
        onSelect={setStatusFilter}
        onAddStatus={initiatives.length ? openAdd : undefined}
      />
      <ListBody
        empty={filtered.length === 0}
        emptyText={initiatives.length === 0 ? 'Create an Initiative first.' : 'No requirements yet.'}
      >
        {viewMode === 'list' ? (
          <ListTable
            columns={columns}
            rows={filtered}
            onRowClick={openEdit}
            initialSortKey="description"
          />
        ) : (
          groups.map((g) => (
            <GroupSection
              key={g.key}
              title={g.label}
              items={g.items}
              getStatus={getStatus}
              addLabel="Add Requirement"
              onAdd={initiatives.length ? openAdd : undefined}
            >
              {g.items.map((r) => (
                <CompactListCard
                  key={r.id}
                  title={r.description}
                  subtitle={[
                    r.impactIds?.length ? `${r.impactIds.length} linked impact${r.impactIds.length === 1 ? '' : 's'}` : null,
                    personName(r.business_approver_id) ? `Approver ${personName(r.business_approver_id)}` : null,
                  ].filter(Boolean).join(' · ') || 'No linked impacts'}
                  tags={[
                    { label: getStatus(r), color: statusColor(getStatus(r)) },
                    r.priority ? { label: String(r.priority), color: SEVERITY_COLOR[r.priority] || statusColor(r.priority) } : null,
                  ].filter(Boolean)}
                  avatars={[personName(r.author_id)].filter(Boolean)}
                  onClick={() => openEdit(r)}
                />
              ))}
            </GroupSection>
          ))
        )}
      </ListBody>

      {modal === 'req' && (
        <Modal title={editing ? 'Edit Requirement' : 'Add Requirement'} onClose={() => setModal(null)} wide>
          <FormRequirement
            initiatives={initiatives}
            people={people}
            departments={departments}
            impacts={impacts}
            tasks={tasks}
            initial={editing}
            onSave={async (vals) => {
              await saveRequirement(vals, editing?.id || null);
              setModal(null);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </ListPageShell>
  );
}
