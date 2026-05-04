export declare function setAuthStorage(accessToken: string, refreshToken: string, user: unknown): void;
export declare function clearAuthStorage(): void;
export declare function getAccessToken(): string | null;
export declare function getRefreshToken(): string | null;
export declare function setStoredUser(user: unknown): void;
export declare function getStoredUser<T>(): T | null;
export declare function setTokens(accessToken: string, refreshToken: string): void;
