import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { C, BODY, tint } from '../../lib/constants';

/**
 * Compact sortable table for list view.
 * columns: [{ key, label, sortable?, render?(row), sortValue?(row), className? }]
 */
export default function ListTable({
  columns,
  rows,
  rowKey = 'id',
  onRowClick,
  emptyText = 'No records.',
  initialSortKey = null,
  initialSortDir = 'asc',
}) {
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const getVal = (row) => {
      if (col?.sortValue) return col.sortValue(row);
      const v = row[sortKey];
      return v == null ? '' : v;
    };
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (!rows?.length) {
    return (
      <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-sm" style={{ borderColor: C.border, color: C.sub, ...BODY }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border overflow-x-auto" style={{ borderColor: C.border, ...BODY }}>
      <table className="w-full text-sm text-left min-w-[640px]">
        <thead>
          <tr className="border-b text-[11px] uppercase tracking-wide" style={{ borderColor: C.border, background: C.bg, color: C.sub }}>
            {columns.map((col) => (
              <th key={col.key} className={`px-3 py-2.5 font-bold ${col.className || ''}`}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key, true)}
                    className="inline-flex items-center gap-1"
                    style={{ color: sortKey === col.key ? C.ink : C.sub }}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    )}
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = typeof rowKey === 'function' ? rowKey(row) : row[rowKey];
            return (
              <tr
                key={key}
                className={`border-b last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                style={{ borderColor: C.border }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 align-middle ${col.className || ''}`} style={{ color: C.ink }}>
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[11px] border-t" style={{ borderColor: C.border, color: C.sub, background: tint(C.sub, '06') }}>
        {sorted.length} row{sorted.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
