export type AlertVariant = "success" | "error" | "warning" | "info";
type AlertProps = {
    variant?: AlertVariant;
    message: string;
    className?: string;
    onClose?: () => void;
};
export declare function Alert({ variant, message, className, onClose }: AlertProps): JSX.Element;
export {};
