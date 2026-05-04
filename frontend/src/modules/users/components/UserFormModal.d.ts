import type { UserItem } from "@/modules/users/types/user.types";
type FormValues = {
    userName: string;
    email: string;
    fullName: string;
    password: string;
    roleId: string;
};
type Props = {
    open: boolean;
    user: UserItem | null;
    saving: boolean;
    onClose: () => void;
    onSubmit: (values: FormValues) => Promise<void>;
};
export declare function ModalFormUsuario({ open, user, saving, onClose, onSubmit }: Props): JSX.Element;
export { ModalFormUsuario as UserFormModal };
