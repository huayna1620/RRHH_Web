import type { CreateUserPayload, UpdateUserPayload, UserItem, ChangePasswordPayload } from "@/modules/users/types/user.types";
export declare function getUsers(): Promise<UserItem[]>;
export declare function getUserById(id: string): Promise<UserItem>;
export declare function createUser(payload: CreateUserPayload): Promise<UserItem>;
export declare function updateUser(id: string, payload: UpdateUserPayload): Promise<UserItem>;
export declare function updateUserStatus(id: string, isActive: boolean): Promise<void>;
export declare function changePassword(payload: ChangePasswordPayload): Promise<void>;
