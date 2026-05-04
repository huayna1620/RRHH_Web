export declare function useAuth(): {
    user: import("../types/auth.types").AuthUser | null;
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    login: (payload: import("../types/auth.types").LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (partial: Partial<import("../types/auth.types").AuthUser>) => void;
};
