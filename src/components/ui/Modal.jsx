import { X } from 'lucide-react';
import { C, HEAD, BODY } from '../lib/constants';

export default function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-3xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} shadow-2xl max-h-[90vh] overflow-y-auto`}
        style={BODY}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"
          style={{ borderColor: C.border }}
        >
          <h3 className="font-bold" style={{ ...HEAD, color: C.ink }}>{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
