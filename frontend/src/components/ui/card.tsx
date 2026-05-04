import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  // `min-w-0` previene el overflow horizontal cuando la card es hija de un grid/flex
  // y contiene gráficos (Recharts ResponsiveContainer) o contenido de ancho intrínseco grande.
  return (
    <div
      className={cn(
        "surface min-w-0 rounded-xl border border-slate-200/70 bg-white shadow-panel transition-shadow duration-200 hover:shadow-panel-lg",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5 sm:items-center",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={cn("text-sm font-bold tracking-tight text-slate-800", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("min-w-0 overflow-x-auto p-5", className)} {...props} />;
}
