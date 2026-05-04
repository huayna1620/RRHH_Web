import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-500/30 hover:from-brand-500 hover:to-brand-700 hover:shadow-md hover:shadow-brand-500/40",
        secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
        outline: "border border-brand-500 text-brand-600 hover:bg-brand-50",
        danger: "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm shadow-rose-500/30 hover:from-rose-500 hover:to-rose-700"
      },
      size: {
        sm: "h-10 px-4 text-[13px]",
        md: "h-10 px-5",
        lg: "h-11 px-6 text-[14px]"
      }
    },
    compoundVariants: [
      {
        variant: "ghost",
        size: "sm",
        className: "h-10 px-3 text-[13px]"
      }
    ],
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps): JSX.Element {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
