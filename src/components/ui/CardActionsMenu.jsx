import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { C } from '../../lib/constants';

/**
 * Compact ⋮ menu for list cards: Edit, Archive/Unarchive, Delete (destructive).
 */
export default function CardActionsMenu({
  archived = false,
  busy = false,
  onEdit,
  onArchive,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null);
      return undefined;
    }
    const place = () => {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const inRoot = rootRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inRoot && !inMenu) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    fn?.();
  };

  return (
    <div ref={rootRef} className="absolute top-2 right-2 z-20">
      <button
        ref={buttonRef}
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 inline-flex items-center justify-center rounded-lg disabled:opacity-50 hover:bg-black/[0.04]"
        style={{ color: C.sub }}
      >
        <MoreVertical size={16} />
      </button>
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed min-w-[148px] py-1 rounded-xl border bg-white shadow-lg z-[80]"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            borderColor: C.border,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={run(onEdit)}
            className="w-full text-left text-sm px-3 py-2 hover:bg-black/[0.03]"
            style={{ color: C.ink }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={run(onArchive)}
            className="w-full text-left text-sm px-3 py-2 hover:bg-black/[0.03] disabled:opacity-50"
            style={{ color: C.ink }}
          >
            {busy ? '…' : archived ? 'Unarchive' : 'Archive'}
          </button>
          <div className="my-1 border-t" style={{ borderColor: C.border }} />
          <button
            type="button"
            role="menuitem"
            onClick={run(onDelete)}
            className="w-full text-left text-sm font-semibold px-3 py-2 hover:bg-black/[0.03]"
            style={{ color: C.coral }}
          >
            Delete
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
