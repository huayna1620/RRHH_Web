import type { ReactNode } from "react";
type ModalProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
};
export declare function Modal({ open, title, children, onClose }: ModalProps): JSX.Element | null;
export {};
