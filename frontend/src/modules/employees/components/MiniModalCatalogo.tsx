import { useState, type JSX } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  title: string;           // "Nueva área" | "Nuevo cargo" | "Nueva sede"
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string, code: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MiniModalCatalogo({ open, title, saving, error, onClose, onSubmit }: Props): JSX.Element | null {
  if (!open) return null;

  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [touched, setTouched]   = useState(false);

  const nameErr = touched && name.trim().length < 2 ? "Mínimo 2 caracteres" : null;
  const codeErr = touched && code.trim().length < 1 ? "Requerido" : null;

  function handleClose(): void {
    setName(""); setCode(""); setTouched(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || name.trim().length < 2 || !code.trim()) return;
    onSubmit(name.trim(), code.trim().toUpperCase());
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[12px] text-slate-400">Completa los datos del nuevo registro</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 px-5 py-4">
            {/* Nombre */}
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Nombre <span className="text-rose-500">*</span>
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Recursos Humanos"
                className={nameErr ? "border-rose-300 focus:border-rose-400" : ""}
                autoFocus
              />
              {nameErr && (
                <p className="flex items-center gap-1 text-[12px] text-rose-600">
                  <AlertCircle className="size-3" />{nameErr}
                </p>
              )}
            </label>

            {/* Código */}
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Código <span className="text-rose-500">*</span>
              </span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej. RRHH"
                className={codeErr ? "border-rose-300 focus:border-rose-400" : ""}
              />
              {codeErr && (
                <p className="flex items-center gap-1 text-[12px] text-rose-600">
                  <AlertCircle className="size-3" />{codeErr}
                </p>
              )}
            </label>

            {/* Server error */}
            {error && (
              <p className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                <AlertCircle className="size-3.5 shrink-0" />{error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:from-brand-500 hover:to-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
