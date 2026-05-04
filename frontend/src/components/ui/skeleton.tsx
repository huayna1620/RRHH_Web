import type { ComponentPropsWithoutRef, JSX } from "react";
import { cn } from "@/lib/utils/cn";

type SkeletonProps = ComponentPropsWithoutRef<"div">;

export function Skeleton({ className, ...props }: SkeletonProps): JSX.Element {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} {...props} />;
}

export function TableSkeleton(props: SkeletonProps): JSX.Element {
  return <Skeleton className="h-72 w-full rounded-xl" {...props} />;
}

export function CardSkeleton(props: SkeletonProps): JSX.Element {
  return <Skeleton className="h-24 w-full rounded-xl" {...props} />;
}
