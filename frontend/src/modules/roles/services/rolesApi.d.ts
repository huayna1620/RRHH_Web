import type { CreateRolePayload, PermissionItem, RoleItem } from "@/modules/roles/types/role.types";
export declare function getRoles(): Promise<RoleItem[]>;
export declare function createRole(payload: CreateRolePayload): Promise<RoleItem>;
export declare function getRolePermissionIds(roleId: string): Promise<string[]>;
export declare function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
export declare function getPermissions(): Promise<PermissionItem[]>;
