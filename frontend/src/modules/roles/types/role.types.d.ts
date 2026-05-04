export type RoleItem = {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
};
export type CreateRolePayload = {
    name: string;
    description: string;
};
export type PermissionItem = {
    id: string;
    code: string;
    name: string;
    module: string;
};
