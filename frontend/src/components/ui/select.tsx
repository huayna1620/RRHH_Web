import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
): JSX.Element {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 pr-9 text-[15px] leading-5 outline-none transition-all hover:border-slate-300 focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(48,200,194,0.15)] focus:ring-0 sm:text-[14px] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
