import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
export function Skeleton({ className, ...props }) {
    return _jsx("div", { className: cn("animate-pulse rounded-md bg-slate-200", className), ...props });
}
export function TableSkeleton(props) {
    return _jsx(Skeleton, { className: "h-72 w-full rounded-xl", ...props });
}
export function CardSkeleton(props) {
    return _jsx(Skeleton, { className: "h-24 w-full rounded-xl", ...props });
}
