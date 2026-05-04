import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function CampoFormulario({ label, hint, error, required, children }: FormFieldProps): JSX.Element {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 sm:text-[12px]">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[12px] text-rose-600">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </label>
  );
}

