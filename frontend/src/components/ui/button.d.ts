import { type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
declare const buttonVariants: (props?: {
    variant?: "danger" | "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
} & import("class-variance-authority/types").ClassProp) => string;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;
export declare function Button({ className, variant, size, ...props }: ButtonProps): JSX.Element;
export {};
