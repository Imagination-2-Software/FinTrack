import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  widthClassName = 'max-w-xl',
}) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      aria-modal="true"
      aria-labelledby="investments-modal-title"
      className={`max-h-[90vh] w-full ${widthClassName} overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:p-6`}
      role="dialog"
    >
      <header className="mb-5 flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <h2 id="investments-modal-title" className="text-lg font-semibold text-white">{title}</h2>
        <button
          type="button"
          aria-label="Close dialog"
          title="Close dialog"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      {children}
    </section>
  </div>
);