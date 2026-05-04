export type UserItem = {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  employeeId: string | null;
  employeeName: string | null;
  lastLoginAtUtc: string | null;
};

export type CreateUserPayload = {
  userName: string;
  email: string;
  fullName: string;
  password: string;
  roleIds: string[];
};

export type UpdateUserPayload = {
  fullName: string;
  email: string;
  roleIds: string[];
  employeeId: string | null;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
