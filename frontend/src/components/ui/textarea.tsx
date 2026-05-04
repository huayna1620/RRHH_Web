import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
): JSX.Element {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full min-w-0 rounded-xl border bg-white px-3 py-2.5 text-[15px] leading-5 outline-none transition placeholder:truncate placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 sm:text-[14px]",
        className
      )}
      {...props}
    />
  );
});
