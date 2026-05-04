type Props = {
    open: boolean;
    saving: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        currentPassword: string;
        newPassword: string;
    }) => Promise<void>;
};
export declare function ModalCambiarContrasena({ open, saving, onClose, onSubmit }: Props): JSX.Element;
export { ModalCambiarContrasena as ChangePasswordModal };
