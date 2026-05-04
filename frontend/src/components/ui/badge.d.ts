import type { HTMLAttributes } from "react";
type BadgeVariant = "success" | "danger" | "neutral" | "warning" | "info";
type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    variant: BadgeVariant;
};
export declare function Badge({ className, variant, ...props }: BadgeProps): JSX.Element;
export {};
