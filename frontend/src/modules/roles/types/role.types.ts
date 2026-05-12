export type RoleItem = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  userCount?: number;
  permissionCount?: number;
  createdAtUtc?: string;
  createdBy?: string | null;
  updatedAtUtc?: string | null;
  updatedBy?: string | null;
};

export type CreateRolePayload = {
  name: string;
  description: string;
};

export type UpdateRolePayload = {
  name: string;
  description: string;
  isActive: boolean;
};

export type PermissionItem = {
  id: string;
  code: string;
  name: string;
  module: string;
};
