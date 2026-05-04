type Props = {
    open: boolean;
    roleId: string | null;
    onClose: () => void;
    onSaved: () => void;
};
export declare function ModalPermisosRol({ open, roleId, onClose, onSaved }: Props): JSX.Element;
export { ModalPermisosRol as RolePermissionsModal };
