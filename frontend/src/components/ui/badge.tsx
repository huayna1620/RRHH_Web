import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "success" | "danger" | "neutral" | "warning" | "info";

const variantMap: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  info: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant: BadgeVariant };

export function Badge({ className, variant = "neutral", ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
        variantMap[variant],
        className
      )}
      {...props}
    />
  );
}
