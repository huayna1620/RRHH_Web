export type AuthUser = {
    id: string;
    userName: string;
    fullName: string;
    roles: string[];
    permissions: string[];
};
export type LoginPayload = {
    userNameOrEmail: string;
    password: string;
};
export type LoginResponse = {
    accessToken: string;
    accessTokenExpiresAtUtc: string;
    refreshToken: string;
    refreshTokenExpiresAtUtc: string;
    userId: string;
    userName: string;
    fullName: string;
    roles: string[];
    permissions: string[];
};
