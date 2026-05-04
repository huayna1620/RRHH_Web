import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="animate-modal-in flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border-t bg-white shadow-panel-lg sm:max-h-[95vh] sm:rounded-2xl sm:border">
        <div className="sticky top-0 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-3.5 backdrop-blur-sm sm:px-5 sm:py-4">
          <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-800 sm:text-base">{title}</h3>
          <button
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">{children}</div>
      </div>
    </div>
  );
}
