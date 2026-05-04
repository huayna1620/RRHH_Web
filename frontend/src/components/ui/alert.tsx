import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export type AlertVariant = "success" | "error" | "warning" | "info";

type AlertConfig = { icon: LucideIcon; classes: string };

const variantConfig: Record<AlertVariant, AlertConfig> = {
  success: { icon: CheckCircle2, classes: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  error: { icon: XCircle, classes: "border-rose-200 bg-rose-50 text-rose-700" },
  warning: { icon: AlertCircle, classes: "border-amber-200 bg-amber-50 text-amber-700" },
  info: { icon: Info, classes: "border-blue-200 bg-blue-50 text-blue-700" },
};

type AlertProps = {
  variant?: AlertVariant;
  message: string;
  className?: string;
  onClose?: () => void;
};

export function Alert({ variant = "info", message, className, onClose }: AlertProps): JSX.Element {
  const { icon: Icon, classes } = variantConfig[variant];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm", classes, className)}>
      <Icon className="size-4 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      {onClose ? (
        <button type="button" className="shrink-0 opacity-50 transition hover:opacity-100" onClick={onClose} aria-label="Cerrar">
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
