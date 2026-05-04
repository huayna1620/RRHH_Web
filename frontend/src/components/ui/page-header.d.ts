import type { ReactNode } from "react";
type PageHeaderProps = {
    title: string;
    description?: string;
    action?: ReactNode;
};
export declare function PageHeader({ title, description, action }: PageHeaderProps): JSX.Element;
export {};
