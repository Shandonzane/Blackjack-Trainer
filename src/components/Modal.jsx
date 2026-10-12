// Reusable modal shell: dimmed backdrop, centered panel, header with title +
// close button, scrollable body. Click the backdrop or ✕ to close.
export default function Modal({ open, title, onClose, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-emerald-950 text-white rounded-2xl w-full ${maxWidth} shadow-2xl border border-emerald-400/20 my-4 animate-deal`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-emerald-950 rounded-t-2xl">
          <h2 className="font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
