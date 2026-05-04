import type { ReactNode } from "react";
type FormFieldProps = {
    label: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
};
export declare function FormField({ label, hint, error, required, children }: FormFieldProps): JSX.Element;
export {};
